# Training Log Monitoring Guide

Complete guide for monitoring AI model training logs and battle progress.

## Quick Start

```bash
# Real-time training logs
heroku logs --tail -a goat-sales-app | grep -i "training\|battle\|persona"

# Filter for specific events
heroku logs --tail -a goat-sales-app | grep -E "Starting|complete|error|Battle"
```

## Methods to Monitor Training

### 1. Heroku Logs (Real-Time)

#### View All Logs
```bash
heroku logs --tail -a goat-sales-app
```

#### Filter for Training Events
```bash
# Training-specific logs
heroku logs --tail -a goat-sales-app | grep -i "training"

# Battle progress
heroku logs --tail -a goat-sales-app | grep -i "battle"

# Persona-related
heroku logs --tail -a goat-sales-app | grep -i "persona"

# Errors only
heroku logs --tail -a goat-sales-app | grep -i "error"

# Combined filter (training + battles + errors)
heroku logs --tail -a goat-sales-app | grep -E "training|battle|error|persona" -i
```

#### View Recent Logs (Last 100 lines)
```bash
heroku logs --num 100 -a goat-sales-app | grep -i "training\|battle"
```

#### Save Logs to File
```bash
heroku logs --tail -a goat-sales-app > training-logs.txt
```

### 2. Key Log Messages to Watch For

#### Training Batch Started
```
Starting training batch { batchId: "...", batchSize: 1 }
```

#### Battle Started
```
Starting autonomous battle { persona: "The Skeptic" }
```

#### Turn Progress
```
Turn 1 complete { speaker: "CLOSER", tokens: 245, cost: 0.0001, totalCost: 0.0001 }
Turn 2 complete { speaker: "PERSONA", tokens: 189, cost: 0.0001, totalCost: 0.0002 }
...
```

#### Battle Complete
```
Battle complete, getting referee score...
Battle saved { battleId: "...", score: 75, cost: 0.0012 }
```

#### Training Batch Complete
```
Training batch complete { 
  batchId: "...", 
  battlesCompleted: 1, 
  totalCost: 0.0012, 
  averageScore: 75, 
  executionTimeMs: 45000 
}
```

#### Errors to Watch For
```
Error in battle turn { turn: 5, error: "..." }
Error in training batch { batchId: "...", error: "..." }
Kill-switch activated { cost: 5.01, threshold: 5.0 }
Budget throttling active - using GPT-4o-Mini only
```

### 3. Database Monitoring (Supabase)

#### Check Recent Battles
```sql
SELECT 
  id,
  persona_id,
  referee_score,
  math_defense_score,
  humanity_score,
  success_score,
  cost_usd,
  turns,
  created_at,
  ended_at
FROM sandbox_battles
ORDER BY created_at DESC
LIMIT 10;
```

#### Check Battle Details with Persona Info
```sql
SELECT 
  b.id,
  b.referee_score,
  b.cost_usd,
  b.turns,
  b.created_at,
  p.name as persona_name,
  p.persona_type
FROM sandbox_battles b
JOIN sandbox_personas p ON b.persona_id = p.id
ORDER BY b.created_at DESC
LIMIT 10;
```

#### Monitor Training Progress
```sql
-- Battles completed today
SELECT 
  COUNT(*) as battles_today,
  AVG(referee_score) as avg_score,
  SUM(cost_usd) as total_cost,
  AVG(turns) as avg_turns
FROM sandbox_battles
WHERE created_at >= CURRENT_DATE;
```

#### Check for Errors
```sql
-- Battles that may have failed (no score or very low score)
SELECT 
  id,
  persona_id,
  referee_score,
  referee_feedback,
  created_at
FROM sandbox_battles
WHERE referee_score IS NULL 
   OR referee_score < 20
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Training Monitor Dashboard

Access the web-based dashboard:

```
https://goat-sales-app-82e296b21c05.herokuapp.com/admin/training-monitor
```

This dashboard shows:
- Recent battles
- Battle scores and metrics
- Persona performance
- Cost tracking
- Training analytics

### 5. Cost Monitoring

#### Check Billing Logs
```sql
SELECT 
  provider,
  model,
  cost,
  input_tokens,
  output_tokens,
  metadata->>'battleId' as battle_id,
  created_at
FROM billing_logs
WHERE env = 'sandbox'
  AND metadata->>'battleId' IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

#### Daily Cost Summary
```sql
SELECT 
  DATE(created_at) as date,
  SUM(cost) as daily_cost,
  COUNT(*) as log_entries
FROM billing_logs
WHERE env = 'sandbox'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 6. Monitoring Scripts

#### Create a Monitoring Script

Create `scripts/monitor-training.sh`:

```bash
#!/bin/bash
# Real-time training monitoring

echo "🔍 Monitoring Training Logs..."
echo "Press Ctrl+C to stop"
echo ""

