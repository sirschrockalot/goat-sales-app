# Security Documentation - GOAT Sales App

**Last Updated:** 2026-01-20
**Environment:** Heroku
**Sensitive Data Types:** API Keys/Secrets, Call Recordings/Transcripts

## Table of Contents
1. [Security Overview](#security-overview)
2. [Critical Vulnerabilities & Fixes](#critical-vulnerabilities--fixes)
3. [API Keys & Secrets Management](#api-keys--secrets-management)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Security](#database-security)
6. [Data Encryption](#data-encryption)
7. [Developer Security Guidelines](#developer-security-guidelines)
8. [Deployment Security (Heroku)](#deployment-security-heroku)
9. [Incident Response](#incident-response)
10. [Compliance & Standards](#compliance--standards)

---

## Security Overview

### Current Security Posture

**Strengths:**
- ✅ Comprehensive Row Level Security (RLS) on all database tables
- ✅ HTTPS enforcement across all endpoints
- ✅ Supabase Auth with JWT-based session management
- ✅ Middleware-based route protection for admin endpoints
- ✅ Rate limiting on webhook endpoints
- ✅ Proper secret management via environment variables

**Critical Gaps (MUST FIX):**
- 🚨 Client-side VAPI API key exposure
- 🚨 No encryption for call transcripts (stored in plain text)
- 🚨 Real test credentials committed in example files
- ⚠️ No application-level encryption for sensitive PII

---

## Critical Vulnerabilities & Fixes

### 🚨 CRITICAL #1: Client-Side VAPI Key Exposure

**Location:** `/src/app/api/vapi/client-key/route.ts`

**Issue:**
```typescript
// CURRENT (VULNERABLE):
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPI_API_KEY // ❌ Exposed to browser
  });
}
```

**Risk:**
- Anyone can view page source and obtain your VAPI API key
- Attackers can make unlimited VAPI calls on your behalf
- Consumes your VAPI credits fraudulently
- Potential for service abuse and billing fraud

**Fix (IMMEDIATE):**

1. **Remove `NEXT_PUBLIC_` prefix from environment variable**
   ```bash
   # .env - Change from:
   NEXT_PUBLIC_VAPI_API_KEY=your-key
   # To:
   VAPI_API_KEY=your-key  # Server-side only
   ```

2. **Create VAPI assistants server-side**
   - Move all VAPI assistant creation to API routes
   - Use server-side key for all VAPI operations
   - Return only the assistant ID to the client

3. **Implement server-side call initiation**
   ```typescript
   // NEW: /src/app/api/vapi/start-call/route.ts
   import { NextResponse } from 'next/server';
   import { createServerClient } from '@/lib/supabase';

   export async function POST(request: Request) {
     const supabase = createServerClient();
     const { data: { user } } = await supabase.auth.getUser();

     if (!user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     // Create VAPI call server-side with server-only key
     const response = await fetch('https://api.vapi.ai/call', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,  // ✅ Server-side only
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         assistantId: request.body.assistantId,
         customer: { number: request.body.phoneNumber }
       })
     });

     return NextResponse.json(await response.json());
   }
   ```

**Timeline:** Fix within 24 hours

---

### 🚨 CRITICAL #2: Unencrypted Call Transcripts

**Location:** `/supabase/migrations/20240101000000_create_calls_table.sql`

**Issue:**
- Call transcripts stored as plain TEXT in PostgreSQL
- Contains sensitive information: names, addresses, financial details
- Accessible to anyone with database access (DBAs, backups, compromised service role key)

**Fix (HIGH PRIORITY):**

**Option A: Field-Level Encryption with pgcrypto (Recommended)**

1. **Add migration to encrypt existing transcripts:**
   ```sql
   -- supabase/migrations/[timestamp]_encrypt_transcripts.sql

   -- Enable pgcrypto extension
   CREATE EXTENSION IF NOT EXISTS pgcrypto;

   -- Add encrypted column
   ALTER TABLE calls
   ADD COLUMN transcript_encrypted BYTEA;

   -- Encrypt existing transcripts
   UPDATE calls
   SET transcript_encrypted = pgp_sym_encrypt(
     transcript::TEXT,
     current_setting('app.encryption_key')
   )
   WHERE transcript IS NOT NULL;

   -- Drop old column (after verifying encryption works)
   -- ALTER TABLE calls DROP COLUMN transcript;
   ```

2. **Set encryption key in Heroku config:**
   ```bash
   heroku config:set TRANSCRIPT_ENCRYPTION_KEY=$(openssl rand -base64 32)
   ```

3. **Update application code to encrypt/decrypt:**
   ```typescript
   // src/lib/encryption.ts
   import { createServerClient } from '@/lib/supabase';

   export async function encryptTranscript(plaintext: string): Promise<Buffer> {
     const supabase = createServerClient();
     const { data, error } = await supabase.rpc('encrypt_transcript', {
       plaintext,
       encryption_key: process.env.TRANSCRIPT_ENCRYPTION_KEY
     });
     if (error) throw error;
     return Buffer.from(data, 'base64');
   }

   export async function decryptTranscript(encrypted: Buffer): Promise<string> {
     const supabase = createServerClient();
     const { data, error } = await supabase.rpc('decrypt_transcript', {
       encrypted: encrypted.toString('base64'),
       encryption_key: process.env.TRANSCRIPT_ENCRYPTION_KEY
     });
     if (error) throw error;
     return data;
   }
   ```

4. **Create database functions:**
   ```sql
   -- Encrypt function
   CREATE OR REPLACE FUNCTION encrypt_transcript(
     plaintext TEXT,
     encryption_key TEXT
   ) RETURNS TEXT AS $$
   BEGIN
     RETURN encode(
       pgp_sym_encrypt(plaintext, encryption_key),
       'base64'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Decrypt function
   CREATE OR REPLACE FUNCTION decrypt_transcript(
     encrypted TEXT,
     encryption_key TEXT
   ) RETURNS TEXT AS $$
   BEGIN
     RETURN pgp_sym_decrypt(
       decode(encrypted, 'base64'),
       encryption_key
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

**Option B: Supabase Vault (Future - when available)**
- Use Supabase's built-in encryption service
- Handles key rotation automatically
- More secure key storage

**Timeline:** Implement within 1 week

---

### 🚨 CRITICAL #3: Real Credentials in Repository

**Location:** `/env.development.example`

**Issue:**
```bash
# env.development.example (COMMITTED TO GIT)
NEXT_PUBLIC_VAPI_API_KEY=56f43f1e-abbe-4608-a503-9f4a47cdcc02  # ❌ Real test key
VAPI_SECRET_KEY=f26b6be1-47d5-4741-89fd-932bf582f7e9          # ❌ Real test key
```

**Risk:**
- Anyone with repository access has your test credentials
- Public repository = credentials leaked to entire internet
- Attackers can use test environment to probe for vulnerabilities

**Fix (IMMEDIATE):**

1. **Rotate compromised credentials:**
   ```bash
   # Generate new VAPI keys at https://vapi.ai/dashboard
   # Update in Heroku:
   heroku config:set VAPI_API_KEY=new-key-here
   heroku config:set VAPI_SECRET_KEY=new-secret-here
   ```

2. **Replace with placeholders:**
   ```bash
   # env.development.example
   VAPI_API_KEY=your-vapi-api-key-here
   VAPI_SECRET_KEY=your-vapi-secret-key-here
   OPENAI_API_KEY=sk-your-openai-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. **Audit git history:**
   ```bash
   # Check if real credentials were ever committed to main branch
   git log -p -- .env* env.* | grep -i "api.*key"

   # If found, consider using BFG Repo-Cleaner or git-filter-branch
   # to remove from history (requires force push - coordinate with team)
   ```

4. **Add pre-commit hook to prevent future leaks:**
   ```bash
   # .husky/pre-commit
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"

   # Check for potential secrets in staged files
   if git diff --cached --name-only | grep -E '\.env|env\.' | xargs grep -E '[A-Za-z0-9]{32,}' > /dev/null; then
     echo "❌ ERROR: Potential secret detected in env file"
     echo "Please use placeholder values in example files"
     exit 1
   fi
   ```

**Timeline:** Fix within 4 hours

---

## API Keys & Secrets Management

### Environment Variables Classification

| Variable | Type | Exposure | Location | Purpose |
|----------|------|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ✅ Client | Browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ✅ Client | Browser | Supabase anon/public key (RLS protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | ❌ Server only | Server | Bypasses RLS - admin access |
| `OPENAI_API_KEY` | **Secret** | ❌ Server only | Server | GPT API calls |
| `VAPI_API_KEY` | **Secret** | ❌ Server only | Server | VAPI call creation |
| `VAPI_SECRET_KEY` | **Secret** | ❌ Server only | Server | Webhook validation |
| `ELEVEN_LABS_API_KEY` | **Secret** | ❌ Server only | Server | Voice synthesis |
| `DEEPGRAM_API_KEY` | **Secret** | ❌ Server only | Server | Speech-to-text |
| `CRON_SECRET` | **Secret** | ❌ Server only | Server | Cron endpoint authentication |
| `TRANSCRIPT_ENCRYPTION_KEY` | **Secret** | ❌ Server only | Server | Field-level encryption |

### Rules for Adding New Secrets

1. **NEVER use `NEXT_PUBLIC_` prefix for secrets**
   - Only use for truly public values (URLs, public keys with RLS)

2. **Server-side only secrets must:**
   - Be accessed only in API routes (`/src/app/api/*`)
   - Never be imported in client components
   - Never be sent to the browser in responses

3. **Validate at runtime:**
   ```typescript
   // src/lib/config.ts
   function requireEnv(key: string): string {
     const value = process.env[key];
     if (!value) {
       throw new Error(`Missing required environment variable: ${key}`);
     }
     return value;
   }

   export const config = {
     openai: { apiKey: requireEnv('OPENAI_API_KEY') },
     vapi: {
       apiKey: requireEnv('VAPI_API_KEY'),
       secretKey: requireEnv('VAPI_SECRET_KEY')
     },
     supabase: {
       serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY')
     }
   };
   ```

4. **Use Heroku Config Vars (not .env files in production):**
   ```bash
   # Set secrets via CLI (never commit)
   heroku config:set OPENAI_API_KEY=sk-...

   # View current config
   heroku config

   # Delete old secrets
   heroku config:unset OLD_API_KEY
   ```

### Secret Rotation Schedule

| Secret | Rotation Frequency | Owner | Process |
|--------|-------------------|-------|---------|
| VAPI keys | Every 90 days | DevOps | Generate new key → Update Heroku → Test → Delete old |
| OpenAI key | Every 90 days | DevOps | Rotate via OpenAI dashboard |
| Supabase service role | Every 180 days | Admin | Regenerate in Supabase dashboard |
| CRON_SECRET | Every 90 days | DevOps | `openssl rand -base64 32` |
| Encryption keys | Every 365 days | Security | Re-encrypt all data with new key |

### Doppler Integration (Recommended)

**Why Doppler:**
- Centralized secret management
- Automatic synchronization with Heroku
- Secret versioning and audit logs
- Team access control

**Setup:**
```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Authenticate
doppler login

# Configure project
doppler setup

# Sync secrets to Heroku automatically
doppler secrets download --no-file --format env | xargs heroku config:set
```

---

## Authentication & Authorization

### Current Implementation

**Authentication System:** Supabase Auth (OAuth 2.0)
- JWT-based session tokens
- Stored in cookies: `sb-<project-ref>-auth-token`
- Automatic token refresh

**Authorization:**
- Role-Based Access Control (RBAC)
- User roles: `user`, `admin`, `manager`
- Admin flag: `profiles.is_admin` (BOOLEAN)

### Security Best Practices

#### 1. Route Protection Middleware

**Current implementation** (`/src/middleware.ts`):
```typescript
// ✅ GOOD: Protects admin routes
export async function middleware(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}
```

**Enhancement needed:**
```typescript
// Add session timeout check
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

const lastActivity = request.cookies.get('last_activity')?.value;
const sessionStart = request.cookies.get('session_start')?.value;

if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT) {
  // Session expired due to inactivity
  return NextResponse.redirect(new URL('/login?timeout=inactive', request.url));
}

if (sessionStart && Date.now() - parseInt(sessionStart) > ABSOLUTE_TIMEOUT) {
  // Session expired due to absolute timeout
  return NextResponse.redirect(new URL('/login?timeout=absolute', request.url));
}

// Update last activity
const response = NextResponse.next();
response.cookies.set('last_activity', Date.now().toString(), {
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
});
```

#### 2. API Route Authorization

**Pattern to follow:**
```typescript
// src/app/api/admin/*/route.ts
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Step 1: Verify authentication
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Step 2: Verify authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    // Log unauthorized access attempt
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'unauthorized_admin_access',
      resource: request.url,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  // Step 3: Proceed with business logic
  // ...
}
```

#### 3. Admin Audit Logging

**Create audit log table:**
```sql
-- supabase/migrations/[timestamp]_create_audit_logs.sql

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS: Only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Only service role can insert
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

**Log all admin actions:**
```typescript
// src/lib/audit.ts
import { createServerClient } from '@/lib/supabase';

export async function logAdminAction(params: {
  userId: string;
  action: string;
  resource?: string;
  details?: Record<string, any>;
  request?: Request;
}) {
  const supabase = createServerClient();

  const ipAddress = params.request?.headers.get('x-forwarded-for') ||
                    params.request?.headers.get('x-real-ip');
  const userAgent = params.request?.headers.get('user-agent');

  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    resource: params.resource,
    details: params.details,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

// Usage example:
await logAdminAction({
  userId: user.id,
  action: 'view_user_transcript',
  resource: `/calls/${callId}`,
  details: { callId, transcriptLength: transcript.length },
  request
});
```

#### 4. Session Security

**Cookie configuration:**
```typescript
// Ensure cookies are secure
const cookieOptions = {
  httpOnly: true,        // ✅ Prevents XSS access
  secure: true,          // ✅ HTTPS only
  sameSite: 'lax' as const,  // ✅ CSRF protection
  maxAge: 60 * 60 * 8,   // 8 hours
  path: '/'
};

response.cookies.set('session_token', token, cookieOptions);
```

**CSRF protection:**
- Supabase Auth handles CSRF tokens automatically
- For custom forms, use `csrf` package:
  ```typescript
  import { csrf } from '@/lib/csrf';

  export async function POST(request: Request) {
    const valid = await csrf.verify(request);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    // ...
  }
  ```

---

## Database Security

### Row Level Security (RLS) Policies

**All tables MUST have RLS enabled.** This is our primary defense against unauthorized data access.

#### Current RLS Coverage

| Table | RLS Enabled | Policies | Status |
|-------|-------------|----------|--------|
| `calls` | ✅ Yes | Users own calls, admins can view all | ✅ Secure |
| `profiles` | ✅ Yes | Users own profile | ✅ Secure |
| `badges` | ✅ Yes | Users own badges | ✅ Secure |
| `script_segments` | ✅ Yes | All authenticated can read | ✅ Secure |
| `dispo_script_segments` | ✅ Yes | All read, admins modify | ✅ Secure |
| `billing_logs` | ✅ Yes | Service role only | ✅ Secure |
| `sandbox_*` tables | ✅ Yes | Service role only | ✅ Secure |
| `vapi_assistant_cache` | ⚠️ Check | TBD | ⚠️ Verify |

#### RLS Best Practices

**1. Always enable RLS on new tables:**
```sql
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  -- ... other columns
);

-- ALWAYS add this:
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

**2. Standard user data policy:**
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own records"
  ON new_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON new_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON new_table FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON new_table FOR DELETE
  USING (auth.uid() = user_id);
```

**3. Admin override policy (with audit logging):**
```sql
-- Admins can view all records (for support purposes)
CREATE POLICY "Admins can view all records"
  ON calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Create trigger to log admin access
CREATE OR REPLACE FUNCTION log_admin_call_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if accessor is admin (not the call owner)
  IF auth.uid() != NEW.user_id THEN
    INSERT INTO audit_logs (user_id, action, resource, details)
    VALUES (
      auth.uid(),
      'admin_view_call',
      'calls/' || NEW.id,
      jsonb_build_object('call_user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_admin_call_access
  AFTER SELECT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_call_access();
```

**4. Service role only policy:**
```sql
-- For sensitive system tables (AI training data, etc.)
CREATE POLICY "Service role only"
  ON sandbox_personas FOR ALL
  USING (auth.role() = 'service_role');
```

#### Testing RLS Policies

**Always test RLS before deploying:**
```sql
-- Test as regular user
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'user-uuid-here';

SELECT * FROM calls; -- Should only return user's own calls

-- Test as different user
SET request.jwt.claims.sub TO 'different-user-uuid';
SELECT * FROM calls; -- Should return different set

-- Test as anonymous
RESET ROLE;
SELECT * FROM calls; -- Should return nothing or public data only
```

**Automated RLS testing (recommended):**
```typescript
// tests/rls/calls.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Calls RLS', () => {
  it('users can only see their own calls', async () => {
    const user1Client = createClient(url, anonKey, { auth: { user1Token } });
    const user2Client = createClient(url, anonKey, { auth: { user2Token } });

    const { data: user1Calls } = await user1Client.from('calls').select('*');
    const { data: user2Calls } = await user2Client.from('calls').select('*');

    expect(user1Calls.every(call => call.user_id === user1.id)).toBe(true);
    expect(user2Calls.every(call => call.user_id === user2.id)).toBe(true);
    expect(user1Calls.find(call => call.user_id === user2.id)).toBeUndefined();
  });

  it('admins can see all calls', async () => {
    const adminClient = createClient(url, anonKey, { auth: { adminToken } });
    const { data: allCalls } = await adminClient.from('calls').select('*');

    expect(allCalls.length).toBeGreaterThan(0);
    // Should include calls from multiple users
    const uniqueUserIds = new Set(allCalls.map(c => c.user_id));
    expect(uniqueUserIds.size).toBeGreaterThan(1);
  });
});
```

### SQL Injection Prevention

**✅ GOOD: Using Supabase client (parameterized queries)**
```typescript
// Supabase automatically parameterizes queries
const { data } = await supabase
  .from('calls')
  .select('*')
  .eq('user_id', userId)  // ✅ Safe - parameterized
  .ilike('transcript', `%${searchTerm}%`);  // ✅ Safe - parameterized
```

**❌ BAD: Raw SQL with string interpolation**
```typescript
// NEVER DO THIS:
const { data } = await supabase.rpc('execute_sql', {
  query: `SELECT * FROM calls WHERE user_id = '${userId}'`  // ❌ SQL injection!
});
```

**✅ GOOD: Using Postgres functions with parameters**
```sql
-- Define function with typed parameters
CREATE OR REPLACE FUNCTION search_calls(
  p_user_id UUID,
  p_search_term TEXT
) RETURNS TABLE (id UUID, transcript TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.transcript
  FROM calls c
  WHERE c.user_id = p_user_id  -- ✅ Safe - parameterized
  AND c.transcript ILIKE '%' || p_search_term || '%';  -- ✅ Safe - parameterized
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Database Connection Security

**Connection strings:**
```bash
# ✅ Use connection pooler for serverless (Heroku)
DATABASE_URL=postgresql://user:pass@db.supabase.co:6543/postgres?pgbouncer=true

# ❌ Don't use direct connection (port 5432) in production
# DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
```

**Connection limits:**
- Supabase free tier: 60 connections
- Use pooling to stay within limits
- Monitor with: `SELECT count(*) FROM pg_stat_activity;`

---

## Data Encryption

### Encryption in Transit (HTTPS/TLS)

**Current status:** ✅ All connections encrypted

**Heroku automatic HTTPS:**
- All `*.herokuapp.com` domains have automatic SSL
- Custom domains require SSL cert (automatic with Heroku SSL)

**Enforce HTTPS in Next.js:**
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  // Redirect HTTP to HTTPS (Heroku handles this, but double-check)
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol === 'http') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
  // ... rest of middleware
}
```

**Verify TLS version:**
```bash
# Ensure TLS 1.2+ is used
curl -I --tlsv1.2 https://your-app.herokuapp.com
```

### Encryption at Rest

#### Database Encryption

**Supabase built-in encryption:**
- ✅ All data encrypted at rest (AES-256)
- ✅ Automatic backup encryption
- ✅ Managed by Supabase (no configuration needed)

**Application-level encryption (for extra sensitive fields):**

See [Critical #2: Unencrypted Call Transcripts](#-critical-2-unencrypted-call-transcripts) for implementation.

**Key points:**
- Use `pgcrypto` extension for field-level encryption
- Store encryption key in Heroku config (not database)
- Rotate keys annually
- Document encrypted fields

#### File Storage Encryption

**Call recordings (if stored):**
```typescript
// If using Supabase Storage for recordings
const { data, error } = await supabase.storage
  .from('call-recordings')
  .upload(`${userId}/${callId}.mp3`, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'audio/mpeg',
    // Supabase Storage encrypts at rest automatically
  });

// Generate signed URL (expires in 1 hour)
const { data: signedUrl } = await supabase.storage
  .from('call-recordings')
  .createSignedUrl(`${userId}/${callId}.mp3`, 3600);
```

**Never use public buckets for sensitive files:**
```sql
-- Ensure bucket is private
UPDATE storage.buckets
SET public = FALSE
WHERE name = 'call-recordings';

-- RLS policy for storage
CREATE POLICY "Users can only access own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
```

### PII Redaction (Optional but Recommended)

**For regulatory compliance (GDPR, CCPA):**

```typescript
// src/lib/pii-redaction.ts
export function redactPII(transcript: string): string {
  // Redact phone numbers
  transcript = transcript.replace(
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    '[PHONE_REDACTED]'
  );

  // Redact email addresses
  transcript = transcript.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL_REDACTED]'
  );

  // Redact SSN
  transcript = transcript.replace(
    /\b\d{3}-\d{2}-\d{4}\b/g,
    '[SSN_REDACTED]'
  );

  // Redact credit card numbers
  transcript = transcript.replace(
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    '[CC_REDACTED]'
  );

  return transcript;
}

// Use before storing transcript
await supabase.from('calls').insert({
  user_id: userId,
  transcript: redactPII(rawTranscript),
  transcript_raw: encryptTranscript(rawTranscript), // Keep encrypted original
  // ...
});
```

---

## Developer Security Guidelines

### Code Review Checklist

Before merging any PR, verify:

- [ ] No secrets or API keys hardcoded in code
- [ ] All new API routes have authentication checks
- [ ] All new database tables have RLS enabled and tested
- [ ] User input is validated and sanitized
- [ ] SQL queries use parameterized queries (no string interpolation)
- [ ] File uploads validate file type and size
- [ ] Error messages don't leak sensitive information
- [ ] Admin routes are protected by middleware
- [ ] New environment variables documented in README
- [ ] Sensitive operations logged to audit trail

### Input Validation

**Always validate user input:**

```typescript
// src/lib/validation.ts
import { z } from 'zod';

// Define schemas
export const CallSchema = z.object({
  phoneNumber: z.string().regex(/^\+?1?\d{10,14}$/),
  assistantId: z.string().uuid(),
  duration: z.number().min(0).max(3600) // Max 1 hour
});

export const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin', 'manager'])
});

// Use in API routes
export async function POST(request: Request) {
  const body = await request.json();

  // Validate
  const result = CallSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Use validated data
  const { phoneNumber, assistantId, duration } = result.data;
  // ...
}
```

**Prevent XSS:**
```typescript
// When displaying user-generated content
import DOMPurify from 'isomorphic-dompurify';

function DisplayTranscript({ transcript }: { transcript: string }) {
  // Sanitize HTML before rendering
  const sanitized = DOMPurify.sanitize(transcript);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Prevent command injection:**
```typescript
// ❌ NEVER do this:
const output = execSync(`ffmpeg -i ${userFilename}.mp3 output.wav`);

// ✅ Use parameterized commands
import { spawn } from 'child_process';

const ffmpeg = spawn('ffmpeg', ['-i', `${userFilename}.mp3`, 'output.wav']);
```

### Error Handling

**Don't leak information in errors:**

```typescript
// ❌ BAD: Leaks database structure
catch (error) {
  return NextResponse.json({
    error: error.message // "column 'secret_key' does not exist"
  }, { status: 500 });
}

// ✅ GOOD: Generic error + logging
catch (error) {
  console.error('Failed to process request:', error);

  // Log full error server-side
  await logError({
    error,
    context: { userId, action: 'create_call' }
  });

  // Return generic error to client
  return NextResponse.json({
    error: 'An error occurred processing your request. Please try again.'
  }, { status: 500 });
}
```

### Dependency Security

**Audit dependencies regularly:**
```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# For manual fixes
npm audit fix --force
```

**Use Dependabot (GitHub):**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
```

**Pin critical dependencies:**
```json
// package.json
{
  "dependencies": {
    "@supabase/supabase-js": "2.39.0",  // Exact version
    "next": "^14.0.0",  // Allow patches
    "openai": "~4.20.0"  // Allow patches, not minor
  }
}
```

### Secure Coding Patterns

**1. Least privilege principle:**
```typescript
// Use anon client for user operations
const supabase = createBrowserClient(); // ✅ RLS enforced

// Only use service role when absolutely necessary
const supabaseAdmin = createServerClient(); // ⚠️ Bypasses RLS
```

**2. Defense in depth:**
```typescript
// Multiple layers of security
export async function deleteCall(callId: string) {
  // Layer 1: Authentication (middleware)
  // Layer 2: RLS (database)
  // Layer 3: Additional check in code
  const { data: call } = await supabase
    .from('calls')
    .select('user_id')
    .eq('id', callId)
    .single();

  if (call.user_id !== userId) {
    throw new Error('Unauthorized'); // Extra check beyond RLS
  }

  // Layer 4: Soft delete (don't actually delete)
  await supabase
    .from('calls')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', callId);
}
```

**3. Fail securely:**
```typescript
// Default to denying access
function checkPermission(user: User, resource: Resource): boolean {
  try {
    // Complex permission logic
    return user.permissions.includes(resource.requiredPermission);
  } catch (error) {
    // On error, deny access (don't grant)
    console.error('Permission check failed:', error);
    return false; // ✅ Fail closed, not open
  }
}
```

---

## Deployment Security (Heroku)

### Heroku Configuration

**Required environment variables:**
```bash
# Production checklist
heroku config:set NODE_ENV=production
heroku config:set NPM_CONFIG_PRODUCTION=false  # Allow devDependencies for build

# Secrets (from secure source, never committed)
heroku config:set OPENAI_API_KEY=$OPENAI_KEY
heroku config:set VAPI_API_KEY=$VAPI_KEY
heroku config:set VAPI_SECRET_KEY=$VAPI_SECRET
heroku config:set SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY
heroku config:set CRON_SECRET=$(openssl rand -base64 32)
heroku config:set TRANSCRIPT_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Public values (safe to document)
heroku config:set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Security Headers

**Add security headers to all responses:**

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vapi.ai",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.vapi.ai",
      "media-src 'self' blob:",
      "frame-src 'none'"
    ].join('; ')
  );

  // Strict Transport Security (HSTS)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=()'
  );

  return response;
}
```

**Or use Next.js config:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

### Rate Limiting

**Protect against brute force and DDoS:**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const ratelimit = {
  // Strict limit for auth endpoints
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 min
    analytics: true
  }),

  // Normal limit for API
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
    analytics: true
  }),

  // Generous limit for webhooks
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'),
    analytics: true
  })
};

// Use in API routes
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success, limit, reset, remaining } = await ratelimit.auth.limit(ip);

  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((reset - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString()
        }
      }
    );
  }

  // Process request
  // ...
}
```

