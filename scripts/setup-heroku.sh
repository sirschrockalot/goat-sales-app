#!/bin/bash

# Heroku Setup Script
# This script configures the Heroku app with all required environment variables

set -e

APP_NAME="goat-sales-app"

echo "🚀 Heroku Setup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed"
    echo "   Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check authentication
echo "🔐 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "⚠️  Not authenticated. Please log in:"
    heroku login
fi

echo "✅ Authenticated as: $(heroku auth:whoami)"
echo ""

# Check if app exists
echo "📋 Checking if app exists..."
if ! heroku apps:info $APP_NAME &> /dev/null; then
    echo "➕ Creating Heroku app: $APP_NAME"
    heroku create $APP_NAME
else
    echo "✅ App $APP_NAME already exists"
fi

echo ""
echo "🔧 Setting up Git remote..."
if ! git remote | grep -q heroku; then
    heroku git:remote -a $APP_NAME
    echo "✅ Git remote added"
else
    echo "✅ Git remote already configured"
fi

echo ""
echo "📦 Setting environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Read values from .env.local.bak or prompt
ENV_FILE=".env.local.bak"

if [ -f "$ENV_FILE" ]; then
    echo "📖 Reading environment variables from $ENV_FILE"
    source <(grep -v '^#' $ENV_FILE | grep -v '^$' | sed 's/^/export /')
else
    echo "⚠️  $ENV_FILE not found. You'll need to provide values manually."
fi

# Set required environment variables
# Basic configuration
heroku config:set NODE_ENV=production -a $APP_NAME

# Supabase Production (if available)
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    heroku config:set NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" -a $APP_NAME
    echo "✅ Set NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" -a $APP_NAME
    echo "✅ Set NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    heroku config:set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" -a $APP_NAME
    echo "✅ Set SUPABASE_SERVICE_ROLE_KEY"
fi

# Supabase Sandbox
if [ -n "$SUPABASE_SANDBOX_URL" ]; then
    heroku config:set SUPABASE_SANDBOX_URL="$SUPABASE_SANDBOX_URL" -a $APP_NAME
    echo "✅ Set SUPABASE_SANDBOX_URL"
elif [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"cwnvhhzzcjzhcaozazji"* ]]; then
    heroku config:set SUPABASE_SANDBOX_URL="https://cwnvhhzzcjzhcaozazji.supabase.co" -a $APP_NAME
    echo "✅ Set SUPABASE_SANDBOX_URL (default sandbox)"
fi

if [ -n "$SANDBOX_SUPABASE_SERVICE_ROLE_KEY" ]; then
    heroku config:set SANDBOX_SUPABASE_SERVICE_ROLE_KEY="$SANDBOX_SUPABASE_SERVICE_ROLE_KEY" -a $APP_NAME
    echo "✅ Set SANDBOX_SUPABASE_SERVICE_ROLE_KEY"
fi

if [ -n "$SANDBOX_SUPABASE_ANON_KEY" ]; then
    heroku config:set SANDBOX_SUPABASE_ANON_KEY="$SANDBOX_SUPABASE_ANON_KEY" -a $APP_NAME
    echo "✅ Set SANDBOX_SUPABASE_ANON_KEY"
fi

# Vapi
if [ -n "$NEXT_PUBLIC_VAPI_API_KEY" ]; then
    heroku config:set NEXT_PUBLIC_VAPI_API_KEY="$NEXT_PUBLIC_VAPI_API_KEY" -a $APP_NAME
    echo "✅ Set NEXT_PUBLIC_VAPI_API_KEY"
fi

if [ -n "$VAPI_SECRET_KEY" ]; then
    heroku config:set VAPI_SECRET_KEY="$VAPI_SECRET_KEY" -a $APP_NAME
    echo "✅ Set VAPI_SECRET_KEY"
fi

# OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
    heroku config:set OPENAI_API_KEY="$OPENAI_API_KEY" -a $APP_NAME
    echo "✅ Set OPENAI_API_KEY"
fi

# ElevenLabs
if [ -n "$ELEVEN_LABS_API_KEY" ]; then
    heroku config:set ELEVEN_LABS_API_KEY="$ELEVEN_LABS_API_KEY" -a $APP_NAME
    echo "✅ Set ELEVEN_LABS_API_KEY"
fi

# Deepgram
if [ -n "$DEEPGRAM_API_KEY" ]; then
    heroku config:set DEEPGRAM_API_KEY="$DEEPGRAM_API_KEY" -a $APP_NAME
    echo "✅ Set DEEPGRAM_API_KEY"
fi

# Cron Secret
if [ -n "$CRON_SECRET" ]; then
    heroku config:set CRON_SECRET="$CRON_SECRET" -a $APP_NAME
    echo "✅ Set CRON_SECRET"
else
    echo "⚠️  CRON_SECRET not found. Generating new one..."
    NEW_CRON_SECRET=$(openssl rand -hex 32)
    heroku config:set CRON_SECRET="$NEW_CRON_SECRET" -a $APP_NAME
    echo "✅ Generated and set new CRON_SECRET"
fi

# App URL (will be set after first deploy)
APP_URL="https://${APP_NAME}.herokuapp.com"
echo ""
echo "📝 Note: Set NEXT_PUBLIC_APP_URL after first deploy:"
echo "   heroku config:set NEXT_PUBLIC_APP_URL=$APP_URL -a $APP_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment variables configured!"
echo ""
echo "📋 Next steps:"
echo "   1. Review environment variables: heroku config -a $APP_NAME"
echo "   2. Deploy: git push heroku main"
echo "   3. Set NEXT_PUBLIC_APP_URL after deploy"
echo "   4. Set up Heroku Scheduler: heroku addons:create scheduler:standard"
echo ""
