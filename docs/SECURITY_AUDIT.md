# Security Audit Report - Sales Goat App

This document outlines the security improvements implemented in the Sales Goat App.

## ✅ Completed Security Improvements

### 1. Middleware Protection

**File**: `src/middleware.ts`

- **Admin Routes** (`/admin/*`): Now requires valid Supabase session and `is_admin` flag
- **Cron Routes** (`/api/cron/*`): Protected with `CRON_SECRET` Bearer token validation
- Uses Supabase Auth to verify user sessions
- Checks `profiles.is_admin` before allowing admin access

**Configuration Required**:
- `CRON_SECRET` environment variable for cron job protection

### 2. API Rate Limiting

**File**: `src/lib/rateLimit.ts`

- Implemented rate limiting utility using Upstash Redis or Vercel KV
- Falls back to in-memory rate limiting in development
- Applied to:
  - `/api/vapi-webhook`: 100 requests/hour per IP
  - `/api/calls/[id]` (grading): 50 requests/hour per IP

**Configuration Required** (Optional):
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST API token

**Rate Limit Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### 3. Webhook Validation

**File**: `src/app/api/vapi-webhook/route.ts`

- Added `x-vapi-secret` header validation
- Verifies incoming webhooks are from Vapi, not malicious actors
- Returns 401 Unauthorized if secret doesn't match

**Configuration Required**:
- `VAPI_WEBHOOK_SECRET` environment variable
- Set this in Vapi dashboard webhook configuration

### 4. Audio Secure URLs

**File**: `src/app/api/calls/[id]/route.ts`

- Recording URLs now use Supabase signed URLs
- URLs expire after 60 minutes (3600 seconds)
- Prevents permanent public access to call recordings
- External URLs (e.g., Vapi recordings) are returned as-is

**Implementation**:
- Automatically generates signed URLs when fetching call data
- Uses Supabase Storage `createSignedUrl()` method

### 5. Client-Side Secret Leak Prevention

**Files**:
- `src/app/live-call/page.tsx`
- `src/components/VoiceButton.tsx`

**Issue Found**: `NEXT_PUBLIC_VAPI_API_KEY` was being used directly in client-side code.

**Solution**: 
- Created `/api/vapi/client-key` endpoint to fetch the key server-side
- Note: The key is still public (NEXT_PUBLIC_ prefix), but this centralizes access
- **Better approach**: Use server-side assistant creation and only pass assistant IDs to client

**Recommendation**: 
- Consider removing `NEXT_PUBLIC_VAPI_API_KEY` entirely
- Create assistants server-side via `/api/vapi/create-assistant`
- Only pass `assistantId` to client-side code

## 🔒 Environment Variables Checklist

### Required for Security

1. **CRON_SECRET** - Secret token for cron job authentication
2. **VAPI_WEBHOOK_SECRET** - Secret for validating Vapi webhooks
3. **SUPABASE_SERVICE_ROLE_KEY** - Server-side Supabase operations (NEVER expose to client)

### Optional for Enhanced Security

4. **UPSTASH_REDIS_REST_URL** - For production rate limiting
5. **UPSTASH_REDIS_REST_TOKEN** - For production rate limiting

## 🛡️ Security Best Practices Implemented

1. ✅ **Route Protection**: Admin and cron routes protected
2. ✅ **Rate Limiting**: Prevents DoS attacks on expensive operations
3. ✅ **Webhook Validation**: Ensures webhooks are from trusted sources
4. ✅ **Signed URLs**: Temporary access to sensitive audio files
5. ✅ **Secret Management**: No service role keys in client-side code

## 📝 Additional Recommendations

### 1. Implement Proper Authentication
- Currently using mock user IDs
- Should implement full Supabase Auth with email/password or OAuth
- Update `AuthContext` to use real session management

### 2. Remove NEXT_PUBLIC_VAPI_API_KEY
- Create all assistants server-side
- Only pass assistant IDs to client
- This eliminates the need for client-side API key

### 3. Add Request Logging
- Log all admin route access attempts
- Monitor rate limit violations
- Track webhook validation failures

### 4. Implement CORS Policies
- Restrict API access to specific origins
- Use Vercel's built-in CORS configuration

### 5. Add Input Validation
- Validate all webhook payloads
- Sanitize user inputs
- Use Zod or similar for schema validation

## 🚨 Security Incident Response

If a security issue is discovered:

1. **Immediately rotate**:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VAPI_WEBHOOK_SECRET`
   - `CRON_SECRET`
   - `OPENAI_API_KEY` (if compromised)

2. **Review logs** for:
   - Unauthorized access attempts
   - Rate limit violations
   - Webhook validation failures

3. **Update** all environment variables in Vercel

4. **Notify** affected users if data was compromised

## 📚 References

- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
