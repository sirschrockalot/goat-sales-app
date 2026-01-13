# Budget Enforcement Testing Guide

## Overview

Before setting up a training schedule, we need to verify that budget enforcement mechanisms work correctly. This guide covers comprehensive testing of:

1. **Daily Budget Cap** ($15/day)
2. **Kill-Switch Mechanism** (stops training when budget exceeded)
3. **Throttling** (activates at $3.00 - 20% of cap)
4. **Automatic Budget Reset** (midnight UTC)

## Test Scripts

### 1. Budget Enforcement Test

Tests that training stops when budget limits are reached.

```bash
npx tsx scripts/test-budget-enforcement.ts
```

**What it tests:**
- Current budget status
- Budget check function
- Kill-switch status
- Throttling threshold
- Recent billing activity
- Budget exceeded simulation

### 2. Kill-Switch Test

Tests that the kill-switch mechanism works correctly.

```bash
npx tsx scripts/test-kill-switch.ts
```

**What it tests:**
- Kill-switch status check
- Manual activation
- Training blocked when active
- Manual deactivation
- Training allowed when inactive

### 3. Budget Throttling Test

Tests that throttling activates at $3.00 threshold.

```bash
npx tsx scripts/test-budget-throttling.ts
```

**What it tests:**
- Throttling threshold logic
- Model usage (GPT-4o vs GPT-4o-Mini)
- Expected throttling behavior
- Distance to throttle threshold

## Comprehensive Test Plan

### Phase 1: Baseline Testing

**Goal**: Verify current state and mechanisms work

1. **Run Budget Enforcement Test**
   ```bash
   npx tsx scripts/test-budget-enforcement.ts
   ```
   - Check current spend
   - Verify budget status API works
   - Confirm kill-switch status

2. **Run Kill-Switch Test**
   ```bash
   npx tsx scripts/test-kill-switch.ts
   ```
   - Verify manual activation works
   - Confirm training is blocked
   - Verify deactivation works

3. **Run Throttling Test**
   ```bash
   npx scripts/test-budget-throttling.ts
   ```
   - Check current throttling status
   - Verify model usage patterns
   - Confirm threshold logic

### Phase 2: Budget Limit Testing

**Goal**: Verify training stops at $15.00 daily cap

#### Test 2.1: Approach Budget Limit

1. **Check current spend:**
   ```bash
   npx tsx scripts/test-budget-enforcement.ts
   ```

2. **Calculate remaining budget:**
   - If spend < $12.00: Safe to test
   - If spend ≥ $12.00: Wait for reset or manually adjust

3. **Run small training batch:**
   ```bash
   npx tsx scripts/test-training-heroku.ts 1
   ```

4. **Monitor spend:**
   ```bash
   heroku logs --tail -a goat-sales-app | grep -i "cost\|budget\|spend"
   ```

#### Test 2.2: Exceed Budget Limit

**⚠️ WARNING**: This will consume budget. Only test if you can afford it.

1. **Manually set budget to low value** (for testing):
   - Temporarily modify `DAILY_TRAINING_CAP` in code
   - Or add test entries to `billing_logs` to simulate high spend

2. **Try to trigger training:**
   ```bash
   npx tsx scripts/test-training-heroku.ts 1
   ```

3. **Verify training is rejected:**
   - Should get error: "Budget Limit Reached. Training Paused."
   - Check logs for budget enforcement messages

4. **Verify kill-switch activates:**
   ```bash
   curl https://goat-sales-app-82e296b21c05.herokuapp.com/api/sandbox/kill-switch
   ```

### Phase 3: Throttling Testing

**Goal**: Verify throttling works at $3.00 threshold

#### Test 3.1: Before Throttling (< $3.00)

1. **Check current spend:**
   ```bash
   npx tsx scripts/test-budget-throttling.ts
   ```

2. **If spend < $3.00:**
   - Run a training batch
   - Check billing logs for model usage
   - Verify GPT-4o is used for referee

#### Test 3.2: After Throttling (≥ $3.00)

1. **Check if already throttled:**
   ```bash
   npx tsx scripts/test-budget-throttling.ts
   ```

2. **If throttled:**
   - Run a training batch
   - Check billing logs
   - Verify GPT-4o-Mini is used (not GPT-4o)
   - Verify Vocal Soul Auditor is skipped

### Phase 4: Budget Reset Testing

**Goal**: Verify budget resets at midnight UTC

1. **Check current spend before midnight:**
   ```bash
   npx tsx scripts/test-budget-enforcement.ts
   ```

2. **Wait until after midnight UTC**

3. **Check spend after midnight:**
   ```bash
   npx tsx scripts/test-budget-enforcement.ts
   ```

4. **Verify:**
   - Today's spend should be $0.00 (or very low)
   - Budget should be fully available
   - Throttling should be inactive

## Manual Testing Steps

### Test 1: Verify Budget Check in Code

1. **Check `checkBudget()` function:**
   - Located in `src/lib/budgetMonitor.ts`
   - Should throw error if daily spend ≥ $15.00
   - Should check `billing_logs` table

