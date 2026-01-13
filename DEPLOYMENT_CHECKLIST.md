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

### Step 2: Deploy to Heroku

#### Option A: Via Heroku CLI (Recommended)

```bash
# Install Heroku CLI
# macOS: brew tap heroku/brew && brew install heroku
# Or download from: https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app (if not already created)
heroku create your-app-name

# Deploy to production
git push heroku main
```

#### Option B: Via GitHub Integration

1. Push code to GitHub
2. Go to Heroku Dashboard → Create New App
3. Connect GitHub repository
4. Enable automatic deploys from main branch

---

### Step 3: Verify Deployment

#### Check Build Status
- [ ] Go to Heroku Dashboard → Your App → Activity
- [ ] Verify build succeeded (green checkmark)
- [ ] Review build logs for errors: `heroku logs --tail -a your-app-name`

#### Set Up Cron Jobs (Heroku Scheduler)
After deployment, set up scheduled jobs:

1. Add Heroku Scheduler addon: `heroku addons:create scheduler:standard`
2. Open scheduler: `heroku addons:open scheduler`
3. Add scheduled jobs:
   - `/api/cron/train` (every 30 min): `curl -X GET https://your-app.herokuapp.com/api/cron/train -H "Authorization: Bearer $CRON_SECRET"`
   - `/api/cron/scout-scan` (every 5 min): `curl -X GET https://your-app.herokuapp.com/api/cron/scout-scan -H "Authorization: Bearer $CRON_SECRET"`
   - `/api/cron/daily-audit` (daily 8 AM UTC): `curl -X GET https://your-app.herokuapp.com/api/cron/daily-audit -H "Authorization: Bearer $CRON_SECRET"`
   - `/api/cron/nightly-evolution` (daily 2 AM UTC): `curl -X GET https://your-app.herokuapp.com/api/cron/nightly-evolution -H "Authorization: Bearer $CRON_SECRET"`
   - `/api/cron/daily-recap` (daily 8 AM UTC): `curl -X GET https://your-app.herokuapp.com/api/cron/daily-recap -H "Authorization: Bearer $CRON_SECRET"`

4. Check execution logs: `heroku logs --tail -a your-app-name | grep cron`

#### Test Manually (Optional)
```bash
# Replace with your domain and cron secret
curl -X POST https://your-app.herokuapp.com/api/cron/train \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

### Step 4: Access Dashboard UI

After deployment, access at:
```
https://your-app.herokuapp.com
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
- Verify Heroku Scheduler is configured
- Check Heroku Scheduler dashboard for errors
- Verify `CRON_SECRET` is set correctly: `heroku config:get CRON_SECRET`
- Check cron route handlers for errors
- View logs: `heroku logs --tail -a your-app-name | grep cron`

### Environment Variables Not Working
- Verify variables set in Heroku: `heroku config -a your-app-name`
- Set variables: `heroku config:set KEY=value -a your-app-name`
- Redeploy after adding new variables: `git push heroku main`
- Check variable names match exactly (case-sensitive)
- Verify no typos in values

### Database Connection Issues
- Verify Supabase URLs and keys are correct
- Check Supabase Dashboard → Settings → API
- Verify RLS policies allow service_role access
- Check network connectivity from Heroku

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

1. **Monitor Cron Jobs**: Check Heroku Scheduler dashboard regularly
2. **Review Logs**: Monitor for errors: `heroku logs --tail -a your-app-name`
3. **Test Training**: Trigger a training session via dashboard
4. **Set Up Alerts**: Configure Slack/Twilio for notifications
5. **Optimize**: Review performance and costs

---

## 📚 Additional Resources

- Heroku migration guide: `HEROKU_MIGRATION_GUIDE.md`
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