heroku logs --tail -a goat-sales-app | \
  grep --line-buffered -E "training|battle|persona|error|complete|score" -i | \
  while read line; do
    # Color code different event types
    if echo "$line" | grep -qi "error"; then
      echo -e "\033[31m$line\033[0m"  # Red for errors
    elif echo "$line" | grep -qi "complete|saved"; then
      echo -e "\033[32m$line\033[0m"  # Green for completion
    elif echo "$line" | grep -qi "starting|battle"; then
      echo -e "\033[33m$line\033[0m"  # Yellow for starts
    else
      echo "$line"
    fi
  done
```

Make it executable:
```bash
chmod +x scripts/monitor-training.sh
./scripts/monitor-training.sh
```

### 7. Log Levels and Filtering

The logger uses Winston with these levels:
- **error**: Critical failures, kill-switch activations
- **warn**: Budget throttling, API unavailable
- **info**: Standard operations (battles, turns, completion)
- **debug**: Detailed debugging (only in development)

#### Filter by Log Level
```bash
# Errors only
heroku logs --tail -a goat-sales-app | grep -i "error"

# Warnings
heroku logs --tail -a goat-sales-app | grep -i "warn"

# Info messages (most common)
heroku logs --tail -a goat-sales-app | grep -i "info"
```

### 8. Real-Time Battle Progress

To watch a battle in real-time:

```bash
# Start monitoring
heroku logs --tail -a goat-sales-app | \
  grep --line-buffered -E "Turn|battle|persona|score|complete" -i
```

You'll see output like:
```
Starting autonomous battle { persona: "The Skeptic" }
Turn 1 complete { speaker: "CLOSER", tokens: 245, cost: 0.0001 }
Turn 2 complete { speaker: "PERSONA", tokens: 189, cost: 0.0001 }
...
Turn 15 complete { speaker: "PERSONA", tokens: 156, cost: 0.0001 }
Battle complete, getting referee score...
Battle saved { battleId: "abc-123", score: 75, cost: 0.0012 }
```

### 9. Monitoring Training Health

#### Check if Training is Running
```bash
# Look for recent training activity
heroku logs --num 50 -a goat-sales-app | grep -i "training batch"
```

#### Check for Stuck Battles
```sql
-- Battles that started but never completed (older than 5 minutes)
SELECT 
  id,
  persona_id,
  created_at,
  NOW() - created_at as age
FROM sandbox_battles
WHERE ended_at IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

#### Monitor Kill-Switch Status
```bash
heroku logs --tail -a goat-sales-app | grep -i "kill-switch"
```

### 10. Automated Monitoring Alerts

#### Set Up Log Alerts (Heroku Add-on)

```bash
# Install Papertrail (log aggregation)
heroku addons:create papertrail:choklad -a goat-sales-app

# Or use Logentries
heroku addons:create logentries:le_tryit -a goat-sales-app
```

#### Monitor via Slack (if configured)

If `SLACK_WEBHOOK_URL` is set, you'll receive:
- Kill-switch activations
- Training batch completions
- High-cost alerts

### 11. Performance Metrics

#### Average Battle Duration
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (ended_at - created_at))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (ended_at - created_at))) as min_duration,
  MAX(EXTRACT(EPOCH FROM (ended_at - created_at))) as max_duration
FROM sandbox_battles
WHERE ended_at IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '1 day';
```

#### Token Usage Trends
```sql
SELECT 
  DATE(created_at) as date,
  AVG(token_usage) as avg_tokens,
  SUM(token_usage) as total_tokens
FROM sandbox_battles
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 12. Troubleshooting Common Issues

#### No Logs Appearing
```bash
# Check if app is running
heroku ps -a goat-sales-app

# Restart if needed
heroku ps:restart -a goat-sales-app
```

#### Logs Too Verbose
```bash
# Filter to only important events
heroku logs --tail -a goat-sales-app | \
  grep -E "Starting|complete|error|saved|score" -i
```

#### Missing Battle Logs
```sql
-- Check if battles are being created
SELECT COUNT(*) FROM sandbox_battles WHERE created_at >= CURRENT_DATE;

-- Check if personas are active
SELECT COUNT(*) FROM sandbox_personas WHERE is_active = true;
```

## Summary

**Best Practices:**
1. ✅ Use `heroku logs --tail` for real-time monitoring
2. ✅ Filter with `grep` for specific events
3. ✅ Check `sandbox_battles` table for battle results
4. ✅ Monitor `billing_logs` for cost tracking
5. ✅ Use Training Monitor dashboard for visual analytics
6. ✅ Set up log aggregation service for long-term storage

**Key Log Patterns:**
- `Starting training batch` - Batch initiated
- `Starting autonomous battle` - Battle started
- `Turn X complete` - Turn progress
- `Battle saved` - Battle completed successfully
- `Error in battle` - Battle failed
- `Kill-switch activated` - Budget exceeded

**Quick Commands:**
```bash
# Real-time training monitor
heroku logs --tail -a goat-sales-app | grep -E "training|battle" -i

# Recent battles
heroku logs --num 100 -a goat-sales-app | grep "Battle saved"

# Errors only
heroku logs --tail -a goat-sales-app | grep -i "error"
```