2. **Verify it's called before training:**
   - Check `src/lib/training.ts`
   - Should call `checkBudget()` before each battle
   - Should stop battle loop if budget exceeded

### Test 2: Verify Kill-Switch API

1. **Check kill-switch endpoint:**
   ```bash
   curl https://goat-sales-app-82e296b21c05.herokuapp.com/api/sandbox/kill-switch
   ```

2. **Activate kill-switch:**
   ```bash
   curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/sandbox/kill-switch \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"active": true, "reason": "Test"}'
   ```

3. **Try training:**
   ```bash
   npx tsx scripts/test-training-heroku.ts 1
   ```
   - Should be blocked

4. **Deactivate kill-switch:**
   ```bash
   curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/sandbox/kill-switch \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"active": false, "reason": "Test complete"}'
   ```

### Test 3: Monitor Real Training Run

1. **Start monitoring logs:**
   ```bash
   heroku logs --tail -a goat-sales-app | grep -E "budget|cost|throttle|kill-switch" -i
   ```

2. **Run training:**
   ```bash
   npx tsx scripts/test-training-heroku.ts 3
   ```

3. **Watch for:**
   - Budget checks before each battle
   - Cost logging after each turn
   - Throttling activation if spend ≥ $3.00
   - Kill-switch activation if spend ≥ $15.00

## Expected Behaviors

### When Budget < $3.00 (Not Throttled)
- ✅ Training allowed
- ✅ GPT-4o used for referee
- ✅ Vocal Soul Auditor enabled
- ✅ Full quality scoring

### When Budget ≥ $3.00 but < $15.00 (Throttled)
- ✅ Training allowed
- ✅ GPT-4o-Mini used for referee
- ❌ Vocal Soul Auditor disabled
- ⚠️ Lower quality scoring (but functional)

### When Budget ≥ $15.00 (Exceeded)
- ❌ Training REJECTED
- 🚨 Kill-switch activated
- 🛑 Error: "Budget Limit Reached. Training Paused."
- ⏰ Training resumes at midnight UTC (budget reset)

## Database Queries for Verification

### Check Today's Spend
```sql
SELECT 
  SUM(cost) as today_spend,
  COUNT(*) as log_count
FROM billing_logs
WHERE env = 'sandbox'
  AND created_at >= CURRENT_DATE;
```

### Check Model Usage
```sql
SELECT 
  model,
  COUNT(*) as usage_count,
  SUM(cost) as total_cost
FROM billing_logs
WHERE env = 'sandbox'
  AND provider = 'openai'
  AND created_at >= CURRENT_DATE
GROUP BY model;
```

### Check Recent Battles
```sql
SELECT 
  id,
  referee_score,
  cost_usd,
  created_at
FROM sandbox_battles
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Budget Not Enforcing

**Symptoms:**
- Training continues after $15.00 spent
- No error messages

**Check:**
1. `checkBudget()` is being called
2. `billing_logs` table is being updated
3. Daily cap calculation is correct
4. Timezone is UTC (for daily reset)

### Issue: Throttling Not Working

**Symptoms:**
- GPT-4o still used after $3.00 spent
- Vocal Soul Auditor still running

**Check:**
1. `shouldThrottle()` function
2. Throttling threshold calculation
3. Model selection logic in training code

### Issue: Kill-Switch Not Activating

**Symptoms:**
- Training continues when budget exceeded
- No kill-switch status change

**Check:**
1. Kill-switch API endpoint
2. `checkKillSwitchAPI()` function
3. Kill-switch database table/state

## Test Results Checklist

Before setting up training schedule, verify:

- [ ] Budget status API works correctly
- [ ] Daily spend calculation is accurate
- [ ] Training stops when budget exceeded
- [ ] Kill-switch activates automatically
- [ ] Kill-switch can be manually activated/deactivated
- [ ] Throttling activates at $3.00
- [ ] GPT-4o-Mini used when throttled
- [ ] GPT-4o used when not throttled
- [ ] Vocal Soul Auditor disabled when throttled
- [ ] Budget resets at midnight UTC
- [ ] Billing logs are accurate
- [ ] Cost tracking is working

## Next Steps After Testing

Once all tests pass:

1. **Document any issues found**
2. **Fix any bugs discovered**
3. **Re-test after fixes**
4. **Then proceed with training schedule setup**

## Running All Tests

```bash
# Run all budget tests
echo "=== Budget Enforcement Test ==="
npx tsx scripts/test-budget-enforcement.ts

echo "\n=== Kill-Switch Test ==="
npx tsx scripts/test-kill-switch.ts

echo "\n=== Budget Throttling Test ==="
npx tsx scripts/test-budget-throttling.ts
```

Or create a combined test script:

```bash
#!/bin/bash
# scripts/run-all-budget-tests.sh

echo "🧪 Running All Budget Enforcement Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Budget Enforcement Test"
npx tsx scripts/test-budget-enforcement.ts

echo ""
echo "2. Kill-Switch Test"
npx tsx scripts/test-kill-switch.ts

echo ""
echo "3. Budget Throttling Test"
npx tsx scripts/test-budget-throttling.ts

echo ""
echo "✅ All tests complete!"
```
