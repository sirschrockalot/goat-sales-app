#!/bin/bash

# Configure Heroku Environment Variables
# Run this after: heroku login

set -e

APP_NAME="goat-sales-app"

echo "🔧 Configuring Heroku Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check authentication
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not authenticated. Please run: heroku login"
    exit 1
fi

# Check if app exists, create if not
if ! heroku apps:info $APP_NAME &> /dev/null; then
    echo "➕ Creating Heroku app: $APP_NAME"
    heroku create $APP_NAME
fi

# Set Git remote
if ! git remote | grep -q heroku; then
    echo "🔗 Setting up Git remote..."
    heroku git:remote -a $APP_NAME
fi

echo "📦 Setting environment variables from .env.local.bak..."
echo ""

# Read from .env.local.bak
ENV_FILE=".env.local.bak"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found"
    exit 1
fi

# Extract and set variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove quotes from value
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    # Set on Heroku
    if [ -n "$value" ] && [ "$value" != "your_*" ]; then
        echo "Setting $key..."
        heroku config:set "$key=$value" -a $APP_NAME 2>&1 | grep -v "Retrieving\|Setting" || true
    fi
done < <(grep -E "^[A-Z_]+=" "$ENV_FILE")

# Set required defaults
echo ""
echo "Setting required defaults..."
heroku config:set NODE_ENV=production -a $APP_NAME

# Generate CRON_SECRET if not set
if ! heroku config:get CRON_SECRET -a $APP_NAME &> /dev/null; then
    echo "Generating CRON_SECRET..."
    NEW_SECRET=$(openssl rand -hex 32)
    heroku config:set CRON_SECRET="$NEW_SECRET" -a $APP_NAME
    echo "✅ Generated CRON_SECRET: ${NEW_SECRET:0:16}..."
fi

# Get app URL
APP_URL=$(heroku apps:info $APP_NAME 2>&1 | grep "Web URL" | awk '{print $3}' || echo "https://${APP_NAME}.herokuapp.com")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration complete!"
echo ""
echo "📋 Summary:"
echo "   App: $APP_NAME"
echo "   URL: $APP_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Set NEXT_PUBLIC_APP_URL:"
echo "      heroku config:set NEXT_PUBLIC_APP_URL=$APP_URL -a $APP_NAME"
echo ""
echo "   2. Review all config:"
echo "      heroku config -a $APP_NAME"
echo ""
echo "   3. Deploy:"
echo "      git push heroku main"
echo ""
echo "   4. Set up Heroku Scheduler:"
echo "      heroku addons:create scheduler:standard"
echo "      heroku addons:open scheduler"
echo ""
