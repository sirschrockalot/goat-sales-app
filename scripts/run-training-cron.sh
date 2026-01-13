#!/bin/bash
# Wrapper script for cron to run training
# This ensures proper environment setup

cd "$(dirname "$0")/.."
export EXPLICIT_ENV=sandbox
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Load nvm if available
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

# Run the training script with batch size 5
npx tsx scripts/scheduled-training.ts 5 >> logs/cron-training.log 2>&1
