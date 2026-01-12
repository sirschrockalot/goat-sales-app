# Seed Execution Instructions

## ✅ Migrations Complete!

The training tables have been created successfully:
- ✅ `training_personas` table created
- ✅ `golden_calls` table created  
- ✅ `market_benchmarks` table created

## 🌱 Next Step: Execute Seed SQL

### Option 1: Supabase Dashboard SQL Editor (RECOMMENDED)

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new
   ```

2. **Copy the seed SQL**:
   ```bash
   # View the SQL file
   cat supabase/seed.sql
   
   # Or run:
   npm run seed:instructions
   ```

3. **Paste and Execute**:
   - Paste the entire contents of `supabase/seed.sql` into the SQL Editor
   - Click the **"Run"** button
   - Wait for execution to complete

4. **Verify**:
   ```bash
   npm run seed:verify
   ```

### Option 2: Supabase CLI (if you have service_role key)

```bash
# Set service role key
export SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Execute seed
npm run seed:sandbox
```

## 📊 Expected Results

After executing seed.sql, you should have:
- ✅ **15 Principal Partner personas** in `training_personas`
- ✅ **1 Golden Call transcript** in `golden_calls`
- ✅ **5 Market benchmarks** in `market_benchmarks`

## 🔍 Verification

After seeding, run:
```bash
npm run seed:verify
```

Expected output:
```
📊 Training Personas: 15 found
✅ All 15 Principal Partner personas found!
📊 Golden Calls: 1 found
📊 Market Benchmarks: 5 found
✅ Seed verification complete! All data loaded.
```

## 🚀 Next Steps

Once seeding is complete:
1. ✅ Verify: `npm run seed:verify`
2. ✅ Run ignition: `npm run ignite` (starts first 5 battles)
