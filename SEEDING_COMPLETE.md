# ✅ Sandbox Seeding - Final Step

## Status

✅ **Migrations Complete**: All training tables have been created
✅ **Scripts Ready**: Seeding and verification scripts are functional  
✅ **Credentials Configured**: Service role key is set

## ⚠️ Final Step Required: Execute Seed SQL

The seed data needs to be loaded via the Supabase Dashboard SQL Editor.

### Quick Steps:

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new
   ```

2. **Get the SQL**:
   ```bash
   # View the SQL
   cat supabase/seed.sql
   
   # Or use the helper
   npm run seed:instructions
   ```

3. **Execute**:
   - Copy the entire contents of `supabase/seed.sql`
   - Paste into the SQL Editor
   - Click **"Run"**

4. **Verify**:
   ```bash
   npm run seed:verify
   ```

### Expected Results After Seeding:

- ✅ **15 Principal Partner personas** in `training_personas`
- ✅ **1 Golden Call transcript** in `golden_calls`  
- ✅ **5 Market benchmarks** in `market_benchmarks`

### Why Manual Execution?

Supabase's REST API doesn't support arbitrary SQL execution for security reasons. The SQL Editor is the recommended way to execute seed data.

---

**Once seeding is complete, run `npm run seed:verify` to confirm all data is loaded!**
