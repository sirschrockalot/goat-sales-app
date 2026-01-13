# Local Training Guide

Complete guide for running training battles directly from your local terminal against the sandbox database. This avoids timeout issues and gives you full control.

## Quick Start

```bash
# Run training with default batch size (5 battles)
npm run train:direct

# Run training with custom batch size
npm run train:direct 3

# Or use the script directly
npx tsx scripts/run-training-direct.ts 2
```

## Prerequisites

1. **Environment Variables**: Make sure your `.env.local` has:
   ```bash
   EXPLICIT_ENV=sandbox
   NEXT_PUBLIC_SUPABASE_URL=your-sandbox-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   # Or use sandbox-specific keys:
   SANDBOX_OPENAI_API_KEY=your-openai-key
   ```

2. **Active Personas**: Ensure you have active personas in the `sandbox_personas` table

## Available Methods

### Method 1: Direct Training Script (Recommended)

**Script**: `scripts/run-training-direct.ts`

**Usage**:
```bash
npm run train:direct [batchSize]
```

**Features**:
- ✅ Runs directly from terminal (no API, no timeout)
- ✅ Connects to sandbox database
- ✅ Shows real-time progress
- ✅ Displays detailed results
- ✅ No Heroku timeout issues

**Example**:
```bash
# Run 3 battles
npm run train:direct 3
```

**Output**:
```
🚀 Running Training Directly (Local Terminal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Initial State
─────────────────────────────────────────────────────
   Daily Cap: $15.00
   Today's Spend: $3.12
   Remaining: $11.88
   Throttled: ✅ YES
   Exceeded: ✅ NO
   Active Personas: 20
   Batch Size: 3

🚀 Starting Training
─────────────────────────────────────────────────────
   Running 3 battle(s)...
   This will run until completion (no timeout)

📊 Training Results
─────────────────────────────────────────────────────
   Duration: 2m 15s
   Battles Completed: 3
   Total Cost: $0.0123
   Average Cost per Battle: $0.0041
   Average Score: 78.5/100
   
   Battle Details:
      1. Score: 82/100 | Cost: $0.0042
      2. Score: 75/100 | Cost: $0.0039
      3. Score: 79/100 | Cost: $0.0042

   ✅ SUCCESS! Training completed and battles were created!
```

### Method 2: Autonomous Battle Script

**Script**: `scripts/autonomousBattle.ts`

**Usage**:
```bash
npm run sandbox:battle [personaId1] [personaId2] ...
```

**Features**:
- ✅ Can run specific personas by ID
- ✅ Or runs random active personas if no IDs provided
- ✅ Direct execution (no API)

**Example**:
```bash
# Run battles against random personas
npm run sandbox:battle

# Run battles against specific personas
npm run sandbox:battle <persona-id-1> <persona-id-2>
```

### Method 3: Ignition Script (First 5 Battles)

**Script**: `scripts/ignite-training.ts`

**Usage**:
```bash
npm run ignite
```

**Features**:
- ✅ Runs first 5 battles to initialize training
- ✅ Includes Vocal Soul Auditor grading
- ✅ Good for initial setup

## Comparison

| Method | Use Case | Timeout | API Required |
|--------|----------|---------|--------------|
| `train:direct` | General training | ❌ No | ❌ No |
| `sandbox:battle` | Specific personas | ❌ No | ❌ No |
| `ignite` | Initial setup | ❌ No | ❌ No |
| `train:trigger` | Via local API | ⚠️ 30s | ✅ Yes |

## Environment Configuration

The scripts automatically use the sandbox environment when `EXPLICIT_ENV=sandbox` is set. They will:

1. Connect to sandbox Supabase database
2. Use sandbox OpenAI API key (or fallback to main key)
3. Respect budget limits and kill-switch
4. Save battles to `sandbox_battles` table

## Troubleshooting

### "Missing OpenAI API Key"
**Solution**: Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-...
# Or sandbox-specific:
SANDBOX_OPENAI_API_KEY=sk-...
```

### "No active personas found"
**Solution**: Create or activate personas:
```bash
# Check personas
npx tsx scripts/check-training-data.ts

# Generate personas if needed
npm run sandbox:generate-personas
```

### "Environment configuration errors"
**Solution**: Ensure `EXPLICIT_ENV=sandbox` is set:
```bash
export EXPLICIT_ENV=sandbox
npm run train:direct
```

## Best Practices

1. **Start Small**: Begin with 1-2 battles to test
2. **Monitor Budget**: Check budget status before running large batches
3. **Watch Logs**: Training logs will show in your terminal
4. **Check Results**: Battles are saved to `sandbox_battles` table immediately

## Example Workflow

```bash
# 1. Check current status
npx tsx scripts/check-training-status.ts

# 2. Run a small test (1 battle)
npm run train:direct 1

# 3. Check results
npx tsx scripts/check-training-data.ts

# 4. If successful, run larger batch
npm run train:direct 5
```

## Summary

**Recommended**: Use `npm run train:direct [batchSize]` for running training from your local terminal. It:
- ✅ Runs directly (no API, no timeout)
- ✅ Connects to sandbox database
- ✅ Shows real-time progress
- ✅ No Heroku timeout issues
- ✅ Perfect for testing and development
