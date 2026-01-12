# Sandbox Seeding Status

## Current Status: ⚠️ Credentials Required

The seeding script is **ready to run** but requires Sandbox Supabase credentials to execute.

## Required Setup

### 1. Set Environment Variables

```bash
# Required for seeding
export SUPABASE_SANDBOX_URL=https://your-sandbox-project.supabase.co
export SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for Supabase CLI linking)
export SANDBOX_PROJECT_REF=your-project-ref-id
```

### 2. Get Your Sandbox Project Reference

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your "Goat Sales App" Sandbox project
3. Go to **Settings** → **General**
4. Copy the **Reference ID** (e.g., `abcdefghijklmnop`)

### 3. Get Service Role Key

1. In Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (starts with `eyJ...`)
3. ⚠️ **Keep this secret** - it has full database access

## Running the Script

Once credentials are set:

```bash
# Run the seeding script
npm run seed:sandbox

# Verify the seed
npm run seed:verify
```

## Expected Output (When Successful)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 SANDBOX SEEDING SCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Sandbox Supabase URL: https://your-project.supabase.co
✅ Using project: Goat Sales App-Sandbox

📦 Using Supabase CLI to execute seed...
✅ Project already linked
🌱 Executing seed.sql via Supabase CLI...
✅ Seed executed successfully via CLI

🔍 Verifying seed data...
📊 Training Personas: 15 found
✅ All 15 Principal Partner personas found!

📋 Sample personas:
   1. The Aggressive Attorney (hard)
   2. The Reluctant Heir (hard)
   3. The Burned Landlord (medium)
   4. The Speed-Demon (medium)
   5. The Equity Warrior (medium)
   ... and 10 more

📊 Golden Calls: 1 found
📊 Market Benchmarks: 5 found

✅ Seed verification complete! All data loaded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SANDBOX SEEDING COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 15 Principal Partner personas loaded
✅ Golden call transcript loaded
✅ Market benchmarks loaded

🚀 Sandbox is ready for autonomous training!
```

## Manual Seeding (Alternative)

If automated script doesn't work:

1. **Via Supabase Dashboard**:
   - Go to SQL Editor
   - Copy contents of `supabase/seed.sql`
   - Paste and execute

2. **Via Supabase CLI**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db reset --linked
   ```

## Script Features

✅ **Safety Checks**: Only touches Sandbox, never Production  
✅ **CLI Support**: Uses Supabase CLI if available  
✅ **Fallback Instructions**: Provides manual steps if CLI fails  
✅ **Verification**: Automatically verifies data after seeding  
✅ **Error Handling**: Clear error messages and troubleshooting tips

## Next Steps After Seeding

1. ✅ Verify: `npm run seed:verify`
2. ✅ Configure autonomousBattle.ts (already uses Sandbox via env-manager)
3. ✅ Run ignition: `npm run ignite`
