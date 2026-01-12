# Cloud-Based Autonomous Training

Cloud-based architecture for running autonomous training scripts on Vercel with Supabase.

## Overview

The training system has been migrated from local execution to a cloud-based architecture using:
- **Vercel Cron Jobs**: Scheduled execution of training batches
- **Supabase**: Database for sandbox personas and battles
- **Concurrency Control**: Batch size limits to prevent rate limits and timeouts
- **Tactical Scout Integration**: Automatic notification when batches complete

---

## Architecture

### Components

1. **Vercel Cron Endpoint** (`/api/cron/train`)
   - Triggers autonomous battle loop
   - Handles authentication via `CRON_SECRET`
   - Supports batch size configuration
   - Timeout protection (50s default)

2. **Configuration** (`src/lib/config.ts`)
   - Environment-based database switching
   - Training batch size configuration
   - Cloud environment detection

3. **Concurrency Control** (`scripts/autonomousBattle.ts`)
   - Batch processing with configurable concurrency
   - Rate limit protection
   - Kill-switch integration

4. **Tactical Scout Webhook**
   - Automatic notification on batch completion
   - Triggers breakthrough scan
   - Slack alerts for new breakthroughs

---

## Environment Variables

### Required

```bash
# Supabase Configuration
SUPABASE_SANDBOX_URL=https://your-sandbox-project.supabase.co
SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SANDBOX_SUPABASE_ANON_KEY=your_anon_key

# OpenAI
SANDBOX_OPENAI_API_KEY=your_openai_key

# Cron Authentication
CRON_SECRET=your_random_secret_string

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Optional

```bash
# Training Configuration
TRAINING_BATCH_SIZE=5              # Default: 5 battles per cron execution
MAX_TRAINING_BATCH_SIZE=10        # Maximum allowed batch size
MAX_TRAINING_EXECUTION_TIME_MS=50000  # Timeout in milliseconds

# Concurrency Control
MAX_CONCURRENT_BATTLES=3           # Max concurrent battles (default: 3)
DELAY_BETWEEN_BATTLES_MS=1000      # Delay between starting battles (default: 1000ms)

# Database (if using local DB)
USE_LOCAL_DB=false                 # Set to true for local PostgreSQL
LOCAL_DB_URL=postgresql://localhost:5432/sandbox

# Slack (for notifications)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/train",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**Schedule**: Runs every 30 minutes (`*/30 * * * *`)

**Custom Schedule Options**:
- Every 15 minutes: `*/15 * * * *`
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 2 AM: `0 2 * * *`

---

## Concurrency Control

### Batch Size Limits

The system enforces batch size limits to prevent:
- OpenAI rate limits
- Vercel execution timeouts
- Excessive costs

**Default Settings**:
- `TRAINING_BATCH_SIZE`: 5 battles per execution
- `MAX_TRAINING_BATCH_SIZE`: 10 battles (hard limit)
- `MAX_CONCURRENT_BATTLES`: 3 concurrent battles
- `DELAY_BETWEEN_BATTLES_MS`: 1000ms delay

### How It Works

1. **Batch Processing**: Personas are processed in batches
2. **Concurrency Limit**: Max 3 battles run simultaneously
3. **Rate Limiting**: 1 second delay between starting battles
4. **Timeout Protection**: 50 second timeout per cron execution

### Adjusting Concurrency

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

## Database Configuration

### Environment-Based Switching

The system automatically switches between:
- **Local DB**: `USE_LOCAL_DB=true` + `LOCAL_DB_URL`
- **Supabase Sandbox**: `SUPABASE_SANDBOX_URL` or `SANDBOX_SUPABASE_URL`

**Priority Order**:
1. `SUPABASE_SANDBOX_URL` (new cloud-friendly name)
2. `SANDBOX_SUPABASE_URL` (legacy)
3. `NEXT_PUBLIC_SUPABASE_URL` (fallback)

### Cloud Deployment

For Vercel deployments, use:
```bash
SUPABASE_SANDBOX_URL=https://your-project.supabase.co
SANDBOX_SUPABASE_SERVICE_ROLE_KEY=eyJ...
SANDBOX_SUPABASE_ANON_KEY=eyJ...
```

---

## Tactical Scout Integration

### Automatic Notification

When a training batch completes:
1. **Breakthrough Scan**: Triggers `/api/cron/scout-scan`
2. **Breakthrough Check**: Fetches pending breakthroughs
3. **Slack Alert**: Sends notification if new breakthroughs found

### Webhook Flow

```
Training Batch Complete
    ↓
Notify Tactical Scout
    ↓
Trigger Breakthrough Scan
    ↓
Check for New Breakthroughs
    ↓
Send Slack Alert (if breakthroughs found)
```

### Manual Trigger

You can also manually trigger a training batch:

```bash
curl -X POST https://your-app.vercel.app/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}'
```

---

## Monitoring

### Logs

Check Vercel logs for:
- Batch execution status
- Battle completion
- Breakthrough detection
- Error messages

### Metrics to Track

- **Battles Completed**: Number of battles per batch
- **Average Score**: Average referee score
- **Total Cost**: Cost per batch
- **Breakthroughs Detected**: New breakthroughs found

### Dashboard

View training progress in:
- `/admin/training-monitor` - Real-time battle feed
- Breakthrough notifications
- Persona performance analytics

---

## Troubleshooting

### "Cron secret not configured"
- Set `CRON_SECRET` in Vercel environment variables
- Use a random secure string (e.g., `openssl rand -hex 32`)

### "Execution timeout"
- Reduce `TRAINING_BATCH_SIZE`
- Reduce `MAX_CONCURRENT_BATTLES`
- Increase `MAX_TRAINING_EXECUTION_TIME_MS` (if on Pro plan)

### "No active personas found"
- Ensure personas are created: `npm run sandbox:generate-personas`
- Check `is_active=true` in `sandbox_personas` table

### "Kill-switch activated"
- Batch cost exceeded $5.00 threshold
- Check individual battle costs
- Reduce batch size if needed

### "Failed to notify Tactical Scout"
- Check `NEXT_PUBLIC_APP_URL` is set correctly
- Verify `/api/cron/scout-scan` endpoint is accessible
- Check network connectivity

---

## Best Practices

1. **Start Small**: Begin with `TRAINING_BATCH_SIZE=3` and increase gradually
2. **Monitor Costs**: Track OpenAI API usage in Vercel logs
3. **Rate Limits**: Respect OpenAI rate limits (varies by tier)
4. **Kill-Switch**: Keep $5.00 threshold for safety
5. **Breakthroughs**: Review breakthroughs regularly in dashboard

---

## Migration from Local

### Before (Local Execution)
```bash
npm run sandbox:battle
```

### After (Cloud Execution)
- Automatic via Vercel Cron (every 30 minutes)
- Manual trigger via API endpoint
- No local script execution needed

### Benefits
- ✅ No local machine required
- ✅ Automatic scheduling
- ✅ Scalable architecture
- ✅ Integrated with Tactical Scout
- ✅ Cost monitoring built-in

---

## Summary

The cloud-based training system provides:
- **Automated Execution**: Vercel Cron runs training every 30 minutes
- **Concurrency Control**: Prevents rate limits and timeouts
- **Environment Flexibility**: Supports local DB or Supabase
- **Breakthrough Detection**: Automatic Tactical Scout integration
- **Cost Safety**: Kill-switch prevents excessive spending

All training now runs in the cloud, automatically detecting breakthroughs and alerting you when elite tactics are found.
