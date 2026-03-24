const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, WebhookClient } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const userManager = require('./userManager');
const browserHandler = require('./browserHandler');

// Setup Webhook Logger
let webhookLogger = null;
if (process.env.LOG_WEBHOOK_URL) {
    webhookLogger = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
}

async function logToWebhook(message) {
    console.log(message); // Always log to console
    if (webhookLogger) {
        try {
            await webhookLogger.send({
                content: message,
                username: 'Chunithm Bot Logger',
            });
        } catch (e) {
            console.error('Failed to send webhook log:', e);
        }
    }
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const commands = [
    new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register your SEGA ID credentials securely.')
        .addStringOption(option =>
            option.setName('sega_id')
                .setDescription('Your SEGA ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your Password')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('best')
        .setDescription('Generate your Chunithm Best Score image.')
];

client.once('ready', async () => {
    logToWebhook(`✅ Logged in as ${client.user.tag}!`);
    console.log(`Allowed users: ${process.env.ALLOWED_USERS}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);


    try {
        console.log('Started refreshing application (/) commands.');

        // Register global commands (simplest for single-server bot usage)
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'register') {
        const segaId = interaction.options.getString('sega_id');
        const password = interaction.options.getString('password');

        // Check permissions
        if (!userManager.isUserAllowed(interaction.user.id)) {
            await interaction.reply({ content: 'You are not authorized to use this bot.', ephemeral: true });
            logToWebhook(`🚫 Unauthorized access attempt to /register by <@${interaction.user.id}>`);
            return;
        }

        try {
            userManager.registerUser(interaction.user.id, segaId, password);
            await interaction.reply({ content: 'Credentials registered successfully!', ephemeral: true });
            logToWebhook(`📝 User <@${interaction.user.id}> registered new credentials.`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to register credentials.', ephemeral: true });
            logToWebhook(`❌ Error registering credentials for <@${interaction.user.id}>: ${error.message}`);
        }
    } else if (commandName === 'best') {
        // Check maintenance hours (01:30 - 07:00 JST)
        const now = new Date();
        const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        const currentHour = jstNow.getHours();
        const currentMinute = jstNow.getMinutes();

        // 01:30 to 07:00 is maintenance time
        if ((currentHour === 1 && currentMinute >= 30) || (currentHour > 1 && currentHour < 7)) {
            await interaction.reply({
                content: 'CHUNITHM-NET is currently under maintenance (01:30 - 07:00 JST). Please try again later.',
                ephemeral: true
            });
            return;
        }

        // Check permissions
        const creds = userManager.getCredentials(interaction.user.id);
        if (!creds) {
            await interaction.reply({ content: 'You are not registered. Please use `/register` first.', ephemeral: true });
            return;
        }

        logToWebhook(`🖼️ Generation started for <@${interaction.user.id}> (SEGA ID: ${creds.segaId})`);
        await interaction.deferReply();

        try {
            const result = await browserHandler.generateScoreImage(creds.segaId, creds.password);

            // Convert Data URLs to Buffers
            const listBuffer = Buffer.from(result.list.split(',')[1], 'base64');
            const graphBuffer = Buffer.from(result.graph.split(',')[1], 'base64');

            await interaction.editReply({
                content: 'Here are your Chunithm Best Score images!',
                files: [
                    { attachment: listBuffer, name: 'chunithm-best-list.png' },
                    { attachment: graphBuffer, name: 'chunithm-best-graph.png' }
                ]
            });
            logToWebhook(`✅ Generation successful for <@${interaction.user.id}>`);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `Error generating image: ${error.message}` });
            logToWebhook(`❌ Generation failed for <@${interaction.user.id}>: ${error.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
