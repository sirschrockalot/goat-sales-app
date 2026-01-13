#!/bin/bash
# Real-time Training Log Monitor
# Colors and filters training-related log events

APP_NAME="goat-sales-app"

echo "🔍 Monitoring Training Logs for $APP_NAME"
echo "Press Ctrl+C to stop"
echo ""
echo "Event Types:"
echo "  🟢 Green = Completion/Success"
echo "  🟡 Yellow = Starting/Progress"
echo "  🔴 Red = Errors"
echo "  ⚪ White = Info"
echo ""

heroku logs --tail -a $APP_NAME 2>&1 | \
  grep --line-buffered -E "training|battle|persona|error|complete|score|saved|Turn|kill-switch|throttle" -i | \
  while IFS= read -r line; do
    # Color code different event types
    if echo "$line" | grep -qi "error|kill-switch|failed"; then
      echo -e "\033[31m🔴 $line\033[0m"  # Red for errors
    elif echo "$line" | grep -qi "complete|saved|success"; then
      echo -e "\033[32m🟢 $line\033[0m"  # Green for completion
    elif echo "$line" | grep -qi "starting|battle|Turn"; then
      echo -e "\033[33m🟡 $line\033[0m"  # Yellow for starts/progress
    elif echo "$line" | grep -qi "throttle|warn"; then
      echo -e "\033[35m🟣 $line\033[0m"  # Magenta for warnings
    else
      echo -e "⚪ $line"
    fi
  done
