#!/bin/bash

# Setup Automated Training Schedule
# Configures cron job to run training every 15 minutes (Aggressive: 480 battles/day)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_LOG_DIR="$PROJECT_DIR/logs"

echo "🚀 Setting Up Automated Training Schedule"
echo "=========================================="
echo ""

# Ensure logs directory exists
mkdir -p "$CRON_LOG_DIR"

# Get the full path to the training script
TRAINING_SCRIPT="$SCRIPT_DIR/scheduled-training.ts"
CRON_WRAPPER="$SCRIPT_DIR/run-training-cron.sh"

# Create a wrapper script that cron can execute
cat > "$CRON_WRAPPER" << 'EOF'
#!/bin/bash
# Wrapper script for cron to run training
# This ensures proper environment setup

cd "$(dirname "$0")/.."
export EXPLICIT_ENV=sandbox
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Load nvm if available
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

# Run the training script
npx tsx scripts/scheduled-training.ts 5 >> logs/cron-training.log 2>&1
EOF

chmod +x "$CRON_WRAPPER"

# Create cron entry (every 15 minutes - Aggressive training for faster improvement)
CRON_SCHEDULE="*/15 * * * *"
CRON_COMMAND="$CRON_WRAPPER"

# Check if cron job already exists
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"

if crontab -l 2>/dev/null | grep -q "$CRON_WRAPPER"; then
  echo "⚠️  Cron job already exists!"
  echo ""
  echo "Current crontab:"
  crontab -l | grep "$CRON_WRAPPER" || true
  echo ""
  read -p "Do you want to replace it? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove existing job
    crontab -l 2>/dev/null | grep -v "$CRON_WRAPPER" | crontab -
    # Add new job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job updated!"
  else
    echo "❌ Keeping existing cron job"
    exit 0
  fi
else
  # Add new cron job
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  echo "✅ Cron job added!"
fi

echo ""
echo "📋 Training Schedule Configuration:"
echo "   Frequency: Every 15 minutes (AGGRESSIVE MODE)"
echo "   Batch Size: 5 battles per batch"
echo "   Daily Battles: ~480 battles (96 batches)"
echo "   Daily Cost: ~$3.00-6.00"
echo "   Monthly Cost: ~$90-180"
echo "   Log File: $CRON_LOG_DIR/cron-training.log"
echo "   Time Zone: CST (Central Standard Time)"
echo ""
echo "📅 Schedule: Runs every 15 minutes at :00, :15, :30, :45 (CST)"
echo "   ⚡ Accelerated training for faster world-class status (2-3 months vs 3-4 months)"
echo ""
echo "📝 Current crontab:"
crontab -l | grep -A 1 -B 1 "$CRON_WRAPPER" || crontab -l
echo ""
echo "✅ Setup complete!"
echo ""
echo "🔍 To monitor training:"
echo "   tail -f $CRON_LOG_DIR/cron-training.log"
echo ""
echo "🛑 To stop training:"
echo "   npm run train:schedule:stop"
echo ""
echo "▶️  To start training manually:"
echo "   npm run train:schedule:run"
