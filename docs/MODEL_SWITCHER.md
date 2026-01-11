# Model Switcher - Cost Optimization Engine

Intelligent model selection system that optimizes training costs by automatically switching between GPT-4o (Premium) and GPT-4o-Mini (Budget) based on daily spend and session type.

## Overview

The Model Switcher:
1. **Monitors** daily spend from BillingService
2. **Analyzes** session type (Routine Training vs Apex Battle-Test)
3. **Selects** optimal model (GPT-4o or GPT-4o-Mini)
4. **Logs** selection reason for end-of-day audit
5. **Saves** 94% on token costs for routine training

## Features

### Budget Guardrails

- **80% Threshold ($120/day)**: Forces GPT-4o-Mini when daily spend exceeds 80% of daily cap ($150)
- **Kill Switch ($150/day)**: All assistants deactivated (handled by BillingService)

### Session-Based Optimization

1. **Routine Training**: Always uses GPT-4o-Mini
   - Saves 94% on token costs
   - Sufficient IQ for standard practice sessions
   - Applies to: Gauntlet levels, Role Reversal, Standard Roleplay

2. **Apex Battle-Test**: Uses GPT-4o when under budget
   - Maximum IQ for high-stakes training
   - Elliott/Cline pressure scenarios
   - Only when daily spend < $120

3. **Live Deal**: Uses GPT-4o
   - Critical real-world scenarios
   - Premium model for maximum performance

4. **Default**: Uses GPT-4o-Mini
   - Cost optimization for unknown/unspecified sessions

## Cost Savings

### GPT-4o vs GPT-4o-Mini

- **GPT-4o**: ~$2.50 per 1M input tokens
- **GPT-4o-Mini**: ~$0.15 per 1M input tokens
- **Savings**: 94% cost reduction with Mini

### Example Scenarios

**Scenario 1: Routine Training (100 calls/day)**
- Without Model Switcher: 100 calls × $0.10/min × 5 min = $50/day
- With Model Switcher: 100 calls × $0.006/min × 5 min = $3/day
- **Savings: $47/day (94%)**

**Scenario 2: Mixed Sessions (80 Routine + 20 Battle-Test)**
- Without Model Switcher: $50/day
- With Model Switcher: (80 × $0.006 × 5) + (20 × $0.10 × 5) = $2.40 + $10 = $12.40/day
- **Savings: $37.60/day (75%)**

## Integration

### 1. Model Switcher (`src/lib/modelSwitcher.ts`)

```typescript
import { getOptimalModel, determineSessionType } from '@/lib/modelSwitcher';

// Determine session type
const sessionType = determineSessionType(battleTestMode, apexLevel, gauntletLevel, roleReversal);

// Get optimal model
const modelSelection = await getOptimalModel(sessionType, battleTestMode);
const selectedModel = modelSelection.model; // 'gpt-4o' or 'gpt-4o-mini'
```

### 2. Vapi Assistant Creation (`src/app/api/vapi/create-assistant/route.ts`)

The model switcher is automatically called before creating the assistant:

```typescript
// Model Selection: Optimize costs based on daily spend and session type
const sessionType = determineSessionType(battleTestMode, apexLevel, gauntletLevel, roleReversal);
const modelSelection = await getOptimalModel(sessionType, battleTestMode);

// Override model in assistant creation
model: selectedModel, // Optimized model (GPT-4o or GPT-4o-Mini)
```

### 3. Logging (`calls` table metadata)

Model selection is logged to the `calls` table metadata:

```json
{
  "model_used": "gpt-4o-mini",
  "reason_for_selection": "Routine Training Session: Using Mini to save 94% on token costs",
  "daily_spend_at_selection": 45.23,
  "session_type": "Routine Training"
}
```

## Decision Logic

### Flowchart

```
Start Call
  ↓
Determine Session Type
  ↓
Check Daily Spend
  ↓
├─ Daily Spend ≥ $120?
│  └─ YES → Force GPT-4o-Mini (Budget Guardrail)
│
├─ Session = Routine Training?
│  └─ YES → Use GPT-4o-Mini (94% savings)
│
├─ Session = Apex Battle-Test AND Spend < $120?
│  └─ YES → Use GPT-4o (Maximum IQ)
│
├─ Session = Live Deal?
│  └─ YES → Use GPT-4o (Critical)
│
└─ Default → Use GPT-4o-Mini (Cost Optimization)
```

## Session Type Detection

The system automatically detects session type from call parameters:

- **Apex Battle-Test**: `battleTestMode === true` OR `apexLevel` is set
- **Routine Training**: `gauntletLevel` is set OR `roleReversal === true`
- **Live Deal**: Real-world call (not training)
- **Unknown**: Defaults to Routine Training

## Logging & Audit

### Metadata Fields

All model selections are logged to `calls.metadata`:

