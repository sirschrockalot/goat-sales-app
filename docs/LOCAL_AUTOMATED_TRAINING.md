# Local Automated Training Schedule Guide

Complete guide for setting up automated training that runs on your local machine to hit the daily target of **240 battles/day**.

## Quick Start

```bash
# 1. Set up the automated schedule (runs every 30 minutes)
npm run train:schedule:setup

# 2. Check if it's running
npm run train:schedule:status

# 3. Monitor training logs
npm run train:schedule:logs

# 4. Stop the schedule when needed
npm run train:schedule:stop
```

## Overview

The automated training schedule runs **every 30 minutes** and executes **5 battles per batch**, resulting in:
- **48 batches/day** × 5 battles = **240 battles/day**
- **Daily cost**: ~$1.50-3.00
- **Monthly cost**: ~$45-90

## How It Works

1. **Cron Job**: Uses macOS/Linux `cron` to schedule training
2. **Schedule**: Runs every 30 minutes (`*/30 * * * *`)
3. **Batch Size**: 5 battles per execution
4. **Logging**: All output logged to `logs/cron-training.log`
5. **Budget Check**: Automatically skips if daily budget exceeded

## Setup Instructions

### Step 1: Initial Setup

Run the setup script:

```bash
npm run train:schedule:setup
```

This will:
- Create the cron wrapper script
- Add a cron job that runs every 30 minutes
- Set up logging directory
- Configure environment variables

### Step 2: Verify Setup

Check if the cron job was added:

```bash
npm run train:schedule:status
```

Or manually check:

```bash
crontab -l | grep run-training-cron
```

You should see:
```
*/30 * * * * /path/to/goat-sales-app/scripts/run-training-cron.sh
```

### Step 3: Test Manually

Before relying on the schedule, test it manually:

```bash
npm run train:schedule:run
```

This runs a single batch (5 battles) to ensure everything works.

## Monitoring

### View Live Logs

```bash
npm run train:schedule:logs
```

Or manually:

```bash
tail -f logs/cron-training.log
```

### Check Training Activity

```bash
# Check recent battles in database
npx tsx scripts/check-training-data.ts

# Check budget status
npx tsx scripts/check-training-status.ts
```

### View Cron Logs (macOS)

On macOS, cron logs are in:
```bash
# View system cron logs
log show --predicate 'process == "cron"' --last 1h

# Or check mail (cron sends errors to mail)
mail
```

## Managing the Schedule

### Stop Training

```bash
npm run train:schedule:stop
```

This removes the cron job but keeps your other cron jobs intact.

### Restart Training

```bash
npm run train:schedule:setup
```

### Change Schedule Frequency

Edit the cron schedule in `scripts/setup-training-schedule.sh`:

```bash
# Every 30 minutes (current)
CRON_SCHEDULE="*/30 * * * *"

# Every 15 minutes (more aggressive)
CRON_SCHEDULE="*/15 * * * *"

# Every hour (more conservative)
CRON_SCHEDULE="0 * * * *"
```

Then re-run setup:
```bash
npm run train:schedule:setup
```

### Change Batch Size

Edit `scripts/run-training-cron.sh` and change the batch size:

```bash
# Change from 5 to 3 battles per batch
npx tsx scripts/scheduled-training.ts 3
```

Or edit the script directly.

## Schedule Details

### Current Configuration

- **Frequency**: Every 30 minutes
- **Batch Size**: 5 battles
- **Daily Battles**: 240 battles
- **Daily Cost**: ~$1.50-3.00
- **Log File**: `logs/cron-training.log`
- **JSON Log**: `logs/training-schedule.log` (structured data)

### Expected Daily Output

With 48 batches per day:
- **Total Battles**: 240
- **Total Cost**: ~$1.03-2.40 (depending on GPT-4o referee usage)
- **Total Duration**: ~10 hours of training time
- **Average Score**: Should improve over time (60-70 → 85-95)

