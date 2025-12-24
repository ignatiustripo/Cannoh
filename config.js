require('dotenv').config();

module.exports = {
    // Bot Settings
    owner: process.env.OWNER_NUMBER || '254781346242',
    defaultPrefix: process.env.PREFIX || '!',
    sessionName: process.env.SESSION_NAME || 'cannoh_md',
    botName: process.env.BOT_NAME || 'Cannoh MD',
    
    // Mode Settings
    defaultMode: process.env.MODE || 'public',
    
    // API Keys
    openaiApiKey: process.env.OPENAI_API_KEY,
    ytApiKey: process.env.YOUTUBE_API_KEY,
    
    // Feature Toggles (All enabled by default)
    features: {
        autoViewStatus: true,
        antiDelete: true,
        downloadMedia: true,
        viewOnceDownload: true,
        fakeRecording: true,
        alwaysOnline: true,
        fakeTyping: true,
        autoLikeStatus: true,
        aiFeatures: true,
        chatGPT: true,
        statusDownloader: true,
        antiCall: true,
        smartChatbot: true,
        autoBioUpdate: true,
        autoReact: true,
        autoRead: true,
        autoSaveContacts: true,
        antiBan: true,
        banSafeMode: true,
        prefixCustomization: true,
        modeSwitch: true,
        typingDetection: true,
        typingNotification: true,
        typingAnalytics: true
    },
    
    // Mode-specific settings
    modeSettings: {
        public: {
            allowedCommands: 'all',
            allowedUsers: 'all',
            requireApproval: false
        },
        private: {
            allowedCommands: ['help', 'ping', 'ai', 'gpt', 'menu'],
            allowedUsers: ['owner'],
            requireApproval: true,
            approvalList: []
        }
    },
    
    // Typing Detection Settings
    typingDetection: {
        enabled: true,
        notifyOwner: true,
        notifyGroup: false,
        saveLogs: true,
        trackPatterns: true,
        cooldown: 30000,
        ignoreBots: true,
        monitoredUsers: [],
        ignoredUsers: [],
        blacklistWords: [],
        typingSpeedAnalysis: true
    },
    
    // Auto-reaction settings
    autoReact: {
        enabled: true,
        reactions: ['❤️', '🔥', '😂', '😮', '😢', '👍'],
        probability: 0.3
    },
    
    // AI Settings
    ai: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500
    },
    
    // Anti-ban protection settings
    antiBan: {
        maxMessagesPerMinute: 30,
        delayBetweenMessages: 1000,
        randomDelay: true
    },
    
    // Notification Settings
    notifications: {
        privateChat: true,
        groups: false,
        mentionUser: true,
        includeDuration: true,
        sendScreenshot: false,
        soundAlert: false
    }
};
