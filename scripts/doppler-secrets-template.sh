#!/bin/bash

# Doppler Secrets Template
# Copy this script and fill in your actual values, then run it to set all secrets at once

# Usage:
# 1. Copy this file: cp scripts/doppler-secrets-template.sh scripts/set-my-secrets.sh
# 2. Edit scripts/set-my-secrets.sh with your actual values
# 3. Run: bash scripts/set-my-secrets.sh

set -e

PROJECT="goat-sales-app"
CONFIG="dev"

echo "Setting secrets for $PROJECT/$CONFIG..."
echo ""

# ============================================================================
# REQUIRED SECRETS
# ============================================================================

# OpenAI
doppler secrets set OPENAI_API_KEY="sk-your-openai-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Supabase
doppler secrets set NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" --config "$CONFIG" --project "$PROJECT" --no-interactive
doppler secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive
doppler secrets set SUPABASE_SANDBOX_URL="https://your-sandbox-project.supabase.co" --config "$CONFIG" --project "$PROJECT" --no-interactive
doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Vapi
doppler secrets set VAPI_SECRET_KEY="your-vapi-secret-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive
doppler secrets set NEXT_PUBLIC_VAPI_API_KEY="your-vapi-public-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# ============================================================================
# OPTIONAL SECRETS (Uncomment and fill in as needed)
# ============================================================================

# ElevenLabs
# doppler secrets set ELEVEN_LABS_API_KEY="your-elevenlabs-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Deepgram
# doppler secrets set DEEPGRAM_API_KEY="your-deepgram-key-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Slack
# doppler secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Twilio (SMS Alerts)
# doppler secrets set TWILIO_ACCOUNT_SID="your-account-sid" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set TWILIO_AUTH_TOKEN="your-auth-token" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set TWILIO_PHONE_NUMBER="+1234567890" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set ALERT_PHONE_NUMBER="+1234567890" --config "$CONFIG" --project "$PROJECT" --no-interactive

# DocuSign
# doppler secrets set DOCUSIGN_ACCOUNT_ID="your-account-id" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set DOCUSIGN_INTEGRATION_KEY="your-integration-key" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set DOCUSIGN_USER_ID="your-user-id" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set DOCUSIGN_PRIVATE_KEY="your-private-key" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set DOCUSIGN_TEMPLATE_ID="your-template-id" --config "$CONFIG" --project "$PROJECT" --no-interactive

# PandaDoc
# doppler secrets set PANDADOC_API_KEY="your-pandadoc-key" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set PANDADOC_TEMPLATE_ID="your-template-id" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Contract Webhook
# doppler secrets set CONTRACT_WEBHOOK_URL="https://hooks.zapier.com/hooks/catch/..." --config "$CONFIG" --project "$PROJECT" --no-interactive

# Market Data APIs
# doppler secrets set INVESTORBASE_API_KEY="your-investorbase-key" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set ZILLOW_API_KEY="your-zillow-key" --config "$CONFIG" --project "$PROJECT" --no-interactive

# App Configuration
# doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set CRON_SECRET="your-cron-secret-here" --config "$CONFIG" --project "$PROJECT" --no-interactive

# Local Development (Docker)
# doppler secrets set USE_LOCAL_DB="true" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set LOCAL_DB_URL="postgresql://postgres:postgres@localhost:5432/sandbox" --config "$CONFIG" --project "$PROJECT" --no-interactive
# doppler secrets set REDIS_URL="redis://localhost:6379" --config "$CONFIG" --project "$PROJECT" --no-interactive

echo ""
echo "✅ Secrets set successfully!"
echo ""
echo "Verify with: doppler secrets --config $CONFIG --project $PROJECT"