## Troubleshooting

### Training Not Running

1. **Check cron is running**:
   ```bash
   # macOS
   sudo launchctl list | grep cron
   
   # Linux
   systemctl status cron
   ```

2. **Check cron job exists**:
   ```bash
   crontab -l
   ```

3. **Check script permissions**:
   ```bash
   ls -la scripts/run-training-cron.sh
   # Should show: -rwxr-xr-x
   ```

4. **Check logs for errors**:
   ```bash
   tail -100 logs/cron-training.log
   ```

### "Command not found: npx"

The cron environment may not have Node.js in PATH. The wrapper script handles this, but if issues persist:

1. **Find Node.js path**:
   ```bash
   which node
   which npx
   ```

2. **Update wrapper script** (`scripts/run-training-cron.sh`):
   ```bash
   # Add to top of script
   export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
   # Or add specific Node.js path
   export PATH="/path/to/node/bin:$PATH"
   ```

### Budget Exceeded

If daily budget is exceeded, training will automatically skip. Check:

```bash
npx tsx scripts/check-training-status.ts
```

The script will show:
```
❌ Budget exceeded. Skipping training batch.
```

### No Battles Completing

1. **Check API key**:
   ```bash
   # Should show your API key (first 15 chars)
   grep OPENAI_API_KEY .env.local | head -1
   ```

2. **Check personas exist**:
   ```bash
   npx tsx scripts/check-training-data.ts
   ```

3. **Run manually to see errors**:
   ```bash
   npm run train:schedule:run
   ```

## Advanced Configuration

### Custom Schedule Times

Edit `scripts/setup-training-schedule.sh` and change:

```bash
# Run only during business hours (9 AM - 5 PM, every 30 min)
CRON_SCHEDULE="*/30 9-17 * * *"

# Run every 15 minutes during peak hours
CRON_SCHEDULE="*/15 9-17 * * *"

# Run twice daily (2 AM and 2 PM)
CRON_SCHEDULE="0 2,14 * * *"
```

### Multiple Schedules

You can set up multiple schedules with different batch sizes:

```bash
# Small batches every 30 min
*/30 * * * * /path/to/script.sh 3

# Large batches twice daily
0 2,14 * * * /path/to/script.sh 10
```

### Environment-Specific Schedules

Create separate wrapper scripts for different environments:

```bash
# scripts/run-training-cron-sandbox.sh
export EXPLICIT_ENV=sandbox
npx tsx scripts/scheduled-training.ts 5

# scripts/run-training-cron-dev.sh
export EXPLICIT_ENV=local
npx tsx scripts/scheduled-training.ts 3
```

## Best Practices

1. **Start Small**: Test with 1-2 battles before full automation
2. **Monitor First Week**: Watch logs daily to ensure it's working
3. **Check Budget Daily**: Ensure you're staying within limits
4. **Review Scores Weekly**: Track improvement trends
5. **Adjust as Needed**: Increase/decrease frequency based on results

## Expected Results

### Week 1-2
- **Battles**: ~1,000-1,500
- **Average Score**: 60-70/100
- **Cost**: ~$5-10

### Month 1
- **Battles**: ~7,200
- **Average Score**: 60-70/100
- **Cost**: ~$30-60

### Month 2-3
- **Battles**: ~14,400
- **Average Score**: 70-85/100
- **Cost**: ~$60-120

### Month 4+
- **Battles**: ~7,200/month
- **Average Score**: 85-95/100
- **Cost**: ~$30-60/month

## Summary

**Recommended Setup**:
- ✅ Run `npm run train:schedule:setup` once
- ✅ Monitor with `npm run train:schedule:logs`
- ✅ Check status with `npm run train:schedule:status`
- ✅ Stop with `npm run train:schedule:stop` when needed

**Result**: Automated training that runs 24/7, hitting 240 battles/day with minimal manual intervention.
