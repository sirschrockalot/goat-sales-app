# Sandbox Seeding Guide

Complete guide for seeding the Sandbox environment with training data.

## Quick Start

```bash
# Set your Sandbox project reference
export SANDBOX_PROJECT_REF=your-project-ref

# Run the seeding script
npm run seed:sandbox

# Verify the seed
npm run seed:verify
```

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Sandbox Project Reference**
   - Get from Supabase Dashboard → Project Settings → Reference ID
   - Or set `SANDBOX_PROJECT_REF` environment variable

3. **Environment Variables**
   ```bash
   # Required
   SANDBOX_PROJECT_REF=your-project-ref
   SUPABASE_SANDBOX_URL=https://your-sandbox-project.supabase.co
   SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # For OpenAI (used by autonomousBattle.ts)
   SANDBOX_OPENAI_API_KEY=sk-...  # Or OPENAI_API_KEY
   ```

## Seeding Process

The `seed-sandbox.ts` script:

1. ✅ **Safety Check**: Verifies not in production mode
2. ✅ **CLI Check**: Checks if Supabase CLI is installed
3. ✅ **Link Project**: Links CLI to Sandbox project
4. ✅ **Execute Seed**: Runs `supabase/seed.sql` against Sandbox
5. ✅ **Verify Data**: Confirms 15 personas, golden calls, and benchmarks loaded

## What Gets Seeded

- **15 Principal Partner Personas** (training_personas table)
- **1 Golden Call Transcript** (golden_calls table)
- **5 Market Benchmarks** (market_benchmarks table)

## Verification

After seeding, verify with:

```bash
npm run seed:verify
```

Expected output:
```
📊 Training Personas: 15 found
📊 Golden Calls: 1 found
📊 Market Benchmarks: 5 found
✅ Seed verification complete!
```

## Troubleshooting

### "Supabase CLI not found"
- Install: `npm install -g supabase`
- Or script will fallback to direct SQL execution

### "Project already linked"
- This is fine, script will continue

### "Failed to verify personas"
- Check `SUPABASE_SANDBOX_URL` and `SANDBOX_SUPABASE_SERVICE_ROLE_KEY`
- Verify tables exist in Sandbox database

### "Expected 15 personas, found 0"
- Seed may not have executed
- Check Supabase Dashboard → SQL Editor → Run seed.sql manually

## Manual Seeding

If automated script fails:

1. **Via Supabase Dashboard**:
   - Go to SQL Editor
   - Copy contents of `supabase/seed.sql`
   - Paste and execute

2. **Via Supabase CLI**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db reset
   ```

## Safety

- ✅ Script only touches Sandbox (never Production)
- ✅ Requires `EXPLICIT_ENV=sandbox` or `SANDBOX_*` environment variables
- ✅ Production mode blocked unless `FORCE_SANDBOX_SEED=true`

## Next Steps

After seeding:
1. ✅ Verify: `npm run seed:verify`
2. ✅ Configure autonomousBattle.ts (already uses Sandbox via env-manager)
3. ✅ Run ignition: `npm run ignite`
