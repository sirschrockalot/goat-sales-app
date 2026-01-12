# Production Deployment Guide

Complete guide for deploying the autonomous training model to production with multi-environment support.

## Overview

This deployment setup provides:
- ✅ **Multi-Environment Management**: LOCAL, SANDBOX, PROD switching
- ✅ **Provider Integration**: Vapi (ElevenLabs Turbo v2.5, Deepgram Nova-2-General), OpenAI (GPT-4o for Closer, GPT-4o-mini for Sellers/Referees)
- ✅ **Ignition Script**: First 5 autonomous battles
- ✅ **Vercel Deployment**: Cron jobs and environment variables
- ✅ **Tactical Promotion Hook**: Immediate PROD updates when tactics are "Blessed"

---

## 1. Multi-Environment Configuration

### Environment Manager: `src/lib/env-manager.ts`

**Environments:**
- **LOCAL**: `USE_LOCAL_DB=true` or `EXPLICIT_ENV=local`
- **SANDBOX**: Default or `EXPLICIT_ENV=sandbox`
- **PROD**: `NODE_ENV=production` or `EXPLICIT_ENV=prod`

**Production Connection:**
- Links to **"Goat Sales App-Prod"** Supabase project
- Uses `PROD_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- Service Role Key: `PROD_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

**Sandbox Connection:**
- Separate Supabase project/schema for training
- Uses `SUPABASE_SANDBOX_URL` or `SANDBOX_SUPABASE_URL`
- Prevents data pollution between training and production

### Usage

```typescript
import { getEnvironmentConfig, getSupabaseClientForEnv, assertEnvironment } from '@/lib/env-manager';

// Get current environment config
const config = getEnvironmentConfig();

// Get Supabase client for specific environment
const prodClient = getSupabaseClientForEnv('prod');
const sandboxClient = getSupabaseClientForEnv('sandbox');

// Safety checks
assertEnvironment('sandbox'); // Throws if not in sandbox
```

---

## 2. Provider Integration Layer

### Vapi Configuration

**Voice Model**: `eleven_turbo_v2_5` (ElevenLabs Turbo v2.5)
- Configured in `getElevenLabsCloserConfig()` and `getElevenLabsSellerConfig()`
- Can be overridden via `ELEVEN_LABS_MODEL` environment variable

**STT Provider**: `deepgram`
- **Model**: `nova-2-general` (Deepgram Nova-2 General)
- Configured in `getDeepgramSTTConfig()`
- Can be overridden via `DEEPGRAM_MODEL` environment variable
- Fallback: `gpt-4o-mini-transcribe` (OpenAI)

### OpenAI Model Intelligence

**Model Selection** (via `getOpenAIModel()`):
- **Closer**: `gpt-4o` (Full GPT-4o for production closer)
- **Sellers/Referees**: `gpt-4o-mini` (Cost optimization)

**Cost Optimization:**
- Closer uses GPT-4o for maximum performance
- Sellers and Referees use GPT-4o-mini to reduce costs
- Automatic throttling to GPT-4o-mini when budget is within 20% of daily cap

### Configuration Files

**Vapi Assistant Creation** (`src/app/api/vapi/create-assistant/route.ts`):
- Automatically uses `eleven_turbo_v2_5` for voice
- Automatically uses `nova-2-general` for STT
- Fallback plans configured for reliability

---

## 3. Ignition Script

### Script: `scripts/ignite-training.ts`

**Purpose**: Initiates the first 5 autonomous battles in the Sandbox

**Process:**
1. ✅ Initializes Budget Monitor (Hard cap $15.00)
2. ✅ Fetches 5 random Principal Partner personas from `training_personas` table
3. ✅ Executes parallel battles using `runBattle()`
4. ✅ Pipes results into Vocal Soul Auditor for grading
5. ✅ Reports results and budget status

**Usage:**
```bash
# Run ignition (automatically uses SANDBOX environment)
npm run ignite

# Or explicitly set environment
EXPLICIT_ENV=sandbox npm run ignite
```

**Output:**
```
🚀 IGNITION SEQUENCE STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Step 1: Initializing Budget Monitor...
✅ Budget Monitor initialized
👥 Step 2: Fetching Principal Partner personas...
✅ Fetched 5 personas
⚔️  Step 3: Executing 5 parallel battles...
✅ Battle 1 complete
✅ Battle 2 complete
...
🎉 IGNITION SEQUENCE COMPLETE
```

---

## 4. Vercel Deployment Readiness

### Project Configuration: `.vercel/project.json`

```json
{
  "projectId": "goat-sales-app",
  "orgId": "team_goat",
  "settings": {
    "framework": "nextjs",
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "installCommand": "npm install",
    "outputDirectory": ".next",
    "nodeVersion": "20.x"
  }
}
```

### Cron Jobs: `vercel.json`

**Nightly Autonomous Evolution:**
- Path: `/api/cron/nightly-evolution`
- Schedule: `0 2 * * *` (2 AM UTC daily)
- Purpose: Analyzes breakthroughs and evolves prompts

**Existing Cron Jobs:**
- `/api/cron/train`: Every 30 minutes (autonomous battles)
- `/api/cron/scout-scan`: Every 5 minutes (breakthrough detection)
- `/api/cron/daily-audit`: Daily at 8 AM UTC

### Environment Variables (Vercel Dashboard)

