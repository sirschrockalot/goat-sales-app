#!/bin/bash
# Script to generate personas using Heroku config vars

set -e

echo "🔧 Loading environment variables from Heroku..."

# Load Heroku config vars
export EXPLICIT_ENV=sandbox
export SUPABASE_SANDBOX_URL=$(heroku config:get SUPABASE_SANDBOX_URL -a goat-sales-app)
export SANDBOX_SUPABASE_SERVICE_ROLE_KEY=$(heroku config:get SANDBOX_SUPABASE_SERVICE_ROLE_KEY -a goat-sales-app)
export OPENAI_API_KEY=$(heroku config:get OPENAI_API_KEY -a goat-sales-app)
export SANDBOX_SUPABASE_ANON_KEY=$(heroku config:get SANDBOX_SUPABASE_ANON_KEY -a goat-sales-app)

# Also set fallback variables
export SUPABASE_SERVICE_ROLE_KEY=$SANDBOX_SUPABASE_SERVICE_ROLE_KEY
export NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_SANDBOX_URL
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$SANDBOX_SUPABASE_ANON_KEY

echo "✅ Environment variables loaded"
echo "   SUPABASE_SANDBOX_URL: ${SUPABASE_SANDBOX_URL:0:30}..."
echo "   Has Service Key: $([ -n "$SANDBOX_SUPABASE_SERVICE_ROLE_KEY" ] && echo "Yes" || echo "No")"
echo "   Has OpenAI Key: $([ -n "$OPENAI_API_KEY" ] && echo "Yes" || echo "No")"
echo ""

echo "🚀 Running persona generator..."
npx tsx scripts/personaGenerator.ts
