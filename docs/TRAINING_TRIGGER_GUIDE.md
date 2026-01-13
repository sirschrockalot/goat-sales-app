# AI Model Training Trigger Guide

This document describes all the ways to trigger autonomous AI model training in the system.

---

## Overview

The training system runs autonomous battles between your AI closer and various seller personas to improve performance. Training can be triggered through multiple methods:

1. **Automated (Heroku Scheduler)** - Scheduled execution
2. **Manual API Call** - Direct HTTP request
3. **Local Development Script** - For local testing
4. **Ignition Script** - Initial training setup
5. **Direct Script Execution** - Advanced usage

---

## 1. Automated Training (Heroku Scheduler)

### How It Works

Training runs automatically on a schedule configured in Heroku Scheduler. Set up scheduled jobs via the Heroku Dashboard or CLI.

**Recommended Schedule**: Every 30 minutes (`*/30 * * * *`) or daily at 2:00 PM UTC (`0 14 * * *`)

### Setting Up Heroku Scheduler

1. **Via Heroku Dashboard**:
   - Go to your Heroku app → Resources
   - Add "Heroku Scheduler" addon
   - Create a new job with command: `curl -X GET https://your-app.herokuapp.com/api/cron/train -H "Authorization: Bearer $CRON_SECRET"`
   - Set the schedule (e.g., `*/30 * * * *` for every 30 minutes)

2. **Via Heroku CLI**:
   ```bash
   heroku addons:create scheduler:standard
   heroku addons:open scheduler
   ```

### Customizing the Schedule

In Heroku Scheduler, you can set:
- **Every 30 minutes**: `*/30 * * * *`
- **Every hour**: `0 * * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Daily at 2 AM**: `0 2 * * *`
- **Twice daily (2 AM and 2 PM)**: `0 2,14 * * *`

### Requirements

- `CRON_SECRET` environment variable must be set in Heroku
- Heroku Scheduler command must include `Authorization: Bearer ${CRON_SECRET}` header
- Endpoint: `GET /api/cron/train`

### Batch Size

Default batch size is controlled by:
- `TRAINING_BATCH_SIZE` environment variable (default: 5)
- Query parameter: `?batchSize=3` (overrides default)

---

## 2. Manual API Trigger

### Production (Heroku)

Trigger training manually via HTTP POST request:

```bash
curl -X POST https://your-app.herokuapp.com/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}'
```

### Local Development

If your dev server is running on `localhost:3000`:

```bash
curl -X POST http://localhost:3000/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}'
```

### Authentication

- **Required Header**: `Authorization: Bearer ${CRON_SECRET}`
- Get `CRON_SECRET` from your `.env.local` file or Heroku environment variables
- Without correct authentication, you'll receive `401 Unauthorized`

### Response Format

```json
{
  "success": true,
  "batch": {
    "battlesCompleted": 5,
    "totalCost": 0.0234,
    "averageScore": 87.3,
    "batchId": "batch-1234567890-abc123",
    "completedAt": "2024-01-15T14:30:00.000Z",
    "errors": []
  },
  "message": "Training batch completed: 5 battles"
}
```

---

## 3. Local Development Script

### Using npm Script (Recommended)

The easiest way to trigger training locally:

```bash
# With default batch size (5)
npm run train:trigger

# With custom batch size
npm run train:trigger 3
```

### Using Script Directly

```bash
# Default batch size (5)
npx tsx scripts/trigger-training-local.ts

# Custom batch size
npx tsx scripts/trigger-training-local.ts 3
```

### Requirements

1. **Dev server must be running**:
   ```bash
   npm run dev
   ```

2. **CRON_SECRET in .env.local**:
   ```bash
   CRON_SECRET=your-secret-here
   ```

3. **Environment variables configured**:
   - Supabase credentials
   - OpenAI API key
   - Other required env vars

### What It Does

- Reads `CRON_SECRET` from `.env.local`
- Sends POST request to `http://localhost:3000/api/cron/train`
- Displays results: battles completed, average score, total cost
- Handles errors with helpful messages

---

## 4. Ignition Script (Initial Setup)

### Purpose

The ignition script runs the **first 5 autonomous battles** to initialize the training system.

### Usage

```bash
# Standard usage (automatically uses SANDBOX environment)
npm run ignite

# Explicitly set environment
EXPLICIT_ENV=sandbox npm run ignite
```

### What It Does

1. ✅ Initializes Budget Monitor (Hard cap $15.00)
2. ✅ Fetches 5 random Principal Partner personas
3. ✅ Executes 5 parallel battles
4. ✅ Pipes results into Vocal Soul Auditor for grading
5. ✅ Reports results and budget status

### Output Example

```
🚀 IGNITION SEQUENCE STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Step 1: Initializing Budget Monitor...
✅ Budget Monitor initialized
👥 Step 2: Fetching Principal Partner personas...
✅ Fetched 5 personas
⚔️  Step 3: Executing 5 parallel battles...
✅ Battle 1 complete
✅ Battle 2 complete
...
🎉 IGNITION SEQUENCE COMPLETE
```