**Required for Production:**
```bash
# Supabase Production (Goat Sales App-Prod)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key

# Supabase Sandbox (for training)
SUPABASE_SANDBOX_URL=https://your-sandbox-project.supabase.co
SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_sandbox_service_role_key

# OpenAI
OPENAI_API_KEY=sk-...

# Vapi
NEXT_PUBLIC_VAPI_API_KEY=...
VAPI_SECRET_KEY=...

# ElevenLabs
ELEVEN_LABS_API_KEY=...
ELEVEN_LABS_MODEL=eleven_turbo_v2_5

# Deepgram
DEEPGRAM_API_KEY=...
DEEPGRAM_MODEL=nova-2-general

# Cron Secret
CRON_SECRET=your_cron_secret_here

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Optional:**
```bash
# Slack (for alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Twilio (for SMS alerts)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
ALERT_PHONE_NUMBER=+1...

# Contract Generation
DOCUSIGN_ACCOUNT_ID=...
# OR
PANDADOC_API_KEY=...
# OR
CONTRACT_WEBHOOK_URL=https://hooks.zapier.com/...
```

---

## 5. Tactical Promotion Hook

### Promotion Service: `src/lib/promotionService.ts`

**Tactical Promotion Hook:**
- When a tactic is "Blessed" (promoted), it immediately updates **PROD Supabase**
- Uses `getSupabaseClientForEnv('prod')` to connect to "Goat Sales App-Prod"
- Updates both local `base_prompt.txt` and PROD database

**Flow:**
1. User clicks "Promote" in Training Dashboard
2. `promoteTactic()` is called
3. Tactic is appended to `base_prompt.txt` (version control)
4. **Tactical Hook**: Tactic is upserted to PROD Supabase immediately
5. Production system can access promoted tactics instantly

**Database Updates:**
- **SANDBOX**: Marks tactic as `is_active: true`
- **PROD**: Upserts tactic with `metadata.environment: 'prod'` for immediate production use

---

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] All environment variables set in Vercel Dashboard
- [ ] Supabase Production project ("Goat Sales App-Prod") created
- [ ] Supabase Sandbox project created (separate from PROD)
- [ ] All migrations run on both PROD and SANDBOX
- [ ] Seed data loaded into SANDBOX (`supabase/seed.sql`)
- [ ] Vapi webhook configured: `https://your-app.vercel.app/api/vapi-webhook`
- [ ] Cron secret generated: `openssl rand -hex 32`

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link project
vercel link

# Deploy to production
vercel --prod
```

### 3. Verify Deployment

**Check Environment:**
```bash
# Verify environment detection
curl https://your-app.vercel.app/api/health
```

**Test Cron Jobs:**
```bash
# Test nightly evolution (with CRON_SECRET)
curl -X GET "https://your-app.vercel.app/api/cron/nightly-evolution" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Test Ignition:**
```bash
# Run ignition script locally (points to SANDBOX)
npm run ignite
```

### 4. Post-Deployment

- [ ] Verify Vercel Cron jobs are active
- [ ] Check Vercel logs for errors
- [ ] Test promotion hook: Promote a tactic and verify PROD update
- [ ] Monitor budget: Check `/api/sandbox/budget-status`
- [ ] Verify autonomous training: Check `/api/cron/train` logs

---

## Environment Variable Mapping

### Vercel Build Process

All `process.env` variables are automatically available during build and runtime:

```typescript
// Automatically mapped from Vercel Dashboard
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.OPENAI_API_KEY
process.env.ELEVEN_LABS_API_KEY
process.env.DEEPGRAM_API_KEY
// ... etc
```

### Environment Detection

The system automatically detects environment:
1. **EXPLICIT_ENV** (highest priority)
2. **NODE_ENV** (production = PROD)
3. **USE_LOCAL_DB** (true = LOCAL)
4. Default: **SANDBOX**

---

## Troubleshooting

### Problem: Wrong environment detected

```bash
# Force environment
EXPLICIT_ENV=sandbox npm run ignite
EXPLICIT_ENV=prod npm run dev
```

### Problem: Provider integration not working

**Check Vapi Config:**
- Verify `ELEVEN_LABS_API_KEY` is set
- Verify `DEEPGRAM_API_KEY` is set
- Check Vapi Dashboard for voice/STT configuration

**Check Model Selection:**
```typescript
import { getOpenAIModel } from '@/lib/env-manager';

const closerModel = getOpenAIModel('closer'); // Should be 'gpt-4o'
const sellerModel = getOpenAIModel('seller'); // Should be 'gpt-4o-mini'
```

### Problem: Promotion not updating PROD

**Check:**
1. PROD Supabase credentials are correct
2. `getSupabaseClientForEnv('prod')` is working
3. PROD database has `sandbox_tactics` table
4. Check logs for PROD update errors

### Problem: Ignition script fails

**Check:**
1. SANDBOX environment is set: `EXPLICIT_ENV=sandbox`
2. Budget monitor initialized: Check `billing_logs` table exists
3. Personas exist: Check `training_personas` or `sandbox_personas` table
4. Vocal Soul Auditor: May fail gracefully if audio analysis unavailable

---

## Summary

✅ **Multi-Environment**: LOCAL/SANDBOX/PROD switching via `env-manager.ts`
✅ **Provider Integration**: ElevenLabs Turbo v2.5, Deepgram Nova-2-General, GPT-4o/GPT-4o-mini
✅ **Ignition Script**: `npm run ignite` for first 5 battles
✅ **Vercel Deployment**: `.vercel/project.json` and `vercel.json` configured
✅ **Tactical Promotion Hook**: Immediate PROD updates when tactics are "Blessed"

**Next Steps:**
1. Set environment variables in Vercel Dashboard
2. Deploy: `vercel --prod`
3. Run ignition: `npm run ignite`
4. Monitor: Check Training Dashboard and budget status

---

## Support

For deployment issues:
- Check Vercel logs: `vercel logs`
- Verify environment: `getEnvironmentConfig()`
- Test locally: `EXPLICIT_ENV=sandbox npm run ignite`
- Check Supabase connections: Verify URLs and keys
