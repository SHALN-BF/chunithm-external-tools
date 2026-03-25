const {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    WebhookClient,
    Events,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const userManager = require('./userManager');
const browserHandler = require('./browserHandler');

const parseIdList = (value) => (value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

const config = {
    botAdminIds: parseIdList(process.env.BOT_ADMIN),
    requestChannelId: (process.env.REQUEST_CHANNEL_ID || '').trim(),
    requestWebhookUrl: process.env.REQUEST_WEBHOOK_URL || '',
    logWebhookUrl: process.env.LOG_WEBHOOK_URL || ''
};

const webhookLogger = config.logWebhookUrl
    ? new WebhookClient({ url: config.logWebhookUrl })
    : null;

const requestWebhook = config.requestWebhookUrl
    ? new WebhookClient({ url: config.requestWebhookUrl })
    : null;

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

async function sendImagesToWebhook(message, listBuffer, graphBuffer) {
    if (!webhookLogger) return;
    try {
        const files = [{ attachment: listBuffer, name: 'chunithm-best-list.png' }];
        if (graphBuffer) {
            files.push({ attachment: graphBuffer, name: 'chunithm-best-graph.png' });
        }
        await webhookLogger.send({
            content: message,
            username: 'Chunithm Bot Logger',
            files
        });
    } catch (e) {
        console.error('Failed to send webhook images:', e);
    }
}

async function sendImagesToChannel(channel, message, listBuffer, graphBuffer) {
    const files = [{ attachment: listBuffer, name: 'chunithm-best-list.png' }];
    if (graphBuffer) {
        files.push({ attachment: graphBuffer, name: 'chunithm-best-graph.png' });
    }
    await channel.send({ content: message, files });
}

const isAdminUser = (userId) => config.botAdminIds.includes(userId);

const buildRequestComponents = (requestId, disabled = false, decision = null) => {
    const approveLabel = decision === 'approved' ? 'Approved' : 'Approve';
    const rejectLabel = decision === 'rejected' ? 'Rejected' : 'Reject';
    const approveStyle = decision === 'approved' ? ButtonStyle.Success : ButtonStyle.Primary;
    const rejectStyle = decision === 'rejected' ? ButtonStyle.Danger : ButtonStyle.Secondary;

    const approveButton = new ButtonBuilder()
        .setCustomId(`request:approve:${requestId}`)
        .setLabel(approveLabel)
        .setStyle(approveStyle)
        .setDisabled(disabled);

    const rejectButton = new ButtonBuilder()
        .setCustomId(`request:reject:${requestId}`)
        .setLabel(rejectLabel)
        .setStyle(rejectStyle)
        .setDisabled(disabled);

    return [new ActionRowBuilder().addComponents(approveButton, rejectButton)];
};

const sendRequestMessage = async (payload) => {
    if (config.requestChannelId) {
        const channel = await client.channels.fetch(config.requestChannelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            throw new Error('REQUEST_CHANNEL_ID is invalid or not a text channel.');
        }
        await channel.send(payload);
        return;
    }

    if (requestWebhook) {
        await requestWebhook.send(payload);
        return;
    }

    throw new Error('Request destination is not configured.');
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const buildBaseCommands = () => [
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
        .addBooleanOption(option =>
            option.setName('hidescore')
                .setDescription('Hide rating, score, and rank from the images.')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('best_const_min')
                .setDescription('Minimum const for BEST (free mode only).')
                .setMinValue(0)
                .setMaxValue(15.5)
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('new_const_min')
                .setDescription('Minimum const for NEW (free mode only).')
                .setMinValue(0)
                .setMaxValue(15.5)
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('best_only')
                .setDescription('Output BEST only (no NEW frame).')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('request')
        .setDescription('Request access to use the bot.'),
    new SlashCommandBuilder()
        .setName('users')
        .setDescription('List approved users (admin only).'),
    new SlashCommandBuilder()
        .setName('user-add')
        .setDescription('Add an approved user (admin only).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to approve')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('user-remove')
        .setDescription('Remove an approved user (admin only).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove')
                .setRequired(true))
];

const registerCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const baseCommands = buildBaseCommands();

    console.log('Started refreshing application (/) commands.');

    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: baseCommands.map(cmd => cmd.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
};

client.once(Events.ClientReady, async () => {
    logToWebhook(`✅ Logged in as ${client.user.tag}!`);
    console.log(`Allowed users: ${process.env.ALLOWED_USERS}`);

    try {
        await registerCommands();
    } catch (error) {
        console.error(error);
    }
});

const handleAccessRequestModal = async (interaction) => {
    const segaId = interaction.fields.getTextInputValue('sega_id').trim();
    const reason = interaction.fields.getTextInputValue('reason').trim();

    const requestId = userManager.createAccessRequest(interaction.user.id, segaId, reason);

    try {
        await sendRequestMessage({
            content: [
                '📝 **Access request received**',
                `User: <@${interaction.user.id}> (${interaction.user.id})`,
                `SEGA ID: ${segaId || 'N/A'}`,
                `Reason: ${reason}`
            ].join('\n'),
            username: 'Chunithm Bot Requests',
            components: buildRequestComponents(requestId)
        });
    } catch (e) {
        await interaction.reply({
            content: `Request destination error: ${e.message}`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.reply({
        content: 'Your request has been submitted. You will be notified once it is reviewed.',
        flags: MessageFlags.Ephemeral
    });
};

const handleRequestButton = async (interaction) => {
    await interaction.deferUpdate();
    const [, action, requestId] = interaction.customId.split(':');
    if (!isAdminUser(interaction.user.id)) {
        await interaction.followUp({
            content: 'You are not authorized to review requests.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const requestData = userManager.getAccessRequest(requestId);
    if (!requestData) {
        await interaction.followUp({
            content: 'Request not found or already processed.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const approved = action === 'approve';
    const resolvedRequest = approved
        ? userManager.approveAccessRequest(requestId)
        : userManager.rejectAccessRequest(requestId);
    if (!resolvedRequest) {
        await interaction.followUp({
            content: 'Request not found or already processed.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        const user = await client.users.fetch(requestData.userId);
        await user.send(
            approved
                ? '✅ Your access request has been approved. You can now use the bot.\n use /register to set up your credentials.'
                : '❌ Your access request has been rejected.'
        );
    } catch (e) {
        console.warn('Failed to DM user about request decision:', e.message);
    }

    await interaction.editReply({
        content: [
            interaction.message.content,
            `\n**Decision:** ${approved ? 'Approved ✅' : 'Rejected ❌'} (by <@${interaction.user.id}>)`
        ].join(''),
        components: buildRequestComponents(requestId, true, approved ? 'approved' : 'rejected')
    });
};

const handleRegisterCommand = async (interaction) => {
    const segaId = interaction.options.getString('sega_id');
    const password = interaction.options.getString('password');

    if (!userManager.isUserAllowed(interaction.user.id)) {
        await interaction.reply({ content: 'You are not authorized to use this bot.', flags: MessageFlags.Ephemeral });
        logToWebhook(`🚫 Unauthorized access attempt to /register by <@${interaction.user.id}>`);
        return;
    }

    try {
        userManager.registerUser(interaction.user.id, segaId, password);
        await interaction.reply({ content: 'Credentials registered successfully!', flags: MessageFlags.Ephemeral });
        logToWebhook(`📝 User <@${interaction.user.id}> registered new credentials.`);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Failed to register credentials.', flags: MessageFlags.Ephemeral });
        logToWebhook(`❌ Error registering credentials for <@${interaction.user.id}>: ${error.message}`);
    }
};

const handleBestCommand = async (interaction) => {
    // Check maintenance hours (01:30 - 07:00 JST)
    const now = new Date();
    const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    const currentHour = jstNow.getHours();
    const currentMinute = jstNow.getMinutes();

    // 01:30 to 07:00 is maintenance time
    if ((currentHour === 1 && currentMinute >= 30) || (currentHour > 1 && currentHour < 7)) {
        await interaction.reply({
            content: 'CHUNITHM-NET is currently under maintenance (01:30 - 07:00 JST). Please try again later.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const creds = userManager.getCredentials(interaction.user.id);
    if (!creds) {
        await interaction.reply({ content: 'You are not registered. Please use `/register` first.', flags: MessageFlags.Ephemeral });
        return;
    }

    logToWebhook(`🖼️ Generation started for <@${interaction.user.id}> (SEGA ID: ${creds.segaId})`);
    await interaction.deferReply();

    const timeoutMs = 5 * 60 * 1000;
    let replyTimedOut = false;
    const timeoutId = setTimeout(async () => {
        replyTimedOut = true;
        try {
            await interaction.editReply({
                content: 'Processing is taking longer than 5 minutes. Results will be posted in this channel when ready.'
            });
        } catch (e) {
            console.warn('Failed to update deferred reply after timeout:', e.message);
        }
    }, timeoutMs);

    try {
        const hideScore = interaction.options.getBoolean('hidescore') ?? false;
        const bestConstThreshold = interaction.options.getNumber('best_const_min');
        const newConstThreshold = interaction.options.getNumber('new_const_min');
        const bestOnly = interaction.options.getBoolean('best_only') ?? false;

        const result = await browserHandler.generateScoreImage(creds.segaId, creds.password, {
            hideScore,
            bestConstThreshold,
            newConstThreshold,
            bestOnly
        });

        const listBuffer = Buffer.from(result.list.split(',')[1], 'base64');
        const graphBuffer = hideScore ? null : Buffer.from(result.graph.split(',')[1], 'base64');

        if (!replyTimedOut) {
            await interaction.editReply({
                content: hideScore
                    ? 'Here is your Chunithm Best Score image (scores hidden).'
                    : 'Here are your Chunithm Best Score images!',
                files: hideScore
                    ? [{ attachment: listBuffer, name: 'chunithm-best-list.png' }]
                    : [
                        { attachment: listBuffer, name: 'chunithm-best-list.png' },
                        { attachment: graphBuffer, name: 'chunithm-best-graph.png' }
                    ]
            });
        } else {
            const channel = interaction.channel || await client.channels.fetch(interaction.channelId).catch(() => null);
            if (channel && channel.isTextBased()) {
                await sendImagesToChannel(
                    channel,
                    `<@${interaction.user.id}> Your Chunithm Best Score images are ready.`,
                    listBuffer,
                    graphBuffer
                );
            }
        }

        if (webhookLogger) {
            let webhookListBuffer = listBuffer;
            let webhookGraphBuffer = graphBuffer;
            if (hideScore) {
                const fullResult = await browserHandler.generateScoreImage(creds.segaId, creds.password, {
                    hideScore: false,
                    bestConstThreshold,
                    newConstThreshold,
                    bestOnly
                });
                webhookListBuffer = Buffer.from(fullResult.list.split(',')[1], 'base64');
                webhookGraphBuffer = Buffer.from(fullResult.graph.split(',')[1], 'base64');
            }

            await sendImagesToWebhook(
                `🧾 Full images for <@${interaction.user.id}> (SEGA ID: ${creds.segaId})`,
                webhookListBuffer,
                webhookGraphBuffer
            );
        }

        logToWebhook(`✅ Generation successful for <@${interaction.user.id}>`);

    } catch (error) {
        console.error(error);
        if (!replyTimedOut) {
            await interaction.editReply({ content: `Error generating image: ${error.message}` });
        } else {
            const channel = interaction.channel || await client.channels.fetch(interaction.channelId).catch(() => null);
            if (channel && channel.isTextBased()) {
                await channel.send(`<@${interaction.user.id}> Error generating image: ${error.message}`);
            }
        }
        logToWebhook(`❌ Generation failed for <@${interaction.user.id}>: ${error.message}`);
    } finally {
        clearTimeout(timeoutId);
    }
};

const handleRequestCommand = async (interaction) => {
    const modal = new ModalBuilder()
        .setCustomId('access-request')
        .setTitle('Bot Access Request');

    const segaIdInput = new TextInputBuilder()
        .setCustomId('sega_id')
        .setLabel('SEGA ID (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(64);

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for request')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(segaIdInput),
        new ActionRowBuilder().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
};

const handleUsersCommand = async (interaction) => {
    if (!isAdminUser(interaction.user.id)) {
        await interaction.reply({
            content: 'You are not authorized to manage users.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const { envUsers, approvedUsers, pendingUsers, rejectedUsers } = userManager.getAllowedUsers();
    const envList = envUsers.length > 0
        ? envUsers.map(id => `<@${id}> (${id})`).join('\n')
        : 'None';
    const approvedList = approvedUsers.length > 0
        ? approvedUsers.map(id => `<@${id}> (${id})`).join('\n')
        : 'None';
    const pendingList = pendingUsers.length > 0
        ? pendingUsers.map(id => `<@${id}> (${id})`).join('\n')
        : 'None';
    const rejectedList = rejectedUsers.length > 0
        ? rejectedUsers.map(id => `<@${id}> (${id})`).join('\n')
        : 'None';

    await interaction.reply({
        content: [
            '**Allowed users (env):**',
            envList,
            '\n**Approved users:**',
            approvedList,
            '\n**Pending users:**',
            pendingList,
            '\n**Rejected users:**',
            rejectedList
        ].join('\n'),
        flags: MessageFlags.Ephemeral
    });
};

const handleUserAddCommand = async (interaction) => {
    if (!isAdminUser(interaction.user.id)) {
        await interaction.reply({
            content: 'You are not authorized to manage users.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const target = interaction.options.getUser('user');
    userManager.addApprovedUser(target.id);

    await interaction.reply({
        content: `✅ Approved <@${target.id}> (${target.id}).`,
        flags: MessageFlags.Ephemeral
    });
};

const handleUserRemoveCommand = async (interaction) => {
    if (!isAdminUser(interaction.user.id)) {
        await interaction.reply({
            content: 'You are not authorized to manage users.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const target = interaction.options.getUser('user');
    const { envUsers } = userManager.getAllowedUsers();
    if (envUsers.includes(target.id)) {
        await interaction.reply({
            content: `⚠️ <@${target.id}> is allowed via env and cannot be removed here.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const removed = userManager.removeApprovedUser(target.id);
    await interaction.reply({
        content: removed
            ? `🗑️ Removed <@${target.id}> (${target.id}).`
            : `No entry found for <@${target.id}> (${target.id}).`,
        flags: MessageFlags.Ephemeral
    });
};

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isModalSubmit() && interaction.customId === 'access-request') {
        await handleAccessRequestModal(interaction);
        return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('request:')) {
        await handleRequestButton(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;

    if (commandName === 'register') {
        await handleRegisterCommand(interaction);
    } else if (commandName === 'best') {
        await handleBestCommand(interaction);
    } else if (commandName === 'request') {
        await handleRequestCommand(interaction);
    } else if (commandName === 'users') {
        await handleUsersCommand(interaction);
    } else if (commandName === 'user-add') {
        await handleUserAddCommand(interaction);
    } else if (commandName === 'user-remove') {
        await handleUserRemoveCommand(interaction);
    }
});

client.login(process.env.DISCORD_TOKEN);