### CRON Job Security

**Current implementation** (✅ Good):

```typescript
// src/middleware.ts
if (request.nextUrl.pathname.startsWith('/api/cron/')) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

**Heroku Scheduler setup:**
```bash
# Install addon
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler

# Add job (via UI):
# Command: curl -X POST https://your-app.herokuapp.com/api/cron/daily-cleanup -H "Authorization: Bearer $CRON_SECRET"
# Frequency: Daily at 2:00 AM UTC
```

**Better: Use Heroku config for auth:**
```bash
# In Heroku Scheduler, commands have access to config vars
curl -X POST https://your-app.herokuapp.com/api/cron/daily-cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Monitoring and Alerts

**Log security events:**
```typescript
// src/lib/logger.ts
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'unauthorized_access' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  details?: Record<string, any>;
}) {
  // Log to Heroku logs
  console.error('SECURITY_EVENT:', JSON.stringify(event));

  // Also store in database for analysis
  supabase.from('security_events').insert({
    event_type: event.type,
    user_id: event.userId,
    ip_address: event.ip,
    details: event.details,
    timestamp: new Date().toISOString()
  });

  // Alert on critical events
  if (event.type === 'suspicious_activity') {
    // Send alert (email, Slack, PagerDuty, etc.)
    sendAlert(event);
  }
}
```

