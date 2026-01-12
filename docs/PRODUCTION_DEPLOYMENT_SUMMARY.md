# Production Deployment Summary

Quick reference for deploying the autonomous training model to production.

## ✅ Completed Components

### 1. Multi-Environment Manager (`src/lib/env-manager.ts`)

**Features:**
- Toggles between LOCAL, SANDBOX, PROD
- Production links to "Goat Sales App-Prod" Supabase project
- Sandbox uses separate project to prevent data pollution
- Automatic environment detection with safety checks

**Usage:**
```typescript
import { getEnvironmentConfig, getSupabaseClientForEnv } from '@/lib/env-manager';

// Get current environment
const config = getEnvironmentConfig();

// Get PROD Supabase client
const prodClient = getSupabaseClientForEnv('prod');
```

### 2. Provider Integration Layer

**Vapi Configuration:**
- ✅ Voice: `eleven_turbo_v2_5` (ElevenLabs Turbo v2.5)
- ✅ STT: `nova-2-general` (Deepgram Nova-2 General)
- ✅ Fallback: OpenAI `gpt-4o-mini-transcribe`

**OpenAI Model Intelligence:**
- ✅ Closer: `gpt-4o` (Full GPT-4o for production)
- ✅ Sellers/Referees: `gpt-4o-mini` (Cost optimization)
- ✅ Automatic throttling when budget is within 20% of daily cap

**Configuration Files:**
- `src/lib/vapiConfig.ts`: Updated to use `eleven_turbo_v2_5` and `nova-2-general`
- `src/app/api/vapi/create-assistant/route.ts`: Uses env-manager for model selection
- `scripts/autonomousBattle.ts`: Uses `getOpenAIModel()` for role-based model selection

### 3. Ignition Script (`scripts/ignite-training.ts`)

**Process:**
1. Initializes Budget Monitor ($15.00 hard cap)
2. Fetches 5 random Principal Partner personas
3. Executes parallel battles
4. Pipes results to Vocal Soul Auditor
5. Reports results and budget status

**Usage:**
```bash
npm run ignite
```

### 4. Vercel Deployment Readiness

**Files Created:**
- `.vercel/project.json`: Vercel project configuration
- `vercel.json`: Updated with nightly evolution cron job
- `src/app/api/cron/nightly-evolution/route.ts`: Nightly autonomous evolution endpoint

**Cron Jobs:**
- `/api/cron/train`: Every 30 minutes (autonomous battles)
- `/api/cron/scout-scan`: Every 5 minutes (breakthrough detection)
- `/api/cron/daily-audit`: Daily at 8 AM UTC
- `/api/cron/nightly-evolution`: Daily at 2 AM UTC (NEW)

### 5. Tactical Promotion Hook

**Updated:** `src/lib/promotionService.ts`

**Flow:**
1. User "Blesses" tactic in Training Dashboard
2. `promoteTactic()` updates local `base_prompt.txt`
3. **Tactical Hook**: Immediately upserts to PROD Supabase ("Goat Sales App-Prod")
4. Production system can access promoted tactics instantly

**Database Updates:**
- SANDBOX: Marks `is_active: true`
- PROD: Upserts with `metadata.environment: 'prod'`

---

## Environment Variables Required

### Production (Vercel Dashboard)

```bash
# Supabase Production (Goat Sales App-Prod)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key

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
ELEVEN_LABS_MODEL=eleven_turbo_v2_5  # Optional override

# Deepgram
DEEPGRAM_API_KEY=...
DEEPGRAM_MODEL=nova-2-general  # Optional override

# Cron Secret
CRON_SECRET=your_cron_secret_here

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Quick Start

### 1. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all required variables.

### 2. Deploy to Vercel

```bash
vercel --prod
```

### 3. Run Ignition

```bash
# Locally (points to SANDBOX)
npm run ignite

# Or via API (if deployed)
curl -X POST "https://your-app.vercel.app/api/cron/train" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Verify Promotion Hook

1. Go to Training Dashboard
2. Find a high-score battle (score > 90)
3. Click "Promote"
4. Verify tactic appears in PROD Supabase

---

## File Changes Summary

**New Files:**
- `src/lib/env-manager.ts` - Multi-environment management
- `scripts/ignite-training.ts` - Ignition script
- `.vercel/project.json` - Vercel project config
- `src/app/api/cron/nightly-evolution/route.ts` - Nightly evolution cron
- `docs/DEPLOYMENT_PRODUCTION.md` - Full deployment guide

**Modified Files:**
- `src/lib/vapiConfig.ts` - Updated for `eleven_turbo_v2_5` and `nova-2-general`
- `src/lib/promotionService.ts` - Added Tactical Promotion Hook to PROD
- `scripts/autonomousBattle.ts` - Uses env-manager for model selection
- `vercel.json` - Added nightly evolution cron job
- `package.json` - Added `ignite` script

---

## Next Steps

1. ✅ Set environment variables in Vercel Dashboard
2. ✅ Deploy: `vercel --prod`
3. ✅ Run ignition: `npm run ignite`
4. ✅ Monitor: Check Training Dashboard and budget status
5. ✅ Test promotion: Promote a tactic and verify PROD update

---

## Support

For issues:
- Check `docs/DEPLOYMENT_PRODUCTION.md` for detailed guide
- Verify environment: `getEnvironmentConfig()`
- Test locally: `EXPLICIT_ENV=sandbox npm run ignite`
- Check Vercel logs: `vercel logs`
