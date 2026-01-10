# Production Deployment Audit

This document provides a comprehensive audit of the Sales Goat App configuration for production deployment.

## ✅ Environment Variables Audit

### Verified Environment Variables

#### VAPI Configuration
- ✅ **VAPI_SECRET_KEY**: Used in:
  - `src/app/api/vapi/create-assistant/route.ts` (line 42)
  - `src/app/api/vapi-webhook/route.ts` (line 42) - Webhook validation
  - `src/app/api/vapi/voice-hint/route.ts` (line 27)
  - `src/lib/vapi-assistant.ts` (lines 25, 129)
- ✅ **NEXT_PUBLIC_VAPI_API_KEY**: Used in:
  - `src/app/api/vapi/client-key/route.ts` (line 17)
  - `src/app/live-call/page.tsx` (line 79)
  - `src/components/VoiceButton.tsx` (line 39)
- ⚠️ **VAPI_ASSISTANT_ID**: **NOT FOUND** - This appears to be optional. The app uses dynamic assistant creation via `/api/vapi/create-assistant` instead of a static assistant ID.

#### Supabase Configuration
- ✅ **SUPABASE_SERVICE_ROLE_KEY**: Used in:
  - `src/lib/supabase.ts` (line 9) - Initialized as `supabaseAdmin`
  - Used in all server-side API routes for admin operations
- ✅ **NEXT_PUBLIC_SUPABASE_URL**: Used in:
  - `src/lib/supabase.ts` (line 8)
  - `src/middleware.ts` (line 10)
  - `src/app/api/calls/[id]/route.ts` (line 58)
  - `src/app/api/audio/signed-url/route.ts` (line 23)
- ✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Used in:
  - `src/lib/supabase.ts` (line 10)
  - `src/middleware.ts` (line 11)

#### OpenAI Configuration
- ✅ **OPENAI_API_KEY**: Used in:
  - `src/lib/grading.ts` (line 9)
  - `src/lib/dispoGrading.ts` (line 9)
  - `src/lib/analyzeDeviation.ts` (line 10)
  - `src/app/api/script/embed/route.ts` (line 11)
  - `src/app/api/script/check/route.ts` (line 11)
  - `src/app/api/rebuttals/embed/route.ts` (line 14)
  - `src/app/api/rebuttals/search/route.ts` (line 15)
  - `src/app/api/live-shadow/route.ts` (line 11)

#### Security Configuration
- ✅ **CRON_SECRET**: Used in:
  - `src/middleware.ts` (line 25) - Cron route protection
  - `src/app/api/cron/daily-recap/route.ts` - Cron job authentication
- ✅ **VAPI_WEBHOOK_SECRET**: Used as fallback in:
  - `src/app/api/vapi-webhook/route.ts` (line 42) - Falls back to `VAPI_SECRET_KEY`

#### Optional Configuration
- ✅ **UPSTASH_REDIS_REST_URL**: Used in:
  - `src/lib/rateLimit.ts` (line 37) - Rate limiting (optional, has fallback)
- ✅ **UPSTASH_REDIS_REST_TOKEN**: Used in:
  - `src/lib/rateLimit.ts` (line 38) - Rate limiting (optional, has fallback)
- ✅ **NEXT_PUBLIC_APP_URL**: Used in:
  - `src/app/api/admin/invite/route.ts` (line 82) - Invitation redirects
  - `src/app/api/admin/resend-invite/route.ts` (line 76) - Invitation redirects
  - `src/app/api/vapi/create-assistant/route.ts` (line 134) - Webhook URL
  - `src/app/api/vapi-webhook/route.ts` (line 301) - XP awarding callback

### Security Check: No Client-Side Leaks
- ✅ **SUPABASE_SERVICE_ROLE_KEY**: Never prefixed with `NEXT_PUBLIC_` ✅
- ✅ **VAPI_SECRET_KEY**: Never prefixed with `NEXT_PUBLIC_` ✅
- ✅ **OPENAI_API_KEY**: Never prefixed with `NEXT_PUBLIC_` ✅
- ✅ **CRON_SECRET**: Never prefixed with `NEXT_PUBLIC_` ✅

## ✅ Database Trigger Verification

### Profile Auto-Provisioning Triggers

**Migration File**: `supabase/migrations/20240101000012_create_profile_trigger.sql`