- `model_used`: `'gpt-4o'` or `'gpt-4o-mini'`
- `reason_for_selection`: Human-readable explanation
- `daily_spend_at_selection`: Daily spend at time of selection
- `session_type`: Detected session type

### End-of-Day Audit

Query model selections for cost analysis:

```sql
SELECT 
  metadata->>'model_used' as model,
  metadata->>'reason_for_selection' as reason,
  COUNT(*) as call_count,
  AVG((metadata->>'daily_spend_at_selection')::numeric) as avg_daily_spend
FROM calls
WHERE created_at >= CURRENT_DATE
GROUP BY model, reason
ORDER BY call_count DESC;
```

## Configuration

### Budget Thresholds

Thresholds are defined in `modelSwitcher.ts`:

```typescript
const DAILY_BUDGET_CAP = 150; // $150/day kill switch
const BUDGET_GUARDRAIL_THRESHOLD = 120; // $120/day (80% of cap)
```

### Model Options

- **GPT-4o**: `'gpt-4o'` (Premium, maximum IQ)
- **GPT-4o-Mini**: `'gpt-4o-mini'` (Budget, 94% cost savings)

## Usage Examples

### Example 1: Routine Training

```typescript
// User starts a Gauntlet Level 3 session
const sessionType = determineSessionType(false, null, 3, false);
// Returns: 'Routine Training'

const modelSelection = await getOptimalModel('Routine Training');
// Returns: { model: 'gpt-4o-mini', reason: 'Routine Training Session: Using Mini to save 94% on token costs' }
```

### Example 2: Apex Battle-Test (Under Budget)

```typescript
// User starts an Apex Battle-Test (daily spend: $45)
const sessionType = determineSessionType(true, 5, null, false);
// Returns: 'Apex Battle-Test'

const modelSelection = await getOptimalModel('Apex Battle-Test', true);
// Returns: { model: 'gpt-4o', reason: 'Apex Battle-Test: Using Premium GPT-4o for maximum IQ (under budget: $45.00 < $120)' }
```

### Example 3: Budget Guardrail Active

```typescript
// Daily spend has reached $125
const modelSelection = await getOptimalModel('Apex Battle-Test', true);
// Returns: { model: 'gpt-4o-mini', reason: 'Budget Guardrail Active: Daily spend ($125.00) exceeds 80% threshold ($120)' }
```

## Cost Impact

### Before Model Switcher

- All calls use GPT-4o
- Average cost: $0.10/min
- 100 calls/day × 5 min = $50/day
- Monthly: ~$1,500

### After Model Switcher

- Routine Training: GPT-4o-Mini ($0.006/min)
- Apex Battle-Test: GPT-4o ($0.10/min) when under budget
- 80 Routine + 20 Battle-Test = $2.40 + $10 = $12.40/day
- Monthly: ~$372

**Monthly Savings: ~$1,128 (75% reduction)**

## Monitoring

### Billing Dashboard

The Billing Dashboard shows:
- Daily spend (includes model selection impact)
- Cost breakdown by provider
- Top spenders (can filter by model used)

### Audit Queries

```sql
-- Model usage distribution
SELECT 
  metadata->>'model_used' as model,
  COUNT(*) as calls,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM calls
WHERE created_at >= CURRENT_DATE
GROUP BY model;

-- Cost savings analysis
SELECT 
  metadata->>'session_type' as session_type,
  metadata->>'model_used' as model,
  COUNT(*) as calls,
  AVG((metadata->>'daily_spend_at_selection')::numeric) as avg_daily_spend
FROM calls
WHERE created_at >= CURRENT_DATE
GROUP BY session_type, model
ORDER BY calls DESC;
```

## Best Practices

1. **Monitor Daily Spend**: Check Billing Dashboard regularly
2. **Review Model Selections**: Audit logs to ensure optimal selection
3. **Adjust Thresholds**: Modify `BUDGET_GUARDRAIL_THRESHOLD` if needed
4. **Track Savings**: Use audit queries to measure cost reduction

## Troubleshooting

### Issue: All calls using GPT-4o-Mini

**Check:**
- Daily spend may be above $120 threshold
- Session type may be incorrectly detected as "Routine Training"

**Solution:**
- Review `reason_for_selection` in call metadata
- Verify session type detection logic

### Issue: Apex Battle-Test using Mini

**Check:**
- Daily spend may have exceeded $120
- Budget guardrail is active

**Solution:**
- This is expected behavior when budget guardrail is active
- Review daily spend in Billing Dashboard

### Issue: Model selection not logged

**Check:**
- Verify metadata is being saved in webhook
- Check `calls.metadata` column

**Solution:**
- Ensure webhook is receiving metadata from assistant creation
- Verify metadata structure matches expected format

## Future Enhancements

1. **Dynamic Thresholds**: Adjust thresholds based on monthly budget
2. **Performance Tracking**: Compare Mini vs Premium call quality
3. **A/B Testing**: Randomly assign models to measure quality difference
4. **User Preferences**: Allow users to override model selection for premium sessions
