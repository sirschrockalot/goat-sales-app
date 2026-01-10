# Deployment Guide - Sales Goat App

This guide outlines the **essential environment variables** you need to configure in Vercel to deploy the Sales Goat App.

## 🚀 Required Environment Variables

> **Note**: The app now includes 11 environment variables (8 required + 3 optional for email/cron features).

### Supabase Configuration

#### 1. **NEXT_PUBLIC_SUPABASE_URL**
- **Description**: Your Supabase project URL
- **Where to find**: Supabase Dashboard → Settings → API → Project URL
- **Format**: `https://xxxxxxxxxxxxx.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Required for**: All Supabase operations (client and server)
- **Usage**: Public (safe to expose in browser)

#### 2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
- **Description**: Supabase Anonymous Key (for client-side operations)
- **Where to find**: Supabase Dashboard → Settings → API → anon/public key
- **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjM0NTY3ODkwfQ.xyz`
- **Required for**: Client-side Supabase queries (respects RLS)
- **Usage**: Public (safe to expose in browser)

#### 3. **SUPABASE_SERVICE_ROLE_KEY** ⚠️ SECRET
- **Description**: Supabase Service Role Key (bypasses Row Level Security)
- **Where to find**: Supabase Dashboard → Settings → API → Service Role Key
- **Format**: `sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Example**: `sb_secret_6uND96GswTa0k87QPwAJSQ_gC7Y_Jiv`
- **Required for**: Server-side API routes (webhooks, admin operations, embeddings)
- **⚠️ Security**: **NEVER** expose in client-side code. Only used in `/api` routes.
- **Used in**:
  - `/api/vapi-webhook/route.ts` (call grading)
  - `/api/rebuttals/embed/route.ts` (embedding generation)
  - `/api/calls/[id]/route.ts` (auto-grading)
  - All other admin API routes

### Security Configuration

#### 4. **CRON_SECRET** ⚠️ SECRET
- **Description**: Secret token for authenticating cron job requests
- **Where to find**: Generate using `openssl rand -hex 32`
- **Format**: Random hex string
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Required for**: `/api/cron/*` routes (daily recap email)
- **⚠️ Security**: Keep secret, used in Vercel Cron configuration

#### 5. **VAPI_SECRET_KEY** ⚠️ SECRET
- **Description**: Vapi Secret Key used for webhook validation and server-side API calls
- **Where to find**: [Vapi.ai Dashboard](https://dashboard.vapi.ai) → API Keys → Secret Key
- **Format**: Varies by Vapi.ai (typically starts with `vapi_secret_` or similar)
- **Example**: `vapi_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Required for**: 
  - Webhook validation (`/api/vapi-webhook` route)
  - Voice hints feature (Live Call Control API)
  - Server-side assistant creation
- **⚠️ Security**: **NEVER** expose in client-side code. Must match the secret configured in Vapi dashboard webhook settings.
- **Webhook Configuration**: 
  1. Go to Vapi Dashboard → Webhooks
  2. Set webhook URL to: `https://your-domain.com/api/vapi-webhook`
  3. Add custom header: `x-vapi-secret` with value matching your `VAPI_SECRET_KEY`
  4. Save the webhook configuration

### OpenAI Configuration

#### 6. **OPENAI_API_KEY** ⚠️ SECRET
- **Description**: OpenAI API key for call grading and embedding generation
- **Where to find**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Format**: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Example**: `sk-proj-abcdefghijklmnopqrstuvwxyz1234567890`
- **Required for**: 
  - Call transcript grading (JUDGE_PROMPT) - uses `gpt-4o-mini`
  - Embedding generation for rebuttal search - uses `text-embedding-3-small`
- **Usage**: Server-side only (API routes)
- **⚠️ Security**: **NEVER** expose in client-side code

### Vapi.ai Configuration

#### 7. **NEXT_PUBLIC_VAPI_API_KEY**
- **Description**: Vapi.ai API key for voice call functionality
- **Where to find**: [Vapi.ai Dashboard](https://dashboard.vapi.ai) → API Keys
- **Format**: Varies by Vapi.ai
- **Example**: `vapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Required for**: Real-time voice conversations, call initialization
- **Usage**: Client-side (browser SDK) and server-side (webhooks)
- **Note**: This is a public key (NEXT_PUBLIC_ prefix), safe to expose in browser

#### 8. **VAPI_SECRET_KEY** ⚠️ SECRET
- **Description**: Vapi Secret Key for server-side API calls (Control API, webhooks)
- **Where to find**: [Vapi.ai Dashboard](https://dashboard.vapi.ai) → API Keys → Secret Key
- **Format**: Varies by Vapi.ai
- **Example**: `vapi_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Required for**: Voice hints feature (Live Call Control API), assistant creation
- **⚠️ Security**: **NEVER** expose in client-side code. Only used in server-side API routes.
- **Used in**: `/api/vapi/voice-hint/route.ts`, `/api/vapi/create-assistant/route.ts`

#### 9. **VAPI_ASSISTANT_ID** (Optional but Recommended)
- **Description**: Pre-configured Vapi Assistant ID
- **Where to find**: Vapi.ai Dashboard → Assistants
- **Format**: UUID or string identifier
- **Example**: `asst_xxxxxxxxxxxxxxxxxxxxx`
- **Required for**: Using pre-configured assistants instead of dynamic creation
- **Note**: If not set, the app will create assistants dynamically (may require additional Vapi permissions)

### Email & Cron Configuration

#### 10. **RESEND_API_KEY** (Optional but Recommended) ⚠️ SECRET

#### 10. **RESEND_API_KEY** (Optional but Recommended) ⚠️ SECRET
- **Description**: Resend API key for sending daily recap emails
- **Where to find**: [Resend Dashboard](https://resend.com/api-keys)
- **Format**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Example**: `re_abc123def456ghi789jkl012mno345pqr678`
- **Required for**: Automated email delivery of daily manager recap
- **Note**: If not set, the cron job will still run but emails won't be sent (HTML will be logged)
- **⚠️ Security**: **NEVER** expose in client-side code

#### 11. **EMAIL_FROM** (Optional)
- **Description**: Email address to send daily recap emails from
- **Format**: Valid email address
- **Example**: `noreply@salesgoat.app` or `manager@salesgoat.app`
- **Required for**: Email sending (must be verified in Resend)
- **Note**: Must be a verified domain/email in your Resend account

---

## 📋 Quick Setup Checklist

### In Vercel Dashboard:

1. ✅ Go to your project → **Settings** → **Environment Variables**
2. ✅ Add all 11 variables above (8 required + 3 optional)
3. ✅ Set **Environment** to:
   - `Production` for production deployments
   - `Preview` for preview deployments (optional)
   - `Development` for local development (optional)
4. ✅ **Redeploy** your application after adding variables

### Vercel Configuration:

The app includes `vercel.json` with optimized settings:
- **Long-running tasks**: API routes for grading/embeddings set to 60s timeout
- **Edge Runtime**: Search route optimized for lowest latency
- **Auto-scaling**: Configured for production workloads
- **Cron Jobs**: Daily Manager Recap runs at 8:00 AM UTC (`0 8 * * *`)

### Verify Deployment:

After deployment, check:
- ✅ Home page loads without errors
- ✅ Can navigate to persona selection
- ✅ Can start a mock call (requires VAPI_API_KEY)
- ✅ Call webhook receives events (requires SUPABASE_SERVICE_ROLE_KEY)
- ✅ Debrief page shows scores (requires OPENAI_API_KEY)

---

## 🔒 Security Notes

### Server-Side Only Variables (SECRETS):
- `SUPABASE_SERVICE_ROLE_KEY` - ⚠️ **NEVER** expose to client
- `OPENAI_API_KEY` - ⚠️ **NEVER** expose to client
- `CRON_SECRET` - ⚠️ **NEVER** expose to client
- `VAPI_SECRET_KEY` - ⚠️ **NEVER** expose to client (used for webhook validation and API calls)
- `RESEND_API_KEY` - ⚠️ **NEVER** expose to client

### Client-Side Variables (NEXT_PUBLIC_*):
- `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose (public URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (public key, respects RLS)
- `NEXT_PUBLIC_VAPI_API_KEY` - Required for browser SDK

### Best Practices:
1. ✅ Use `NEXT_PUBLIC_*` prefix only for variables needed in browser
2. ✅ Never commit `.env.local` to git (already in `.gitignore`)
3. ✅ Rotate API keys if accidentally exposed
4. ✅ Use Vercel's environment variable encryption

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- ✅ Verify all 3 Supabase variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Check for typos in variable names
- ✅ Ensure variables are set for the correct environment (Production/Preview)
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key (not anon key)

### "OpenAI API key not found"
- ✅ Verify `OPENAI_API_KEY` is set (no `NEXT_PUBLIC_` prefix)
- ✅ Check API key has sufficient credits/quota
- ✅ Ensure key has access to `gpt-4o-mini` and `text-embedding-3-small`

### "Vapi initialization failed"
- ✅ Verify `NEXT_PUBLIC_VAPI_API_KEY` is set
- ✅ Check Vapi.ai dashboard for active subscription
- ✅ Verify assistant ID (if using `VAPI_ASSISTANT_ID`)

### "Database connection failed"
- ✅ Verify Supabase project is active
- ✅ Check RLS policies allow your operations
- ✅ Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Getting Started](https://supabase.com/docs/guides/getting-started)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vapi.ai Documentation](https://docs.vapi.ai)

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All 11 environment variables configured in Vercel (8 required + 3 optional)
- [ ] `CRON_SECRET` set for daily recap security
- [ ] `VAPI_SECRET_KEY` set and configured in Vapi dashboard webhook settings (see "Vapi Webhook Setup" section below)
- [ ] `RESEND_API_KEY` configured (optional but recommended for email delivery)
- [ ] `EMAIL_FROM` set to verified email address in Resend (optional)
- [ ] Supabase migrations applied (`supabase/migrations/`)
- [ ] Database webhook configured (for rebuttal embeddings)
- [ ] `VAPI_SECRET_KEY` set and configured in Vapi dashboard webhook settings (see "Vapi Webhook Setup" section below)
- [ ] Error boundaries added to critical pages ✅
- [ ] Console.log statements removed from production routes ✅
- [ ] Vercel.json configured for long-running tasks ✅
- [ ] Edge Runtime enabled for search route ✅
- [ ] Test call flow end-to-end
- [ ] Verify debrief page loads with real call data
- [ ] Test loading states during AI grading

---

**Ready to deploy?** 🚀

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!