**Monitor with Heroku metrics:**
```bash
# View logs
heroku logs --tail --app your-app

# Filter for security events
heroku logs --tail | grep "SECURITY_EVENT"

# Set up log drains (send to external service)
heroku drains:add https://logs.example.com/heroku --app your-app
```

**Recommended monitoring tools:**
- **Sentry** - Error tracking and performance monitoring
- **LogDNA / Papertrail** - Log aggregation and search
- **New Relic** - APM and infrastructure monitoring
- **Datadog** - Full-stack observability

---

## Incident Response

### Security Incident Classification

| Severity | Description | Example | Response Time |
|----------|-------------|---------|---------------|
| **P0 - Critical** | Active breach, data exposed | API key leaked publicly | Immediate (< 15 min) |
| **P1 - High** | Vulnerability discovered | SQL injection found | < 4 hours |
| **P2 - Medium** | Potential vulnerability | Outdated dependency | < 24 hours |
| **P3 - Low** | Security improvement | Missing security header | < 1 week |

### Incident Response Playbook

#### Phase 1: Detection and Triage (0-15 minutes)

**When you discover a security issue:**

1. **Assess severity** using table above
2. **Contain immediately** if P0/P1:
   ```bash
   # Rotate compromised credentials
   heroku config:set OLD_KEY=$(openssl rand -base64 32)

   # Revoke at source
   # - OpenAI: https://platform.openai.com/api-keys
   # - VAPI: Dashboard
   # - Supabase: Project settings > API
   ```
