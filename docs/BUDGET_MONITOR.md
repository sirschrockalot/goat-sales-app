# Budget Monitor Service

Multi-provider budget monitoring system to prevent overspending during autonomous training.

## Overview

The Budget Monitor tracks real-time costs for:
- **OpenAI**: GPT-4o-Mini and GPT-4o token usage
- **Vapi**: Voice calls with telephony and TTS
- **ElevenLabs**: Turbo v2.5 voice synthesis

**Daily Hard Cap**: $15.00 USD per day for training operations.

---

## Features

### 1. Daily Hard Cap

- **Limit**: $15.00 USD per day
- **Tracking**: Sums all costs from `billing_logs` table with `env='sandbox'`
- **Reset**: Daily at midnight UTC

### 2. Kill Switch

**Function**: `checkBudget()`

- Checks budget before every simulation starts
- Throws error if limit exceeded: `"Budget Limit Reached. Training Paused."`
- Sends urgent Slack alert with budget details
- Prevents any new battles from starting

### 3. Token-Aware Throttling

**Threshold**: 20% of daily cap ($3.00)

When within 20% of limit:
- **Forces GPT-4o-Mini only** (even for referee)
- **Disables Vocal Soul Auditor** to save credits
- Logs throttling status

### 4. Cost Logging

Every simulation records costs to `billing_logs` table:
- Provider (openai, vapi, elevenlabs)
- Model name
- Input/output tokens (for OpenAI)
- Duration minutes (for Vapi/ElevenLabs)
- Cost in USD
- Metadata (battleId, personaId, sessionId, etc.)
- Environment tag: `env='sandbox'`

---

## Cost Rates (2026 Pricing)

### OpenAI

**GPT-4o-Mini:**
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**GPT-4o:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

### Vapi

- $0.18 per minute (includes telephony and TTS)

### ElevenLabs

- $0.07 per minute (Turbo v2.5)

---

## Usage

### Check Budget Before Battle

```typescript
import { checkBudget } from '@/lib/budgetMonitor';

// Before starting a battle
await checkBudget(); // Throws error if limit exceeded
```

### Log Costs

```typescript
import { logCost, calculateOpenAICost } from '@/lib/budgetMonitor';

// Calculate cost
const cost = calculateOpenAICost('gpt-4o-mini', inputTokens, outputTokens);

// Log to database
await logCost(
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputTokens: 1000,
    outputTokens: 500,
    cost: 0.0003,
  },
  {
    battleId: 'battle-123',
    personaId: 'persona-456',
  }
);
```

### Check Throttling Status

```typescript
import { shouldThrottle } from '@/lib/budgetMonitor';

const isThrottled = await shouldThrottle();
if (isThrottled) {
  // Use GPT-4o-Mini only
  // Disable Vocal Soul Auditor
}
```

### Get Budget Summary

```typescript
import { getBudgetSummary } from '@/lib/budgetMonitor';

const summary = await getBudgetSummary();
// Returns:
// {
//   todaySpend: 12.50,
//   dailyCap: 15.00,
//   remaining: 2.50,
//   percentageUsed: 83.3,
//   isThrottled: true,
//   isExceeded: false,
//   breakdown: {
//     openai: 10.00,
//     vapi: 1.50,
//     elevenlabs: 1.00,
//   },
// }
```

---

## Integration

### Autonomous Battle Script

The budget monitor is integrated into `scripts/autonomousBattle.ts`:

1. **Before Battle**: Calls `checkBudget()` - throws error if limit exceeded
2. **During Battle**: Logs cost for each turn
3. **After Battle**: Logs referee cost
4. **Throttling**: Checks `shouldThrottle()` to determine model and auditor usage

### API Endpoint

**GET `/api/sandbox/budget-status`**

Returns current budget status for dashboard:
- Today's spend
- Daily cap
- Remaining budget
- Percentage used
- Throttling status
- Cost breakdown by provider

---

## Database Schema

### billing_logs Table

```sql
CREATE TABLE billing_logs (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'vapi', 'elevenlabs'
  model TEXT, -- e.g., 'gpt-4o-mini', 'gpt-4o'
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_minutes NUMERIC(10, 2),
  cost NUMERIC(10, 4) NOT NULL,
  env TEXT NOT NULL DEFAULT 'sandbox',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `(env, created_at DESC)` - For daily spend queries
- `(provider)` - For provider breakdown
- `(env, DATE(created_at))` - For date-based queries

---

## Slack Alerts

### Budget Limit Reached

When daily cap is exceeded:

```
🚨 BUDGET LIMIT REACHED

Daily Spend: $15.00
Daily Cap: $15.00
Percentage Used: 100.0%
Status: Training Paused

Training has been automatically paused to prevent overspending.
Review budget and adjust daily cap if needed.
```

---

## Throttling Behavior

### When Throttled (≥ $3.00 spent)

1. **Referee Model**: Switches from GPT-4o to GPT-4o-Mini
2. **Vocal Soul Auditor**: Disabled (skipped)
3. **Logging**: All costs still logged
4. **Warnings**: Logged but training continues

### Example Flow

```
Budget Status: $3.50 / $15.00 (23.3%)
↓
Throttling Active: true
↓
Referee uses GPT-4o-Mini (instead of GPT-4o)
Vocal Soul Auditor: Skipped
↓
Cost saved: ~$0.05 per battle (referee) + ~$0.02 per audit
```

---

## Best Practices

1. **Monitor Daily**: Check budget status regularly
2. **Adjust Cap**: Increase `DAILY_TRAINING_CAP` if needed
3. **Review Logs**: Check `billing_logs` for cost breakdown
4. **Throttling**: Understand throttling behavior at 20% threshold
5. **Slack Alerts**: Ensure `SLACK_WEBHOOK_URL` is configured

---

## Configuration

### Environment Variables

```bash
# Required
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional (for custom limits)
DAILY_TRAINING_CAP=15.00  # Default: 15.00
```

### Code Configuration

```typescript
// src/lib/budgetMonitor.ts
export const DAILY_TRAINING_CAP = 15.0; // USD
const THROTTLING_THRESHOLD = DAILY_TRAINING_CAP * 0.2; // $3.00
```

---

## Troubleshooting

### "Budget Limit Reached" Error

**Cause**: Daily spend exceeded $15.00

**Solution**:
1. Check `billing_logs` for today's costs
2. Wait until midnight UTC (daily reset)
3. Increase `DAILY_TRAINING_CAP` if needed
4. Review cost breakdown to identify high spenders

### Throttling Not Working

**Check**:
1. `shouldThrottle()` returns `true` when spend ≥ $3.00
2. Referee model switches to GPT-4o-Mini
3. Vocal Soul Auditor is skipped

**Debug**:
```typescript
const status = await getBudgetStatus();
console.log('Throttled:', status.isThrottled);
console.log('Daily Spend:', status.dailySpend);
```

### Costs Not Logging

**Check**:
1. `billing_logs` table exists
2. `supabaseAdmin` client is available
3. `logCost()` is called after each operation
4. Check logs for errors

---

## Summary

The Budget Monitor provides:
- ✅ **Daily Hard Cap**: $15.00 limit per day
- ✅ **Kill Switch**: Stops training if limit exceeded
- ✅ **Token-Aware Throttling**: Saves costs at 20% threshold
- ✅ **Cost Logging**: Detailed tracking in `billing_logs`
- ✅ **Multi-Provider**: OpenAI, Vapi, ElevenLabs
- ✅ **Slack Alerts**: Urgent notifications on limit reached

All training costs are tracked and logged, with automatic throttling and kill-switch protection to prevent overspending.
