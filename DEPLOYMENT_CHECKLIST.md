# 🚀 Vercel Deployment Checklist

Quick reference checklist for deploying to Vercel with cron jobs and dashboard UI.

## ✅ Pre-Deployment

### 1. Generate Cron Secret
```bash
openssl rand -hex 32
```
**Save this value** - you'll need it for `CRON_SECRET`

### 2. Verify Files Are Ready
- [x] `vercel.json` exists and has cron jobs configured
- [x] `.vercel/project.json` exists
- [x] All cron routes exist in `src/app/api/cron/`
- [x] Environment manager (`src/lib/env-manager.ts`) is ready

---

## 📝 Step-by-Step Deployment

### Step 1: Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

#### Required Variables (Set for Production)

**Supabase Production:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
```

**Supabase Sandbox (Training):**
```
SUPABASE_SANDBOX_URL=https://cwnvhhzzcjzhcaozazji.supabase.co
SANDBOX_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SANDBOX_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SANDBOX_PROJECT_REF=cwnvhhzzcjzhcaozazji
```

**OpenAI:**
```
OPENAI_API_KEY=sk-...
SANDBOX_OPENAI_API_KEY=sk-...  # Optional: separate for sandbox
```

**Vapi:**
```
NEXT_PUBLIC_VAPI_API_KEY=your_vapi_public_key
VAPI_SECRET_KEY=your_vapi_secret_key
```

**ElevenLabs:**
```
ELEVEN_LABS_API_KEY=your_elevenlabs_key
ELEVEN_LABS_MODEL=eleven_turbo_v2_5
```

**Deepgram:**
```
DEEPGRAM_API_KEY=your_deepgram_key
DEEPGRAM_MODEL=nova-2-general
```

**App Configuration:**
```
CRON_SECRET=<generated_from_step_1>
NODE_ENV=production
EXPLICIT_ENV=prod  # Or leave unset
```

**After First Deploy:**
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Optional Variables

**Slack Alerts:**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Email (Resend):**
```
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
```

---

### Step 2: Deploy to Vercel

#### Option A: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (if not already linked)
vercel link

# Deploy to production
vercel --prod
```

#### Option B: Via GitHub

1. Push code to GitHub
2. Go to Vercel Dashboard → Add New Project
3. Import your repository
4. Vercel auto-detects Next.js

#### Option C: Via Vercel Dashboard

1. Vercel Dashboard → Add New Project
2. Import from Git or upload
3. Configure (auto-detected for Next.js)

---

### Step 3: Verify Deployment

#### Check Build Status
- [ ] Go to Vercel Dashboard → Deployments
- [ ] Verify build succeeded (green checkmark)
- [ ] Review build logs for errors

#### Test Cron Jobs
After deployment, cron jobs auto-configure. Verify:

1. Go to **Vercel Dashboard → Your Project → Cron Jobs**
2. You should see 5 cron jobs:
   - `/api/cron/train` (every 30 min)
   - `/api/cron/scout-scan` (every 5 min)
   - `/api/cron/daily-audit` (daily 8 AM UTC)
   - `/api/cron/nightly-evolution` (daily 2 AM UTC)
   - `/api/cron/daily-recap` (daily 8 AM UTC)

3. Check execution logs for each cron job

#### Test Manually (Optional)
```bash
# Replace with your domain and cron secret
curl -X POST https://your-app.vercel.app/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

### Step 4: Access Dashboard UI

After deployment, access at:
```
https://your-app.vercel.app
```

**Dashboard Routes:**
- Training Monitor: `/training` or `/dashboard/training`
- Promotion Dashboard: `/dashboard/promotion`
- Admin Dashboard: `/admin/dashboard` (requires admin auth)

---

## 🔍 Post-Deployment Verification

### ✅ Checklist

- [ ] Homepage loads without errors
- [ ] Can access dashboard UI
- [ ] Cron jobs are visible in Vercel Dashboard
- [ ] Environment variables are set correctly
- [ ] Supabase connections work (check logs)
- [ ] Training can be initiated (if dashboard has trigger)

### Test Cron Jobs

1. Wait for first cron execution (check Vercel Dashboard)
2. Review execution logs
3. Verify no errors in logs
4. Check Supabase for new battle records

---

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Run `npm run build` locally to catch errors
- Verify all dependencies in `package.json`

### Cron Jobs Not Running
- Verify `vercel.json` is committed
- Check Vercel Dashboard → Cron Jobs for errors
- Verify `CRON_SECRET` is set correctly
- Check cron route handlers for errors

### Environment Variables Not Working
- Verify variables set for **Production** environment
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)
- Verify no typos in values

### Database Connection Issues
- Verify Supabase URLs and keys are correct
- Check Supabase Dashboard → Settings → API
- Verify RLS policies allow service_role access
- Check network connectivity from Vercel

---

## 📊 Active Cron Jobs

| Cron Job | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/train` | Every 30 min | Runs autonomous battles |
| `/api/cron/scout-scan` | Every 5 min | Detects breakthroughs (score >= 95) |
| `/api/cron/daily-audit` | Daily 8 AM UTC | Aggregates billing and performance |
| `/api/cron/nightly-evolution` | Daily 2 AM UTC | Analyzes breakthroughs, evolves prompts |
| `/api/cron/daily-recap` | Daily 8 AM UTC | Daily summary report |

---

## 🎯 Next Steps

After successful deployment:

1. **Monitor Cron Jobs**: Check Vercel Dashboard regularly
2. **Review Logs**: Monitor for errors or issues
3. **Test Training**: Trigger a training session via dashboard
4. **Set Up Alerts**: Configure Slack/Twilio for notifications
5. **Optimize**: Review performance and costs

---

## 📚 Additional Resources

- Full deployment guide: `VERCEL_DEPLOYMENT_GUIDE.md`
- Production deployment: `docs/DEPLOYMENT_PRODUCTION.md`
- Environment setup: `docs/ENVIRONMENT_PARITY.md`

---

## ⚡ Quick Commands

```bash
# Deploy
vercel --prod

# View logs
vercel logs

# Test locally with Vercel
vercel dev

# Check environment variables
vercel env ls
```