3. **Document everything**:
   ```markdown
   # Incident Report: [Brief Description]
   - **Discovered:** [Timestamp]
   - **Reporter:** [Name]
   - **Severity:** [P0/P1/P2/P3]
   - **Affected systems:** [List]
   - **Initial assessment:** [What you know so far]
   ```

#### Phase 2: Containment (15-60 minutes)

**For leaked credentials (P0):**

1. **Rotate all possibly affected secrets:**
   ```bash
   # Generate new keys
   NEW_OPENAI_KEY=sk-...  # From OpenAI dashboard
   NEW_VAPI_KEY=...       # From VAPI dashboard
   NEW_CRON_SECRET=$(openssl rand -base64 32)

   # Update Heroku
   heroku config:set OPENAI_API_KEY=$NEW_OPENAI_KEY
   heroku config:set VAPI_API_KEY=$NEW_VAPI_KEY
   heroku config:set CRON_SECRET=$NEW_CRON_SECRET

   # Delete old keys from providers
   ```

2. **Check for unauthorized usage:**
   ```bash
   # OpenAI usage
   curl https://api.openai.com/v1/usage \
     -H "Authorization: Bearer $OPENAI_API_KEY"

   # VAPI usage
   # Check dashboard for unexpected calls

   # Supabase logs
   # Check Supabase dashboard > Logs > API
   ```

