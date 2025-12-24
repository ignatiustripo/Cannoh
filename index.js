const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const express = require('express');

// Import handlers
const MessageHandler = require('./handlers/messageHandler');
const FeatureHandler = require('./handlers/featureHandler');
const CommandHandler = require('./handlers/commandHandler');
const AIHandler = require('./handlers/aiHandler');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.qrCode = null;
        this.authFolder = './auth_info';
        this.config = config;
        
        // Initialize with default mode and prefix
        this.currentMode = config.defaultMode;
        this.currentPrefix = config.defaultPrefix;
        this.approvedUsers = new Set(); // For private mode
        this.userPrefixes = new Map(); // User-specific prefixes
        
        // Initialize handlers
        this.messageHandler = new MessageHandler(this);
        this.featureHandler = new FeatureHandler(this);
        this.commandHandler = new CommandHandler(this);
        this.aiHandler = new AIHandler(this);
        
        // Load saved settings
        this.loadBotSettings();
    }

    async initialize() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: true,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                },
                browser: Browsers.macOS('Chrome'),
                markOnlineOnConnect: this.config.features.alwaysOnline,
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                retryRequestDelayMs: 2000,
                maxMsgRetryCount: 3,
                defaultQueryTimeoutMs: 60000,
                fireInitQueries: true,
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 10000
            });

            // Save credentials
            this.sock.ev.on('creds.update', saveCreds);

            // Handle connection events
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.qrCode = qr;
                    require('qrcode-terminal').generate(qr, { small: true });
                }
                
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
                    
                    if (shouldReconnect) {
                        setTimeout(() => this.initialize(), 5000);
                    }
                } else if (connection === 'open') {
                    console.log('✅ Bot connected successfully!');
                    this.isConnected = true;
                    this.showWelcomeMessage();
                    
                    // Start feature handlers
                    this.startFeatureHandlers();
                }
            });

            // Handle messages
            this.sock.ev.on('messages.upsert', async (m) => {
                await this.messageHandler.handleMessage(m);
            });

            // Handle presence updates (typing, recording, online status)
            this.sock.ev.on('presence.update', async (update) => {
                // Auto view status
                if (this.config.features.autoViewStatus) {
                    this.featureHandler.handleStatusView(update);
                }
                
                // Typing detection
                if (this.config.features.typingDetection) {
                    await this.featureHandler.handleTypingUpdate(update);
                }
            });

            // Handle message deletions
            this.sock.ev.on('messages.delete', (deleteData) => {
                if (this.config.features.antiDelete) {
                    this.featureHandler.handleDeleteMessage(deleteData);
                }
            });

            // Handle calls
            this.sock.ev.on('call', async (call) => {
                if (this.config.features.antiCall) {
                    await this.featureHandler.handleCall(call);
                }
            });

            console.log('🤖 Cannoh MD Bot initializing...');

        } catch (error) {
            console.error('Initialization error:', error);
            setTimeout(() => this.initialize(), 5000);
        }
    }

    async loadBotSettings() {
        try {
            const data = fs.readFileSync('./storage/bot_settings.json', 'utf8');
            const savedSettings = JSON.parse(data);
            
            // Load features
            Object.assign(this.config.features, savedSettings.features || {});
            
            // Load mode and prefix settings
            this.currentMode = savedSettings.mode || this.config.defaultMode;
            this.currentPrefix = savedSettings.prefix || this.config.defaultPrefix;
            
            // Load approved users for private mode
            if (savedSettings.approvedUsers) {
                this.approvedUsers = new Set(savedSettings.approvedUsers);
            }
            
            // Load user-specific prefixes
            if (savedSettings.userPrefixes) {
                this.userPrefixes = new Map(savedSettings.userPrefixes);
            }
            
            console.log('✅ Bot settings loaded from storage');
            console.log(`📛 Current Prefix: ${this.currentPrefix}`);
            console.log(`🔒 Current Mode: ${this.currentMode}`);
            
        } catch (error) {
            console.log('ℹ️ No saved settings found, using defaults');
            this.saveBotSettings();
        }
    }

    saveBotSettings() {
        try {
            const settings = {
                features: this.config.features,
                mode: this.currentMode,
                prefix: this.currentPrefix,
                approvedUsers: Array.from(this.approvedUsers),
                userPrefixes: Array.from(this.userPrefixes.entries())
            };
            
            fs.writeFileSync(
                './storage/bot_settings.json', 
                JSON.stringify(settings, null, 2)
            );
            console.log('✅ Bot settings saved');
        } catch (error) {
            console.error('Error saving bot settings:', error);
        }
    }

    // Check if user is authorized
    isUserAuthorized(userJid, command = null) {
        const userNumber = userJid.split('@')[0];
        
        // Owner is always authorized
        if (userNumber === this.config.owner.split('@')[0]) {
            return true;
        }
        
        // Check mode
        if (this.currentMode === 'public') {
            return true;
        }
        
        // Private mode checks
        if (this.currentMode === 'private') {
            // Check if user is in approved list
            if (this.approvedUsers.has(userJid)) {
                return true;
            }
            
            // Check if command is allowed for everyone
            const allowedCommands = this.config.modeSettings.private.allowedCommands;
            if (command && allowedCommands.includes(command)) {
                return true;
            }
        }
        
        return false;
    }

    // Get prefix for a specific user
    getUserPrefix(userJid) {
        return this.userPrefixes.get(userJid) || this.currentPrefix;
    }

    // Add user to approved list
    approveUser(userJid) {
        this.approvedUsers.add(userJid);
        this.saveBotSettings();
    }

    // Remove user from approved list
    removeUser(userJid) {
        this.approvedUsers.delete(userJid);
        this.saveBotSettings();
    }

    // Change bot mode
    setMode(mode) {
        if (['public', 'private'].includes(mode)) {
            this.currentMode = mode;
            this.saveBotSettings();
            return true;
        }
        return false;
    }

    // Change global prefix
    setPrefix(prefix) {
        if (prefix.length <= 3) {
            this.currentPrefix = prefix;
            this.saveBotSettings();
            return true;
        }
        return false;
    }

    // Set user-specific prefix
    setUserPrefix(userJid, prefix) {
        if (prefix.length <= 3) {
            this.userPrefixes.set(userJid, prefix);
            this.saveBotSettings();
            return true;
        }
        return false;
    }

    showWelcomeMessage() {
        const welcomeMessage = `
╔══════════════════════════════════════════════╗
║           🤖 CANNOH MD BOT ACTIVATED         ║
╚══════════════════════════════════════════════╝

📛 Prefix: ${this.currentPrefix}
🔒 Mode: ${this.currentMode.toUpperCase()}
👑 Owner: ${this.config.owner.split('@')[0]}

🔥 FEATURES ENABLED (${Object.values(this.config.features).filter(Boolean).length}/22):
${Object.entries(this.config.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => `✅ ${feature}`)
    .join('\n')}

📝 Use ${this.currentPrefix}help to see all commands
🔧 Use ${this.currentPrefix}toggle <feature> to control features
🎨 Use ${this.currentPrefix}menu for beautiful menu

Bot is ready and running!
`;
        console.log(welcomeMessage);
    }

    startFeatureHandlers() {
        // Start auto bio update if enabled
        if (this.config.features.autoBioUpdate) {
            this.featureHandler.startAutoBioUpdate();
        }

        // Start auto react if enabled
        if (this.config.features.autoReact) {
            this.featureHandler.startAutoReact();
        }

        // Start always online
        if (this.config.features.alwaysOnline) {
            this.featureHandler.keepOnline();
        }

        // Log typing detection status
        if (this.config.features.typingDetection) {
            console.log('👁️ Typing detection enabled');
        }

        console.log('🚀 Feature handlers started');
    }
}

