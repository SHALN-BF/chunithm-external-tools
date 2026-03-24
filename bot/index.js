const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const userManager = require('./userManager');
const browserHandler = require('./browserHandler');

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
    console.log(`Logged in as ${client.user.tag}!`);
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
            return;
        }

        try {
            userManager.registerUser(interaction.user.id, segaId, password);
            await interaction.reply({ content: 'Credentials registered successfully!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to register credentials.', ephemeral: true });
        }
    } else if (commandName === 'best') {
        // Check permissions
        const creds = userManager.getCredentials(interaction.user.id);
        if (!creds) {
            await interaction.reply({ content: 'You are not registered. Please use `/register` first.', ephemeral: true });
            return;
        }

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

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `Error generating image: ${error.message}` });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
