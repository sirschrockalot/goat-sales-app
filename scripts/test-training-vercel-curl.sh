#!/bin/bash

# Test Training on Vercel using curl
# Usage: ./scripts/test-training-vercel-curl.sh [CRON_SECRET] [BATCH_SIZE]

set -e

APP_URL="${NEXT_PUBLIC_APP_URL:-https://goat-sales-app.vercel.app}"
CRON_SECRET="${1:-${CRON_SECRET}}"
BATCH_SIZE="${2:-1}"

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET is required"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-training-vercel-curl.sh YOUR_CRON_SECRET [BATCH_SIZE]"
  echo ""
  echo "Or set CRON_SECRET environment variable:"
  echo "  CRON_SECRET=your-secret ./scripts/test-training-vercel-curl.sh [BATCH_SIZE]"
  echo ""
  echo "To get your CRON_SECRET from Vercel:"
  echo "  1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
  echo "  2. Find CRON_SECRET in Production environment"
  echo "  3. Copy the value (you may need to reveal it)"
  exit 1
fi

echo "🧪 Testing Training on Vercel Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "   Endpoint: ${APP_URL}/api/cron/train"
echo "   Batch Size: ${BATCH_SIZE} battle(s)"
echo "   CRON_SECRET: ${CRON_SECRET:0:8}..."
echo ""
echo "🚀 Sending test request..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/train" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d "{\"batchSize\": ${BATCH_SIZE}}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "   Status: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Training test successful!"
  echo ""
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "🎉 Training system is working correctly!"
else
  echo "❌ Training test failed!"
  echo ""
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo "💡 Authentication failed. The CRON_SECRET doesn't match."
    echo "   Verify your CRON_SECRET in Vercel matches what you're using."
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "💡 Server error. Check Vercel logs for details:"
    echo "   vercel logs --follow"
  fi
  
  exit 1
fi
