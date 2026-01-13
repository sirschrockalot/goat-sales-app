#!/bin/bash
# Monitor Heroku logs for 60 seconds, filtering for relevant messages

APP_NAME="goat-sales-app"
DURATION=60

echo "🔍 Monitoring Heroku logs for $DURATION seconds..."
echo "Looking for: middleware, cookie, admin, dashboard, auth, redirect messages"
echo "Press Ctrl+C to stop early"
echo ""
echo "--- Starting log stream ---"
echo ""

# Start heroku logs in background
heroku logs --tail -a $APP_NAME 2>&1 | \
  grep --line-buffered -E "middleware|cookie|admin|dashboard|auth|redirect|No access token|Available cookies" -i | \
  while IFS= read -r line; do
    # Color code different types of messages
    if echo "$line" | grep -qi "error\|failed\|denied"; then
      echo -e "\033[31m$line\033[0m"  # Red for errors
    elif echo "$line" | grep -qi "middleware.*granted\|admin.*granted"; then
      echo -e "\033[32m$line\033[0m"  # Green for success
    elif echo "$line" | grep -qi "cookie"; then
      echo -e "\033[33m$line\033[0m"  # Yellow for cookie messages
    else
      echo "$line"
    fi
  done &

LOG_PID=$!

# Wait for specified duration
sleep $DURATION

# Kill the log process
kill $LOG_PID 2>/dev/null

echo ""
echo "--- Monitoring complete ---"
