#!/bin/bash

# Setup CRON_SECRET in Vercel
# This script helps you add or update the CRON_SECRET environment variable

set -e

echo "🔐 Setting up CRON_SECRET in Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if CRON_SECRET is provided as argument
if [ -n "$1" ]; then
  CRON_SECRET="$1"
elif [ -n "$CRON_SECRET" ]; then
  # Use environment variable if set
  CRON_SECRET="$CRON_SECRET"
else
  # Generate a new one
  echo "📝 Generating new CRON_SECRET..."
  CRON_SECRET=$(openssl rand -hex 32)
  echo "✅ Generated: ${CRON_SECRET:0:16}..."
  echo ""
fi

echo "📋 Configuration:"
echo "   CRON_SECRET: ${CRON_SECRET:0:16}... (first 16 chars)"
echo "   Environment: Production"
echo ""

# Check if it already exists
echo "🔍 Checking if CRON_SECRET already exists..."
EXISTING=$(vercel env ls CRON_SECRET 2>&1 | grep -i "production" || echo "")

if [ -n "$EXISTING" ]; then
  echo "⚠️  CRON_SECRET already exists in Production"
  echo ""
  read -p "Do you want to update it? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled. Keeping existing value."
    exit 0
  fi
  
  echo "🔄 Removing existing CRON_SECRET..."
  vercel env rm CRON_SECRET production --yes 2>&1 | grep -v "Retrieving\|Environment" || true
  echo ""
fi

echo "➕ Adding CRON_SECRET to Vercel Production..."
echo "$CRON_SECRET" | vercel env add CRON_SECRET production

echo ""
echo "✅ CRON_SECRET has been set in Vercel Production!"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env.local with:"
echo "      CRON_SECRET=$CRON_SECRET"
echo ""
echo "   2. Test the training endpoint:"
echo "      npm run train:test:vercel 1"
echo ""
echo "   3. Or use curl:"
echo "      curl -X POST https://goat-sales-app.vercel.app/api/cron/train \\"
echo "        -H \"Authorization: Bearer $CRON_SECRET\" \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"batchSize\": 1}'"
echo ""
