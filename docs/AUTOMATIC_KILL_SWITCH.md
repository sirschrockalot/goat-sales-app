# Automatic Kill-Switch Activation

## Overview

The kill-switch now **automatically activates** when the daily budget limit ($15.00) is reached. This ensures training stops immediately, even if running during off-hours when no one is monitoring.

## How It Works

### 1. Automatic Activation on Budget Exceeded

When `checkBudget()` detects that daily spend has reached or exceeded $15.00:

1. **Kill-switch is automatically activated** via `setKillSwitchActive(true)`
2. **Error is thrown** to stop current training batch
3. **Slack alert is sent** (if configured)
4. **All subsequent training requests are blocked**

### 2. Training Endpoint Protection

The `/api/cron/train` endpoint now checks kill-switch **before** starting any training:

```typescript
// Check kill-switch before starting training
if (isKillSwitchActive()) {
  return NextResponse.json({
    error: 'Training paused',
    message: 'Kill-switch is active. Training has been automatically paused.',
    killSwitchActive: true,
  }, { status: 503 });
}

// Check budget (also activates kill-switch if exceeded)
await checkBudget();
```

### 3. Training Loop Protection

The `runBattleLoop()` function checks kill-switch at multiple points:

- **Before each battle**: Checks `checkKillSwitchAPI()`
- **After budget check**: If `checkBudget()` throws, training stops
- **After each battle**: Verifies kill-switch hasn't been activated

## Benefits

✅ **Automatic Protection**: No manual intervention needed  
✅ **Works During Off-Hours**: Training stops even at night  
✅ **Prevents Overspending**: Hard stop at $15.00 daily cap  
✅ **Multi-Instance Safe**: Kill-switch state is checked before every batch  
✅ **Immediate Response**: Training stops as soon as limit is reached  

## Kill-Switch States

### Active (Training Blocked)
- Budget exceeded ($15.00+ spent today)
- Manually activated via dashboard
- All training requests return `503 Service Unavailable`

### Inactive (Training Allowed)
- Budget available (< $15.00 spent today)
- Not manually activated
- Training proceeds normally

## Automatic Reset

The kill-switch **does NOT automatically reset** when budget resets at midnight UTC. This is intentional:

- **Budget resets**: Daily at midnight UTC
- **Kill-switch**: Remains active until manually deactivated
- **Reason**: Prevents accidental overspending if budget calculation has issues

### To Resume Training After Budget Reset

1. **Wait for midnight UTC** (budget resets automatically)
2. **Manually deactivate kill-switch** via dashboard:
   - Go to `/admin/training-monitor`
   - Click "Deactivate Kill-Switch" button
3. **Or via API**:
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/sandbox/kill-switch \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action": "deactivate"}'
   ```

## Testing

### Verify Automatic Activation

1. **Check current spend**:
   ```bash
   npx tsx scripts/test-budget-enforcement.ts
   ```

2. **Run training until budget exceeded**:
   ```bash
   # This will automatically activate kill-switch when $15.00 is reached
   npx tsx scripts/test-training-heroku.ts 100
   ```

3. **Verify kill-switch is active**:
   ```bash
   curl https://your-app.herokuapp.com/api/sandbox/kill-switch
   ```

4. **Try to start training** (should be blocked):
   ```bash
   curl -X POST https://your-app.herokuapp.com/api/cron/train \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 1}'
   ```
   
   Expected response:
   ```json
   {
     "error": "Training paused",
     "message": "Kill-switch is active. Training has been automatically paused.",
     "killSwitchActive": true
   }
   ```

## Code Locations

- **Automatic activation**: `src/lib/budgetMonitor.ts` → `checkBudget()`
- **Cron endpoint check**: `src/app/api/cron/train/route.ts`
- **Training loop check**: `src/lib/training.ts` → `runBattleLoop()`
- **Kill-switch utilities**: `src/lib/killSwitchUtils.ts`

## Monitoring

### Check Kill-Switch Status

```bash
# Via API
curl https://your-app.herokuapp.com/api/sandbox/kill-switch

# Via logs
heroku logs --tail -a goat-sales-app | grep -i "kill-switch\|budget limit"
```

### Expected Log Messages

When budget is exceeded:
```
Budget limit reached - kill-switch activated automatically
Training blocked: Budget limit reached
Kill-switch is active. Training has been automatically paused.
```

## Important Notes

⚠️ **Kill-switch does NOT auto-reset**: After budget resets at midnight UTC, you must manually deactivate the kill-switch to resume training.

✅ **Multiple protection layers**: Budget check, kill-switch check, and session cost limits all work together.

✅ **Works across instances**: Kill-switch state is checked before every training batch, preventing parallel runs from exceeding budget.
