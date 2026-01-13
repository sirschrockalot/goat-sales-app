# AI Model Training Status Guide

## Understanding the Dashboard

The **Manager Dashboard** (`/admin/dashboard`) shows:
- **TrainingReport**: Human user training progress (reps, scores, gauntlet levels)
- **AITrainingCenter**: AI optimizations and voice performance improvements

**These are NOT the same as AI Model Training!**

## AI Model Training (Autonomous Battles)

AI Model Training runs **autonomous battles** between:
- Your AI closer (the system being trained)
- Various seller personas (from `sandbox_personas` table)

This is separate from user training and is used to improve the AI closer's performance.

## Where to View AI Training

### Training Monitor Dashboard
Visit: `https://goat-sales-app-82e296b21c05.herokuapp.com/admin/training-monitor`

This shows:
- Recent autonomous battles
- Battle scores and metrics
- Persona performance analytics
- Cost tracking
- Training progress

### Check Recent Activity

```bash
# Check logs for training activity
heroku logs --tail -a goat-sales-app | grep -i "training\|battle"

# Check recent battles in database
# (Query sandbox_battles table in Supabase)
```

## How Training is Triggered

### 1. Manual Trigger (Recommended for Testing)

```bash
# Get CRON_SECRET from Heroku
heroku config:get CRON_SECRET -a goat-sales-app

# Trigger training manually
curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 1}'
```

Or use the test script:
```bash
npx tsx scripts/test-training-heroku.ts 1
```

### 2. Scheduled Training (Heroku Scheduler)

Heroku Scheduler addon is installed. To configure:

1. Go to Heroku Dashboard → Your App → Resources
2. Find "Heroku Scheduler" addon
3. Click "Open Heroku Scheduler"
4. Add a new job:
   - **Schedule**: `*/30 * * * *` (every 30 minutes) or `0 * * * *` (hourly)
   - **Run Command**: 
     ```bash
     curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/cron/train \
       -H "Authorization: Bearer $(heroku config:get CRON_SECRET -a goat-sales-app)" \
       -H "Content-Type: application/json" \
       -d '{"batchSize": 1}'
     ```

**Note**: The command above won't work directly in Heroku Scheduler. You need to use a script or API call.

### 3. Better Approach: Create a Script

Create `scripts/trigger-training.sh`:
```bash
#!/bin/bash
CRON_SECRET=$(heroku config:get CRON_SECRET -a goat-sales-app)
curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/cron/train \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 1}'
```

Then in Heroku Scheduler, run:
```bash
bash scripts/trigger-training.sh
```

## Check if Training is Running

### 1. Check Logs
```bash
heroku logs --tail -a goat-sales-app | grep -i "Starting training batch\|Training batch complete"
```

### 2. Check Database
Query `sandbox_battles` table in Supabase:
```sql
SELECT 
  id,
  persona_id,
  referee_score,
  cost_usd,
  created_at
FROM sandbox_battles
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Check Training Monitor
Visit: `/admin/training-monitor` - shows real-time battle data

## Current Status

Based on recent logs, **no training batches have run recently**. 

To start training:
1. **Manual trigger** (recommended first): Use the test script or curl command above
2. **Set up scheduler**: Configure Heroku Scheduler to run training automatically

## Troubleshooting

### Training Not Starting
- Check `CRON_SECRET` is set: `heroku config:get CRON_SECRET -a goat-sales-app`
- Check environment: Training only runs in `sandbox` mode
- Check logs for errors: `heroku logs --tail -a goat-sales-app | grep -i error`

### No Battles Showing
- Check if personas exist: Query `sandbox_personas` table
- Check if training was triggered: Look for "Starting training batch" in logs
- Check kill-switch status: Training stops if budget exceeded

### Dashboard Shows Empty
- TrainingReport shows **user training**, not AI training
- AITrainingCenter shows **optimizations**, not battles
- Use `/admin/training-monitor` for **actual AI training battles**