#### Trigger 1: `on_auth_user_created`
- ✅ **Status**: EXISTS
- **Fires**: AFTER INSERT ON `auth.users`
- **Condition**: `WHEN (NEW.email_confirmed_at IS NOT NULL)`
- **Function**: `handle_new_user()`
- **Action**: Creates profile with:
  - `id`, `email`, `name` (from email if not in metadata)
  - `is_admin: FALSE`
  - `assigned_path` (from `raw_user_meta_data->>'training_path'`)

#### Trigger 2: `on_auth_user_email_confirmed`
- ✅ **Status**: EXISTS
- **Fires**: AFTER UPDATE OF `email_confirmed_at` ON `auth.users`
- **Condition**: `WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)`
- **Function**: `handle_user_email_confirmed()`
- **Action**: Creates or updates profile when email is confirmed

**Verification SQL** (run in Supabase SQL Editor):
```sql
-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_email_confirmed');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'handle_user_email_confirmed');
```

## ✅ Cron Job Configuration

### Vercel.json Configuration

**File**: `vercel.json`

```json
{
  "functions": {
    "src/app/api/vapi-webhook/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/rebuttals/embed/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/calls/[id]/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/cron/daily-recap/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-recap",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- ✅ **Schedule**: `0 8 * * *` = 8:00 AM UTC daily
- ✅ **Path**: `/api/cron/daily-recap`
- ✅ **Max Duration**: 60 seconds (configured)
- ⚠️ **Note**: Schedule is in UTC. Adjust if you need a different timezone.

**To change timezone** (e.g., 8 AM EST):
- EST is UTC-5, so 8 AM EST = 1 PM UTC (13:00)
- Change schedule to: `"0 13 * * *"`

## ✅ Middleware Security Check

### Protected Routes

**File**: `src/middleware.ts`

#### 1. `/admin/*` Routes
- ✅ **Status**: PROTECTED
- **Checks**:
  - Valid Supabase session (via access token)
  - `is_admin: true` in profiles table
- **Action**: Redirects to `/login` if not authenticated, `/` if not admin
- **API Routes**: Returns 401/403 JSON responses

#### 2. `/api/admin/*` Routes
- ✅ **Status**: PROTECTED
- **Checks**: Same as `/admin/*`
- **Action**: Returns 401 Unauthorized or 403 Forbidden JSON responses

#### 3. `/api/cron/*` Routes
- ✅ **Status**: PROTECTED
- **Checks**: `Authorization: Bearer ${CRON_SECRET}` header
- **Action**: Returns 401 if secret doesn't match
- **Note**: Vercel Cron automatically sends this header

#### 4. `/gauntlet` Route
- ⚠️ **Status**: NOT EXPLICITLY PROTECTED IN MIDDLEWARE
- **Current Protection**: Client-side check in `src/app/gauntlet/page.tsx`
- **Recommendation**: Add to middleware matcher for server-side protection

**Current Middleware Matcher**:
```typescript
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/cron/:path*',
    '/api/admin/:path*',
  ],
};
```

**Recommended Update**:
```typescript
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/cron/:path*',
    '/api/admin/:path*',
    '/gauntlet/:path*', // Add gauntlet protection
  ],
};
```

## ✅ Vapi Webhook Validation

### Webhook Security

**File**: `src/app/api/vapi-webhook/route.ts`

#### Header Validation
- ✅ **Status**: IMPLEMENTED
- **Header Name**: `x-vapi-secret`
- **Fallback**: `Authorization: Bearer <secret>`
- **Validation**: Compares against `VAPI_SECRET_KEY` or `VAPI_WEBHOOK_SECRET`
- **Action**: Returns 401 if secret doesn't match
- **Logging**: Logs failed attempts with IP, timestamp, user agent (without exposing secret)

#### Rate Limiting
- ✅ **Status**: IMPLEMENTED
- **Limit**: 100 requests per hour per IP
- **Implementation**: Uses `src/lib/rateLimit.ts` with Upstash Redis

#### Security Features
- ✅ Early validation (before any processing)
- ✅ Detailed logging for security monitoring
- ✅ IP tracking for brute-force detection
- ✅ Warning if secret not configured

## 📋 Production Deployment Checklist

### Environment Variables (Vercel Dashboard)

#### Required (8 variables):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ SECRET
- [ ] `VAPI_SECRET_KEY` ⚠️ SECRET
- [ ] `NEXT_PUBLIC_VAPI_API_KEY`
- [ ] `OPENAI_API_KEY` ⚠️ SECRET
- [ ] `CRON_SECRET` ⚠️ SECRET (generate with `openssl rand -hex 32`)
- [ ] `NEXT_PUBLIC_APP_URL` (e.g., `https://your-domain.vercel.app`)

#### Optional (3 variables):
- [ ] `UPSTASH_REDIS_REST_URL` (for rate limiting)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (for rate limiting)
- [ ] `RESEND_API_KEY` (for email delivery)
- [ ] `EMAIL_FROM` (for email delivery)

### Database Setup

- [ ] Run all migrations in `supabase/migrations/`:
  - `20240101000000_create_calls_table.sql`
  - `20240101000001_add_rebuttal_column.sql`
  - `20240101000002_add_feedback_column.sql`
  - `20240101000003_create_profiles_table.sql`
  - `20240101000004_add_is_verified_to_rebuttals.sql`
  - `20240101000005_create_script_segments.sql`
  - `20240101000006_add_script_adherence_column.sql`
  - `20240101000007_add_gauntlet_to_profiles.sql`
  - `20240101000008_create_badges_table.sql`
  - `20240101000009_add_xp_to_profiles.sql`
  - `20240101000010_create_dispo_script_segments.sql`
  - `20240101000011_create_match_dispo_script_segments_rpc.sql`
  - `20240101000012_create_profile_trigger.sql` ⚠️ **CRITICAL**
  - `20240101000013_add_assigned_path_to_profiles.sql`
  - `20240101000014_add_onboarding_completed_to_profiles.sql`

- [ ] Verify triggers exist:
  ```sql
  SELECT trigger_name FROM information_schema.triggers 
  WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_email_confirmed');
  ```

- [ ] Set up first admin user:
  ```sql
  UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';
  ```

### Vapi Configuration

- [ ] Configure webhook in Vapi Dashboard:
  - URL: `https://your-domain.vercel.app/api/vapi-webhook`
  - Custom Header: `x-vapi-secret` = your `VAPI_SECRET_KEY` value
  - Events: `end-of-call-report`

### Vercel Configuration

- [ ] Verify `vercel.json` is committed to repository
- [ ] Cron job will auto-configure on deployment
- [ ] Verify cron schedule timezone (currently UTC)

### Security Verification

- [ ] Test admin route protection:
  - Try accessing `/admin/dashboard` without auth → should redirect to `/login`
  - Try accessing as non-admin → should redirect to `/`

- [ ] Test cron protection:
  - Try accessing `/api/cron/daily-recap` without secret → should return 401

- [ ] Test webhook validation:
  - Try POST to `/api/vapi-webhook` without `x-vapi-secret` → should return 401
  - Check server logs for security warnings

- [ ] Verify no secrets in client-side code:
  - Search for `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE` → should not exist
  - Search for `NEXT_PUBLIC_VAPI_SECRET` → should not exist
  - Search for `NEXT_PUBLIC_OPENAI` → should not exist

## 🔧 Recommended Improvements

### 1. Add `/gauntlet` to Middleware Protection

**Current**: Client-side only protection
**Recommended**: Add server-side protection

```typescript
// In src/middleware.ts
if (pathname.startsWith('/gauntlet')) {
  // Check authentication (similar to admin check)
  // Redirect to /login if not authenticated
}
```

### 2. Verify Cron Timezone

The cron schedule `0 8 * * *` runs at 8 AM UTC. If you need a different timezone:
- **8 AM EST**: `0 13 * * *` (1 PM UTC)
- **8 AM PST**: `0 16 * * *` (4 PM UTC)

### 3. Add Environment Variable Validation

Consider adding a startup check:

```typescript
// src/lib/env-check.ts
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VAPI_SECRET_KEY',
    'OPENAI_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

## 📊 Summary

### ✅ Passed Checks
- Environment variables correctly referenced
- Database triggers exist and configured
- Cron job configured in vercel.json
- Admin routes protected
- Cron routes protected
- Vapi webhook validation implemented
- No client-side secret leaks

### ⚠️ Recommendations
1. Add `/gauntlet` route to middleware matcher for server-side protection
2. Verify cron timezone matches your needs (currently UTC)
3. Consider adding environment variable validation on startup
4. Test all protected routes after deployment

### 🔒 Security Status
- **Admin Routes**: ✅ Protected
- **Cron Routes**: ✅ Protected
- **Webhook Validation**: ✅ Implemented
- **Rate Limiting**: ✅ Implemented
- **Secret Management**: ✅ No leaks detected

**Ready for Production**: ✅ YES (with recommended improvements)
