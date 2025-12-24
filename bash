#!/bin/bash
# Cannoh MD Bot Setup Script

echo "╔══════════════════════════════════════════════╗"
echo "║           🤖 CANNOH MD BOT SETUP             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION != v1[6-9]* && $NODE_VERSION != v2[0-9]* ]]; then
    echo "❌ Node.js 16.0.0 or higher is required"
    echo "📥 Download from: https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $NODE_VERSION detected"

# Check npm
echo "📦 Checking npm version..."
NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION detected"

# Install system dependencies for canvas
echo "🔧 Installing system dependencies..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y \
            build-essential \
            libcairo2-dev \
            libpango1.0-dev \
            libjpeg-dev \
            libgif-dev \
            librsvg2-dev \
            python3 \
            make \
            g++
        echo "✅ System dependencies installed (Debian/Ubuntu)"
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL/Fedora
        sudo yum groupinstall "Development Tools"
        sudo yum install -y \
            cairo cairo-devel \
            libjpeg-turbo libjpeg-turbo-devel \
            giflib giflib-devel \
            python3 \
            make \
            gcc-c++
        echo "✅ System dependencies installed (RHEL/CentOS)"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew install pkg-config cairo pango libpng jpeg giflib librsvg python3
    echo "✅ System dependencies installed (macOS)"
else
    echo "⚠️  Unknown OS. Canvas might not work properly."
    echo "ℹ️  You may need to install system dependencies manually."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p \
    auth_info \
    storage \
    downloads \
    output \
    assets/{fonts,icons,backgrounds} \
    logs \
    utils \
    handlers

echo "✅ Directories created"

# Create environment file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Bot Configuration
OWNER_NUMBER=919876543210
PREFIX=!
MODE=public
BOT_NAME=Cannoh MD
SESSION_NAME=cannoh_md_session

# API Keys (Get these from respective websites)
OPENAI_API_KEY=your_openai_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional Database
# MONGODB_URI=mongodb://localhost:27017/cannoh_md

# Security
ENCRYPTION_KEY=your_secure_encryption_key_here
EOF
    echo "⚠️  Please edit .env file with your credentials"
else
    echo "✅ .env file already exists"
fi

# Create storage files
echo "💾 Creating storage files..."

# bot_settings.json
if [ ! -f storage/bot_settings.json ]; then
    cat > storage/bot_settings.json << 'EOF'
{
  "features": {},
  "mode": "public",
  "prefix": "!",
  "approvedUsers": [],
  "userPrefixes": []
}
EOF
    echo "✅ Created bot_settings.json"
fi

# typing_history.json
if [ ! -f storage/typing_history.json ]; then
    cat > storage/typing_history.json << 'EOF'
{
  "patterns": [],
  "lastNotification": [],
  "timestamp": 0
}
EOF
    echo "✅ Created typing_history.json"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check for canvas installation
echo "🔍 Verifying canvas installation..."
if npm list canvas; then
    echo "✅ Canvas installed successfully"
else
    echo "⚠️  Canvas installation might have issues"
    echo "💡 Try: npm rebuild canvas --build-from-source"
fi

# Create sample assets
echo "🎨 Creating sample assets..."
if [ ! -f assets/README.md ]; then
    cat > assets/README.md << 'EOF'
# Cannoh MD Bot Assets

Place your custom assets here:

## Directory Structure:
- fonts/ - Custom fonts (TTF/OTF)
- icons/ - Custom icons (PNG/SVG)
- backgrounds/ - Menu backgrounds

## Default Assets:
If no custom assets are found, the bot will use:
- System fonts (Arial, Consolas)
- Programmatically generated graphics
- Gradient backgrounds
- Emoji icons

## Adding Custom Logo:
1. Add your logo as "logo.png" in assets folder
2. The menu generator will automatically detect it
3. Restart the bot if it's already running

## Recommended Sizes:
- Logo: 512x512 pixels (PNG with transparency)
- Backgrounds: 1200x1800 pixels
- Icons: 64x64 pixels
EOF
    echo "✅ Created assets README"
fi

# Create Procfile for Heroku
if [ ! -f Procfile ]; then
    echo "🌐 Creating Procfile for Heroku..."
    cat > Procfile << 'EOF'
web: node index.js
worker: node index.js
EOF
    echo "✅ Created Procfile"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           🎉 SETUP COMPLETE!                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Edit the .env file with your settings"
echo "2. Add your phone number as OWNER_NUMBER"
echo "3. Add API keys for AI features (optional)"
echo ""
echo "🚀 START THE BOT:"
echo "   npm start"
echo ""
echo "📖 COMMON COMMANDS:"
echo "   npm start    - Start the bot"
echo "   npm run dev  - Start with nodemon (development)"
echo "   npm run setup - Run setup again"
echo ""
echo "💡 TIPS:"
echo "• First run will show QR code - scan with WhatsApp"
echo "• Use !help for bot commands"
echo "• Use !menu for beautiful menu image"
echo "• Check logs/ for activity logs"
echo ""
echo "📞 Need help? Check README.md or create an issue"
