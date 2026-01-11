# Launch Day Smoke Test

Comprehensive end-to-end test script for verifying all integrated systems (Vapi, Supabase, OpenAI, Vercel Crons) are communicating correctly in production.

## 🚀 Quick Start

### Local Testing (Development)
```bash
# Make sure your dev server is running
npm run dev

# In another terminal, run the smoke test
npx tsx scripts/launch-day-smoketest.ts
```

### Production Testing
```bash
# Test against your live Vercel deployment
PRODUCTION_URL=https://your-app.vercel.app npx tsx scripts/launch-day-smoketest.ts
```

Or set the environment variable:
```bash
export PRODUCTION_URL=https://your-app.vercel.app
npx tsx scripts/launch-day-smoketest.ts
```

## 📋 What It Tests

The smoke test performs the following sequence:

### Step 1: Environment Health Check ✅
- Verifies all required environment variables are set
- Checks optional variables (with warnings if missing)
- Validates Supabase, Vapi, OpenAI, and security keys

### Step 2: Admin Authentication & User Invitation ✅
- Finds an admin user in the database
- Invites a test user with `training_path: 'acquisitions'`
- Uses Supabase Admin SDK `inviteUserByEmail`

### Step 3: Database Trigger Verification ✅
- Waits for the profile creation trigger to execute
- Verifies the `profiles` table entry was created
- Confirms `assigned_path` is set to 'acquisitions'

### Step 4: Vapi Call Initiation ✅
- Verifies the Vapi Assistant ID exists and is accessible
- Tests Vapi API connectivity
- Generates a test call ID

### Step 5: Webhook Test with Real Transcript ✅
- Sends a realistic "Logic Gate 1" transcript to `/api/vapi-webhook`
- Verifies `x-vapi-secret` header authentication passes
- Confirms webhook processes the call successfully
- Validates Goat Score is calculated

### Step 6: UI State Verification ✅
- Checks the database for the stored call record
- Verifies `goat_score` is calculated and stored
- Validates Logic Gates are detected and stored
- Confirms Goat Mode state (active if score >= 80)

### Step 7: Cron Verification ✅
- Tests `/api/cron/daily-recap` endpoint
- Verifies `CRON_SECRET` authentication works
- Confirms cron endpoint returns 200 OK

## 📊 Output

The script outputs a **Launch Readiness Report** with:

- ✅ **Green checkmarks** for passed tests
- ❌ **Red X marks** for failed tests
- ⚠️ **Yellow warnings** for optional/partial failures

### Example Output:
```
╔══════════════════════════════════════════════════════════╗
║     🐐 SALES GOAT APP - LAUNCH DAY SMOKE TEST 🐐       ║
╚══════════════════════════════════════════════════════════╝

Step 1: Environment Health Check
────────────────────────────────────────────────────────────
  ✓ NEXT_PUBLIC_SUPABASE_URL: Set (https://...)
  ✓ VAPI_SECRET_KEY: Set (f26b6be1...)
  ...

Test Summary:
  ✓ Passed: 25
  ✗ Failed: 0
  ⚠ Warnings: 2
  Total: 27

Overall Status:
  ✓ READY FOR LAUNCH
  All critical systems are operational.
```

## 🔧 Configuration

### Environment Variables

The script automatically loads from `.env.local` if present. Required variables:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPI_SECRET_KEY`
- `NEXT_PUBLIC_VAPI_API_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

**Optional:**
- `ACQUISITIONS_ASSISTANT_ID` (defaults to `aaf338ae-b74a-43e4-ac48-73dd99817e9f`)
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Cleanup

By default, the script deletes the test user after completion. To disable:

```bash
CLEANUP_TEST_USER=false npx tsx scripts/launch-day-smoketest.ts
```

### Debug Mode

To see detailed test information:

```bash
DEBUG=true npx tsx scripts/launch-day-smoketest.ts
```

## 🐛 Troubleshooting

### "No admin user found"
- Create an admin user in Supabase:
  ```sql
  UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
  ```

### "Profile not found"
- The database trigger may not have executed. Check:
  - Triggers exist: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%user%';`
  - User was invited via Supabase Auth (not manually created)

### "Webhook test failed"
- Verify `VAPI_SECRET_KEY` matches the value in Vapi Dashboard → Webhooks
- Check that `/api/vapi-webhook` is accessible from the internet
- Ensure OpenAI API key has sufficient credits

### "Cron endpoint failed"
- Verify `CRON_SECRET` is set correctly
- Check that the endpoint is accessible: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/daily-recap`

## 📝 Pre-Launch Checklist

Before running the smoke test, ensure:

- [ ] All environment variables are set in Vercel
- [ ] Database migrations have been run
- [ ] At least one admin user exists in `profiles` table
- [ ] Vapi webhook is configured with correct `x-vapi-secret` header
- [ ] Production URL is accessible and deployed
- [ ] OpenAI API key has sufficient credits

## 🎯 Success Criteria

The smoke test is considered **PASSED** if:

1. ✅ All environment variables are present
2. ✅ Admin user invitation succeeds
3. ✅ Database trigger creates profile automatically
4. ✅ Vapi Assistant is accessible
5. ✅ Webhook processes call and calculates Goat Score
6. ✅ Call record is stored in database with Logic Gates
7. ✅ Cron endpoint responds with 200 OK

## 📚 Related Documentation

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Production Audit](./PRODUCTION_AUDIT.md)
- [Webhook Setup](./WEBHOOK_SETUP.md)