// Start the bot
const bot = new WhatsAppBot();
bot.initialize();

// Keep process alive
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Express server for Heroku/panel deployment
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'Cannoh MD WhatsApp Bot',
        connected: bot.isConnected,
        version: '3.0.0',
        features: Object.keys(bot.config.features).filter(k => bot.config.features[k]).length,
        totalFeatures: Object.keys(bot.config.features).length
    });
});

app.get('/qr', (req, res) => {
    if (bot.qrCode) {
        res.send(`
            <html>
                <head>
                    <title>Cannoh MD - QR Code</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            text-align: center;
                        }
                        .container {
                            background: rgba(255, 255, 255, 0.1);
                            padding: 40px;
                            border-radius: 20px;
                            backdrop-filter: blur(10px);
                        }
                        pre {
                            background: white;
                            color: black;
                            padding: 20px;
                            border-radius: 10px;
                            font-size: 10px;
                            line-height: 1;
                        }
                        h1 {
                            margin-bottom: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🤖 Cannoh MD WhatsApp Bot</h1>
                        <h2>Scan QR Code</h2>
                        <pre>${require('qrcode-terminal').generate(bot.qrCode, { small: true })}</pre>
                        <p>Scan this QR code with WhatsApp > Linked Devices</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        res.send('QR not available or already connected');
    }
});

app.get('/status', (req, res) => {
    res.json({
        connected: bot.isConnected,
        mode: bot.currentMode,
        prefix: bot.currentPrefix,
        features: bot.config.features
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});
