# 🚀 Production Deployment Checklist

Quick reference checklist for deploying the Sales Goat App to production.

## ✅ Pre-Deployment Steps

### 1. Environment Variables (Vercel Dashboard)

**Required Variables:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ SECRET - Service role key
- [ ] `VAPI_SECRET_KEY` ⚠️ SECRET - Vapi secret key
- [ ] `NEXT_PUBLIC_VAPI_API_KEY` - Vapi public API key
- [ ] `OPENAI_API_KEY` ⚠️ SECRET - OpenAI API key
- [ ] `ELEVEN_LABS_API_KEY` ⚠️ SECRET - ElevenLabs API key (for Brian/Stella voices)
- [ ] `DEEPGRAM_API_KEY` ⚠️ SECRET - Deepgram API key (for fast STT)
- [ ] `CRON_SECRET` ⚠️ SECRET - Generate with `openssl rand -hex 32`
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL

**Optional Variables:**
- [ ] `UPSTASH_REDIS_REST_URL` - For rate limiting
- [ ] `UPSTASH_REDIS_REST_TOKEN` - For rate limiting
- [ ] `RESEND_API_KEY` - For email delivery
- [ ] `EMAIL_FROM` - Sender email address

### 2. Database Setup

- [ ] Run all migrations in `supabase/migrations/` directory
- [ ] Verify triggers exist:
  ```sql
  SELECT trigger_name FROM information_schema.triggers 
  WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_email_confirmed');
  ```
- [ ] Set first admin user:
  ```sql
  UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
  ```

### 3. Vapi Configuration

- [ ] Go to Vapi Dashboard → Webhooks
- [ ] Add webhook URL: `https://your-domain.vercel.app/api/vapi-webhook`
- [ ] Add custom header: `x-vapi-secret` = your `VAPI_SECRET_KEY` value
- [ ] Select events: `end-of-call-report`
- [ ] Save webhook configuration

### 4. Vercel Configuration

- [ ] Verify `vercel.json` is committed (cron job auto-configures)
- [ ] Cron schedule: `0 8 * * *` (8 AM UTC daily)
- [ ] Adjust timezone if needed (see PRODUCTION_AUDIT.md)

### 5. Security Verification

- [ ] Test `/admin/dashboard` without auth → should redirect to `/login`
- [ ] Test `/admin/dashboard` as non-admin → should redirect to `/`
- [ ] Test `/api/cron/daily-recap` without secret → should return 401
- [ ] Test `/api/vapi-webhook` without `x-vapi-secret` → should return 401
- [ ] Verify no `NEXT_PUBLIC_` prefix on secrets

## 📋 Post-Deployment Verification

- [ ] Test user sign-up flow
- [ ] Test admin invitation system
- [ ] Test gauntlet progression
- [ ] Test call recording and grading
- [ ] Verify cron job runs (check logs)
- [ ] Test webhook receives Vapi events
- [ ] Check error logs for any issues

## 🔗 Quick Links

- **Full Audit**: See `docs/PRODUCTION_AUDIT.md`
- **Deployment Guide**: See `README_DEPLOY.md`
- **Security Audit**: See `docs/SECURITY_AUDIT.md`
- **Auth Setup**: See `docs/AUTH_SETUP.md`
