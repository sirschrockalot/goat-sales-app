#!/bin/bash
# Wrapper script for cron to run training
# This ensures proper environment setup

cd "$(dirname "$0")/.."
export EXPLICIT_ENV=sandbox

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
fi

# Set up PATH to include common Node.js locations (Homebrew first for macOS)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Load nvm if available
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

# Try to find npx in common locations
if ! command -v npx &> /dev/null; then
    # Try Homebrew Node.js location (most common on macOS)
    if [ -f "/opt/homebrew/bin/npx" ]; then
        export PATH="/opt/homebrew/bin:$PATH"
    # Try nvm default location
    elif [ -f "$HOME/.nvm/versions/node/$(cat $HOME/.nvm/alias/default 2>/dev/null || echo 'default')/bin/npx" ]; then
        export PATH="$HOME/.nvm/versions/node/$(cat $HOME/.nvm/alias/default)/bin:$PATH"
    # Try system locations
    elif [ -f "/usr/local/bin/npx" ]; then
        export PATH="/usr/local/bin:$PATH"
    fi
fi

# Verify npx is available, log error if not
if ! command -v npx &> /dev/null; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: npx not found in PATH: $PATH" >> logs/cron-training.log 2>&1
    exit 1
fi

# Run the training script
npx tsx scripts/scheduled-training.ts 5 >> logs/cron-training.log 2>&1