3. **Block attacker if identified:**
   ```typescript
   // Add IP to blocklist
   const BLOCKED_IPS = process.env.BLOCKED_IPS?.split(',') || [];

   if (BLOCKED_IPS.includes(ip)) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```

**For data breach (P0):**

1. **Identify scope:**
   ```sql
   -- Check access logs
   SELECT DISTINCT user_id, ip_address, timestamp
   FROM audit_logs
   WHERE action LIKE '%unauthorized%'
   AND timestamp > NOW() - INTERVAL '24 hours'
   ORDER BY timestamp DESC;

   -- Check affected users
   SELECT COUNT(DISTINCT user_id) as affected_users
   FROM calls
   WHERE updated_at > 'suspected-breach-timestamp';
   ```

2. **Preserve evidence:**
   ```bash
   # Export logs before rotation
   heroku logs --num 10000 > incident-logs-$(date +%Y%m%d).txt

   # Backup database state
   heroku pg:backups:capture
   ```

3. **Notify stakeholders:**
   - Internal team (immediately)
   - Affected users (within 72 hours for GDPR)
   - Regulatory bodies (if required)

#### Phase 3: Eradication (1-4 hours)

**Fix the root cause:**

1. **Patch vulnerability:**
   ```bash
   # Fix code
   git checkout -b hotfix/security-issue
   # Make fixes
   git commit -m "fix: [P0] Patch security vulnerability"
   git push origin hotfix/security-issue

   # Emergency deploy (skip normal review for P0)
   git checkout main
   git merge hotfix/security-issue
   git push origin main

   # Deploy immediately
   git push heroku main
   ```

