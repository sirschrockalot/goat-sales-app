# 🚀 Vercel Deployment Guide

Complete step-by-step guide to deploy to Vercel with cron jobs and dashboard UI.

## 📋 Pre-Deployment Checklist

### ✅ Already Configured
- [x] `vercel.json` - Cron jobs configured
- [x] `.vercel/project.json` - Project settings
- [x] All cron job routes exist (`/api/cron/*`)
- [x] Environment manager (`src/lib/env-manager.ts`)

### ⚠️ Required Before Deployment

1. **Environment Variables** - Set in Vercel Dashboard
2. **Supabase Projects** - Production and Sandbox configured
3. **API Keys** - All provider keys ready
4. **Cron Secret** - Generate authentication token

---

## Step 1: Generate Cron Secret

```bash
# Generate a secure random secret for cron job authentication
openssl rand -hex 32
```

Save this value - you'll need it for the `CRON_SECRET` environment variable.

---

## Step 2: Set Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required Variables (Production)

#### Supabase Production
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
```

#### Supabase Sandbox (for training)
```bash
SUPABASE_SANDBOX_URL=https://cwnvhhzzcjzhcaozazji.supabase.co
SANDBOX_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SANDBOX_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SANDBOX_PROJECT_REF=cwnvhhzzcjzhcaozazji
```

#### OpenAI
```bash
OPENAI_API_KEY=sk-...
SANDBOX_OPENAI_API_KEY=sk-...  # Optional: separate key for sandbox
```

#### Vapi
```bash
NEXT_PUBLIC_VAPI_API_KEY=your_vapi_public_key
VAPI_SECRET_KEY=your_vapi_secret_key
SANDBOX_VAPI_API_KEY=your_vapi_public_key  # Optional: separate for sandbox
SANDBOX_VAPI_SECRET_KEY=your_vapi_secret_key  # Optional: separate for sandbox
```

#### ElevenLabs
```bash
ELEVEN_LABS_API_KEY=your_elevenlabs_key
ELEVEN_LABS_MODEL=eleven_turbo_v2_5
```

#### Deepgram
```bash
DEEPGRAM_API_KEY=your_deepgram_key
DEEPGRAM_MODEL=nova-2-general
```

#### App Configuration
```bash
CRON_SECRET=your_generated_secret_from_step_1
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Will be set automatically after first deploy
NODE_ENV=production
EXPLICIT_ENV=prod  # Or leave unset for production
```

### Optional Variables

#### Slack Alerts
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### Twilio (SMS Alerts)
```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
ALERT_PHONE_NUMBER=+1...
```

#### Email (Resend)
```bash
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
```

#### Rate Limiting (Upstash Redis)
```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Deploy to production
vercel --prod
```

### Option B: Via GitHub Integration

1. Push your code to GitHub
2. Go to Vercel Dashboard → Add New Project
3. Import your GitHub repository
4. Vercel will auto-detect Next.js and deploy

### Option C: Via Vercel Dashboard

1. Go to Vercel Dashboard
2. Click "Add New Project"
3. Import from Git or upload manually
4. Configure build settings (auto-detected for Next.js)

---

## Step 4: Verify Deployment

### Check Deployment Status

1. Go to Vercel Dashboard → Your Project → Deployments
2. Verify build succeeded (green checkmark)
3. Click on deployment to see build logs

### Test Cron Jobs

After deployment, cron jobs will be automatically configured. Test them:

```bash
# Test cron endpoint (replace with your domain)
curl -X POST https://your-app.vercel.app/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or check Vercel Dashboard → Your Project → Cron Jobs to see execution logs.

### Verify Environment Variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify all variables are set for **Production** environment
3. Check that sensitive variables are marked as **Encrypted**

---

## Step 5: Configure Cron Jobs

Cron jobs are automatically configured via `vercel.json`, but you can verify:

### Active Cron Jobs

1. **Training** (`/api/cron/train`)
   - Schedule: Every 30 minutes (`*/30 * * * *`)
   - Purpose: Runs autonomous battles

2. **Scout Scan** (`/api/cron/scout-scan`)
   - Schedule: Every 5 minutes (`*/5 * * * *`)
   - Purpose: Detects breakthroughs (score >= 95)

3. **Daily Audit** (`/api/cron/daily-audit`)
   - Schedule: Daily at 8 AM UTC (`0 8 * * *`)
   - Purpose: Aggregates billing and performance data

4. **Nightly Evolution** (`/api/cron/nightly-evolution`)
   - Schedule: Daily at 2 AM UTC (`0 2 * * *`)
   - Purpose: Analyzes breakthroughs and evolves prompts

### View Cron Job Logs

1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. Click on a cron job to see execution history
3. Check logs for errors or issues

---

## Step 6: Access Dashboard UI

After deployment, access the dashboard at:

```
https://your-app.vercel.app
```

### Dashboard Routes

- **Training Monitor**: `/training` or `/dashboard/training`
- **Promotion Dashboard**: `/dashboard/promotion`
- **Admin Dashboard**: `/admin/dashboard` (requires admin auth)

---

## Step 7: Post-Deployment Verification

### ✅ Checklist

- [ ] Homepage loads without errors
- [ ] Can access dashboard UI
- [ ] Cron jobs are executing (check Vercel Dashboard → Cron Jobs)
- [ ] Environment variables are set correctly
- [ ] Supabase connections work (check logs)
- [ ] Training can be initiated (if dashboard has trigger button)

### Test Cron Jobs Manually

You can manually trigger cron jobs to test:

```bash
# Replace with your actual domain and cron secret
curl -X POST https://your-app.vercel.app/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

### Build Fails

1. Check build logs in Vercel Dashboard
2. Verify all dependencies are in `package.json`
3. Check for TypeScript errors: `npm run build` locally

### Cron Jobs Not Running

1. Verify `vercel.json` is committed to repository
2. Check Vercel Dashboard → Cron Jobs for errors
3. Verify `CRON_SECRET` is set correctly
4. Check cron job route handlers for errors

### Environment Variables Not Working

1. Verify variables are set for **Production** environment
2. Redeploy after adding new variables
3. Check variable names match exactly (case-sensitive)
4. Verify no typos in variable values

### Database Connection Issues

1. Verify Supabase URLs and keys are correct
2. Check Supabase Dashboard → Settings → API
3. Verify RLS policies allow service_role access
4. Check network connectivity from Vercel

---

## Next Steps

After successful deployment:

1. **Monitor Cron Jobs**: Check Vercel Dashboard regularly
2. **Review Logs**: Monitor for errors or issues
3. **Test Training**: Trigger a training session via dashboard
4. **Set Up Alerts**: Configure Slack/Twilio for notifications
5. **Optimize**: Review performance and costs

---

## Support

If you encounter issues:

1. Check Vercel Dashboard logs
2. Review cron job execution history
3. Verify all environment variables
4. Test locally with `vercel dev` to debug

---

## Quick Reference

### Deploy Command
```bash
vercel --prod
```

### View Logs
```bash
vercel logs
```

### Test Locally with Vercel
```bash
vercel dev
```

### Environment Variables Location
Vercel Dashboard → Your Project → Settings → Environment Variables