### When to Use

- **First-time setup**: Initialize the training system
- **After persona generation**: Test new personas
- **After environment changes**: Verify configuration

---

## 5. Direct Script Execution (Advanced)

### Autonomous Battle Script

Run battles directly using the autonomous battle script:

```bash
npm run sandbox:battle
```

Or directly:

```bash
npx tsx scripts/autonomousBattle.ts
```

### What It Does

- Runs battles interactively or in batch mode
- More control over battle parameters
- Useful for debugging or custom scenarios

### Parameters

The script accepts various parameters for customization:
- Persona selection
- Batch size
- Temperature settings
- Concurrency control

---

## Configuration Options

### Environment Variables

Control training behavior via environment variables:

```bash
# Batch Size
TRAINING_BATCH_SIZE=5              # Default: 5 battles per execution
MAX_TRAINING_BATCH_SIZE=10        # Maximum allowed batch size

# Execution Time
MAX_TRAINING_EXECUTION_TIME_MS=50000  # Timeout in milliseconds (default: 50s)

# Concurrency Control
MAX_CONCURRENT_BATTLES=3           # Max concurrent battles (default: 3)
DELAY_BETWEEN_BATTLES_MS=1000      # Delay between starting battles (default: 1000ms)

# Authentication
CRON_SECRET=your-secret-here       # Required for API authentication
```

### Adjusting for Performance

**For Higher Throughput** (if rate limits allow):
```bash
MAX_CONCURRENT_BATTLES=5
DELAY_BETWEEN_BATTLES_MS=500
TRAINING_BATCH_SIZE=10
```

**For Lower Costs** (more conservative):
```bash
MAX_CONCURRENT_BATTLES=1
DELAY_BETWEEN_BATTLES_MS=2000
TRAINING_BATCH_SIZE=3
```

---

## Monitoring Training

### View Training Progress

1. **Training Monitor Dashboard**:
   - URL: `/admin/training-monitor`
   - Real-time battle feed
   - Battle results and scores
   - Breakthrough notifications

2. **Heroku Logs** (Production):
   - Run: `heroku logs --tail -a your-app-name`
   - Filter by `/api/cron/train`
   - View execution history and errors

3. **Local Terminal** (Development):
   - Watch your dev server terminal
   - All training logs appear in real-time

### Metrics to Track

- **Battles Completed**: Number of battles per batch
- **Average Score**: Average referee score (target: >85)
- **Total Cost**: Cost per batch (monitor for budget)
- **Breakthroughs Detected**: New breakthroughs found (score >= 95)
- **Execution Time**: Time taken per batch

---

## Troubleshooting

### "Cron secret not configured"

**Solution**: Set `CRON_SECRET` in your environment variables
```bash
# Generate a secure secret
openssl rand -hex 32

# Add to .env.local
CRON_SECRET=generated-secret-here
```

### "Execution timeout"

**Solutions**:
- Reduce `TRAINING_BATCH_SIZE`
- Reduce `MAX_CONCURRENT_BATTLES`
- Increase `MAX_TRAINING_EXECUTION_TIME_MS` (if needed for longer battles)

### "No active personas found"

**Solutions**:
- Generate personas: `npm run sandbox:generate-personas`
- Check `is_active=true` in `sandbox_personas` table
- Verify Supabase connection

### "Kill-switch activated"

**Cause**: Batch cost exceeded $5.00 threshold

**Solutions**:
- Reduce batch size
- Check individual battle costs
- Review budget monitor logs

### "Connection refused" (Local)

**Cause**: Dev server not running

**Solution**: Start dev server first
```bash
npm run dev
```

---

## Best Practices

1. **Start Small**: Begin with `TRAINING_BATCH_SIZE=3` and increase gradually
2. **Monitor Costs**: Track OpenAI API usage in logs
3. **Respect Rate Limits**: Adjust concurrency based on your OpenAI tier
4. **Use Kill-Switch**: Keep $5.00 threshold for safety
5. **Review Breakthroughs**: Check dashboard regularly for high-scoring battles
6. **Test Locally First**: Use `npm run train:trigger` before deploying changes

---

## Summary

| Method | Use Case | Command |
|--------|----------|---------|
| **Automated Scheduler** | Production scheduling | Configured in Heroku Scheduler |
| **Manual API** | On-demand production trigger | `curl -X POST ...` |
| **Local Script** | Development testing | `npm run train:trigger` |
| **Ignition** | Initial setup | `npm run ignite` |
| **Direct Script** | Advanced debugging | `npm run sandbox:battle` |

All methods ultimately call the same training endpoint (`/api/cron/train`) which executes autonomous battles using the `autonomousBattle.ts` script with proper concurrency control, budget monitoring, and breakthrough detection.