2. **Verify fix:**
   ```bash
   # Test in production
   curl https://your-app.herokuapp.com/vulnerable-endpoint

   # Run security scan
   npm audit
   npm run test:security  # If you have security tests
   ```

#### Phase 4: Recovery (4-24 hours)

**Restore normal operations:**

1. **Monitor for recurrence:**
   ```bash
   # Watch logs for 24 hours
   heroku logs --tail | grep -i "security\|unauthorized\|error"
   ```

2. **Verify no ongoing compromise:**
   ```sql
   -- Check for suspicious activity
   SELECT * FROM audit_logs
   WHERE timestamp > 'incident-start'
   ORDER BY timestamp DESC;
   ```

3. **Communicate resolution:**
   - Update incident report
   - Notify users if data was exposed
   - Post incident review with team

#### Phase 5: Lessons Learned (1-7 days)

**Post-incident review:**

```markdown
# Incident Post-Mortem

## Incident Summary
- **Date:** [Date]
- **Duration:** [X hours]
- **Severity:** [P0/P1/P2/P3]
- **Impact:** [Users affected, data exposed, downtime]

## Timeline
- [00:00] Incident detected
- [00:15] Initial containment
- [01:00] Root cause identified
- [02:00] Fix deployed
- [04:00] Monitoring resumed
- [24:00] All-clear declared

## Root Cause
[Detailed explanation of what went wrong]

## What Went Well
- Quick detection
- Fast response time
- Effective communication

## What Went Wrong
- Delayed discovery
- Inadequate monitoring
- Missing safeguards

## Action Items
- [ ] Implement [preventive measure] (Owner: [Name], Due: [Date])
- [ ] Add monitoring for [metric] (Owner: [Name], Due: [Date])
- [ ] Update documentation (Owner: [Name], Due: [Date])
- [ ] Train team on [topic] (Owner: [Name], Due: [Date])

## Preventive Measures
[How to prevent this from happening again]
```

### Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Security Lead | [Name] | [Email/Phone] | 24/7 |
| DevOps Engineer | [Name] | [Email/Phone] | Business hours |
| CTO/Technical Lead | [Name] | [Email/Phone] | On-call |
| Legal/Compliance | [Name] | [Email/Phone] | Business hours |

**External contacts:**
- **Heroku Support:** https://help.heroku.com/
- **Supabase Support:** support@supabase.com
- **OpenAI Security:** security@openai.com

---

## Compliance & Standards

### Regulatory Compliance

**Applicable regulations (depending on your users):**

| Regulation | Applies If | Requirements | Status |
|------------|-----------|--------------|--------|
| **GDPR** | EU users | Data consent, right to deletion, breach notification (72h) | ⚠️ Partial |
| **CCPA** | California users | Data disclosure, opt-out, deletion | ⚠️ Partial |
| **HIPAA** | Health data | Encryption, access controls, audit logs | ❌ Not applicable |
| **SOC 2** | Enterprise customers | Security controls, availability, confidentiality | ❌ Not implemented |
| **PCI-DSS** | Credit card data | Never store card data, use payment processor | ✅ N/A (no cards stored) |

### GDPR Compliance Checklist

**If you have EU users, implement:**

- [ ] **Consent management**
  - [ ] Cookie consent banner
  - [ ] Explicit opt-in for data processing
  - [ ] Granular consent options

- [ ] **Data subject rights**
  - [ ] Right to access (data export)
  - [ ] Right to deletion (delete account + data)
  - [ ] Right to rectification (edit profile)
  - [ ] Right to data portability (export in machine-readable format)

