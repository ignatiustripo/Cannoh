const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Cannoh MD WhatsApp Bot',
        version: '3.0.0'
    });
});

// Bot status endpoint
app.get('/bot/status', (req, res) => {
    // This would require passing the bot instance
    // For now, return static info
    res.json({
        bot: 'Cannoh MD',
        status: 'running',
        endpoints: [
            { path: '/health', method: 'GET', description: 'Health check' },
            { path: '/bot/status', method: 'GET', description: 'Bot status' },
            { path: '/qr', method: 'GET', description: 'QR code for linking' }
        ]
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        available_endpoints: [
            '/health',
            '/bot/status',
            '/qr'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });
}

module.exports = app;