- [ ] **Privacy by design**
  - [ ] Data minimization (only collect what's needed)
  - [ ] Purpose limitation (clear purpose for each data field)
  - [ ] Storage limitation (retention policies)

- [ ] **Documentation**
  - [ ] Privacy policy (publicly accessible)
  - [ ] Data processing agreements (with vendors)
  - [ ] Records of processing activities

**Implementation example:**

```typescript
// src/app/api/user/export-data/route.ts
export async function GET(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Export all user data (GDPR Article 20)
  const [profile, calls, badges] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('calls').select('*').eq('user_id', user.id),
    supabase.from('badges').select('*').eq('user_id', user.id)
  ]);

  const exportData = {
    user: { id: user.id, email: user.email },
    profile: profile.data,
    calls: calls.data,
    badges: badges.data,
    exported_at: new Date().toISOString()
  };

  // Return as JSON
  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="user-data-${user.id}.json"`
    }
  });
}
```

```typescript
// src/app/api/user/delete/route.ts
export async function DELETE(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Soft delete (retain for legal/audit purposes)
  await supabase.from('profiles').update({
    deleted_at: new Date().toISOString(),
    email: `deleted-${user.id}@example.com`, // Anonymize
    name: 'Deleted User'
  }).eq('id', user.id);

  // Hard delete after retention period (run via cron)
  // DELETE FROM profiles WHERE deleted_at < NOW() - INTERVAL '30 days'

  // Log deletion request
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'account_deletion_requested',
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ success: true });
}
```

### Data Retention Policy

**Recommended retention periods:**

| Data Type | Retention | Reason | Implementation |
|-----------|-----------|--------|----------------|
| Call transcripts | 90 days | Business need | Auto-delete via cron |
| Call recordings | 30 days | Legal compliance | Auto-delete via cron |
| Audit logs | 1 year | Security investigation | Partition by month |
| User accounts (deleted) | 30 days | Grace period | Soft delete → hard delete |
| Billing records | 7 years | Tax law | Never delete |

**Implement with cron job:**

```typescript
// src/app/api/cron/data-retention/route.ts
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Delete old transcripts (90 days)
  const { data: deletedTranscripts } = await supabase
    .from('calls')
    .update({ transcript: null, transcript_encrypted: null })
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .not('transcript', 'is', null);

  // Delete old recordings (30 days)
  const { data: deletedRecordings } = await supabase
    .from('calls')
    .update({ recording_url: null })
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not('recording_url', 'is', null);

  // Hard delete accounts deleted >30 days ago
  const { data: deletedAccounts } = await supabase
    .from('profiles')
    .delete()
    .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not('deleted_at', 'is', null);

  return NextResponse.json({
    success: true,
    deleted: {
      transcripts: deletedTranscripts?.length || 0,
      recordings: deletedRecordings?.length || 0,
      accounts: deletedAccounts?.length || 0
    }
  });
}
```

### Security Standards Compliance

**Industry best practices to follow:**

- ✅ **OWASP Top 10** (2021)
  - [ ] Broken Access Control → Fix with RLS
  - [ ] Cryptographic Failures → Implement encryption
  - [ ] Injection → Use parameterized queries
  - [ ] Insecure Design → Security by design
  - [ ] Security Misconfiguration → Security headers
  - [ ] Vulnerable Components → Dependency audits
  - [ ] Identification/Authentication Failures → MFA, strong passwords
  - [ ] Software/Data Integrity Failures → Verify dependencies
  - [ ] Security Logging/Monitoring Failures → Audit logs
  - [ ] Server-Side Request Forgery → Validate URLs

- ✅ **CIS Benchmarks**
  - Use strong, unique passwords for all accounts
  - Enable MFA for admin accounts
  - Regularly update dependencies
  - Enable audit logging
  - Implement least privilege access

- ✅ **NIST Cybersecurity Framework**
  - Identify: Asset inventory, risk assessment
  - Protect: Access control, encryption
  - Detect: Monitoring, anomaly detection
  - Respond: Incident response plan
  - Recover: Backup and restore procedures

---

## Security Checklist for Production Launch

**Before going live, verify:**

### Critical (Must Fix)
- [ ] All API keys moved to server-side only (no `NEXT_PUBLIC_` for secrets)
- [ ] Real credentials removed from repository
- [ ] Row Level Security enabled on all tables
- [ ] HTTPS enforced on all endpoints
- [ ] Call transcripts encrypted at rest
- [ ] Rate limiting implemented on public endpoints
- [ ] Security headers configured
- [ ] CRON endpoints protected with secret

### High Priority (Should Fix)
- [ ] Audit logging for admin actions
- [ ] Session timeout enforcement
- [ ] Input validation on all API routes
- [ ] Error messages don't leak sensitive info
- [ ] Admin access to user data logged
- [ ] Data retention policies implemented
- [ ] Dependency audit passing (`npm audit`)

### Medium Priority (Nice to Have)
- [ ] PII redaction in transcripts
- [ ] Field-level encryption for sensitive data
- [ ] Security monitoring/alerting configured
- [ ] Incident response plan documented
- [ ] GDPR compliance tools (if applicable)
- [ ] Penetration testing completed
- [ ] Security training for developers

### Ongoing (Post-Launch)
- [ ] Weekly dependency audits
- [ ] Monthly security log reviews
- [ ] Quarterly secret rotation
- [ ] Annual penetration testing
- [ ] Security incident drills

---

## Additional Resources

### Documentation
- **Supabase Security:** https://supabase.com/docs/guides/platform/security
- **Next.js Security:** https://nextjs.org/docs/app/building-your-application/deploying/production-checklist#security
- **Heroku Security:** https://www.heroku.com/policy/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

### Tools
- **npm audit** - Dependency vulnerability scanning
- **Snyk** - Automated security scanning
- **Dependabot** - Automated dependency updates
- **git-secrets** - Prevent committing secrets
- **Sentry** - Error tracking and monitoring
- **Upstash** - Rate limiting and caching

### Training
- **OWASP WebGoat** - Hands-on security training
- **PortSwigger Academy** - Web security tutorials
- **Supabase Security Docs** - Platform-specific guides

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-20 | Security Team | Initial security documentation |

---

**Questions or concerns?** Contact the security team at security@example.com

**Report a vulnerability:** security@example.com (PGP key available on request)
