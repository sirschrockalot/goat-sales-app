# Environment Parity Setup

Complete guide for achieving total environment parity across multiple development laptops using Docker, Supabase CLI, and Doppler.

## Overview

This setup ensures:
- ✅ **Identical environments** across all development machines
- ✅ **Centralized secrets** via Doppler
- ✅ **Local database** mirroring Supabase Sandbox
- ✅ **Hot-reload** development with Docker volumes
- ✅ **One-command setup** with `npm run init`

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Development Machine              │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Docker     │  │   Doppler    │    │
│  │  Container   │  │   Secrets    │    │
│  │              │  │              │    │
│  │  - App       │  │  - API Keys  │    │
│  │  - Postgres  │  │  - DB URLs   │    │
│  │  - Redis     │  │  - Tokens    │    │
│  └──────────────┘  └──────────────┘    │
│           │                              │
│           ▼                              │
│  ┌──────────────┐                       │
│  │  Supabase    │                       │
│  │  CLI (Local) │                       │
│  │              │                       │
│  │  - Migrations│                       │
│  │  - Seed Data │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

1. **Node.js 20+**
   ```bash
   node --version  # Should be v20.x or higher
   ```

2. **Docker & Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```
   Install: https://docs.docker.com/get-docker/

3. **Supabase CLI**
   ```bash
   supabase --version
   ```
   Install: https://supabase.com/docs/guides/cli

4. **Doppler CLI** (Optional but recommended)
   ```bash
   doppler --version
   ```
   Install: https://docs.doppler.com/docs/install-cli

---

## Quick Start

### One-Command Setup

```bash
npm run init
```

This script automatically:
1. ✅ Installs npm dependencies
2. ✅ Sets up Doppler authentication
3. ✅ Initializes Supabase local database
4. ✅ Launches Docker services
5. ✅ Verifies environment

### Manual Setup

If you prefer step-by-step:

```bash
# 1. Install dependencies
npm install

# 2. Setup Doppler (if using)
doppler login
doppler setup

# 3. Initialize Supabase
supabase start

# 4. Launch Docker
docker-compose up -d
```

---

## Docker Services

### App Service

- **Image**: Node 20 Alpine
- **Port**: 3000
- **Volumes**: Hot-reload for `/src`, `/scripts`, `/supabase`
- **Command**: `npm run dev`

### Postgres Service

- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432
- **Database**: `sandbox`
- **Credentials**: `postgres/postgres` (local only)
- **Volumes**: Persistent data, migrations, seed

### Redis Service

- **Image**: Redis 7 Alpine
- **Port**: 6379
- **Purpose**: Task queues for autonomous training

---

## Configuration Priority

The system uses a **priority-based configuration**:

```
1. Doppler (process.env) ← Highest Priority
2. Docker Environment Variables
3. Supabase Local Defaults
4. Hardcoded Fallbacks ← Lowest Priority
```

### Example: Database URL

```typescript
// Priority 1: Doppler secret
DOPPLER_SECRET__LOCAL_DB_URL=postgresql://...

// Priority 2: Docker env var
LOCAL_DB_URL=postgresql://postgres:postgres@postgres:5432/sandbox

// Priority 3: Default fallback
'postgresql://localhost:5432/sandbox'
```

---

## Doppler Setup

### 1. Create Doppler Project

```bash
doppler projects create goat-sales-app
```

### 2. Create Configs

```bash
# Development config
doppler configs create dev

# Production config
doppler configs create prod
```

### 3. Add Secrets

```bash
# Set secrets for dev config
doppler secrets set OPENAI_API_KEY=sk-... --config dev
doppler secrets set SUPABASE_URL=https://... --config dev
doppler secrets set VAPI_SECRET_KEY=... --config dev
# ... etc
```

### 4. Setup Local Machine

```bash
doppler setup --project goat-sales-app --config dev
```

### 5. Run with Doppler

```bash
# Inject secrets into environment
doppler run -- npm run dev

# Or use in scripts
doppler run -- npm run sandbox:generate-personas
```

---

## Supabase Local Development

### Directory Structure

```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # Database migrations (tracked in git)
│   ├── 20240101000028_create_sandbox_personas_table.sql
│   └── ...
└── seed.sql            # Seed data (tracked in git)
    ├── 50 Killer Personas
    ├── Golden Call Transcript
    └── Market Data Placeholders
```

### Commands

```bash
# Start Supabase (runs migrations + seed.sql)
supabase start

# Stop Supabase
supabase stop

# Reset database (fresh start)
supabase db reset

# View status
supabase status

# Access Supabase Studio
# http://localhost:54323
```

### Seed Data

The `seed.sql` file contains:

1. **50 Killer Seller Personas**
   - All personas from `scripts/personaGenerator.ts`
   - Ready for autonomous battle training

2. **Golden Call Transcript**
   - Sample "perfect" call demonstrating Eric Cline methodology
   - Baseline for AI training

3. **Market Data Placeholders**
   - Sample market intelligence data
   - Populated from InvestorBase/Zillow APIs in production

---

## Docker Compose

### Services

```yaml
services:
  app:        # Node.js application
  postgres:   # Local database
  redis:      # Task queue
```

### Volumes

- **Hot-reload volumes**: `/src`, `/scripts`, `/supabase`
- **Persistent volumes**: `postgres_data`, `redis_data`
- **Excluded**: `/node_modules` (uses container's)

### Environment Variables

```yaml
environment:
  - NODE_ENV=development
  - USE_LOCAL_DB=true
  - LOCAL_DB_URL=postgresql://postgres:postgres@postgres:5432/sandbox
  - REDIS_URL=redis://redis:6379
  - DOPPLER_TOKEN=${DOPPLER_TOKEN:-}
```

---

## Development Workflow

### Starting Development

```bash
# Option 1: With Doppler (recommended)
doppler run -- npm run dev

# Option 2: Without Doppler (uses Docker defaults)
npm run dev
```

### Running Scripts

```bash
# With Doppler secrets
doppler run -- npm run sandbox:generate-personas

# Without Doppler (uses local env vars)
npm run sandbox:generate-personas
```

### Database Access

```bash
# Via Supabase CLI
supabase db psql

# Via Docker
docker exec -it goat-sales-postgres psql -U postgres -d sandbox

# Connection string
postgresql://postgres:postgres@localhost:5432/sandbox
```

---

## Environment Variables

### Required (via Doppler or .env)

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_SANDBOX_URL=https://...  # For sandbox environment

# Vapi
VAPI_SECRET_KEY=...
NEXT_PUBLIC_VAPI_API_KEY=...

# ElevenLabs
ELEVEN_LABS_API_KEY=...

# Slack (for alerts)
SLACK_WEBHOOK_URL=https://...

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
ALERT_PHONE_NUMBER=+1...
```

### Optional (Docker defaults)

```bash
USE_LOCAL_DB=true
LOCAL_DB_URL=postgresql://postgres:postgres@postgres:5432/sandbox
REDIS_URL=redis://redis:6379
```

---

## Troubleshooting

### Docker Issues

**Problem**: Containers won't start
```bash
# Check Docker status
docker ps

# View logs
docker-compose logs

# Restart services
docker-compose restart
```

**Problem**: Port conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Supabase Issues

**Problem**: Supabase won't start
```bash
# Check if Docker is running
docker ps

# Reset Supabase
supabase stop
supabase start

# Check logs
supabase logs
```

**Problem**: Migrations not running
```bash
# Manually run migrations
supabase db reset

# Check migration status
supabase migration list
```

### Doppler Issues

**Problem**: Doppler not authenticated
```bash
# Re-authenticate
doppler login

# Verify setup
doppler setup

# Test secrets
doppler secrets
```

**Problem**: Secrets not loading
```bash
# Verify project/config
doppler setup

# Test with a command
doppler run -- env | grep OPENAI_API_KEY
```

---

## Git Workflow

### Tracked Files

✅ **Tracked in Git:**
- `supabase/migrations/` - All migration files
- `supabase/seed.sql` - Seed data
- `supabase/config.toml` - Supabase config
- `Dockerfile` - Docker image definition
- `docker-compose.yml` - Docker services
- `scripts/sync-env.sh` - Setup script

### Ignored Files

❌ **Ignored (in .gitignore):**
- `supabase/.branches/` - Local branches
- `supabase/.temp/` - Temporary files
- `supabase/.volumes/` - Database volumes
- `.env.local` - Local environment overrides
- `.doppler/` - Doppler local config
- `postgres_data/` - Docker volumes
- `redis_data/` - Docker volumes

---

## Best Practices

### 1. Always Use Doppler for Secrets

```bash
# ✅ Good: Secrets in Doppler
doppler run -- npm run dev

# ❌ Bad: Secrets in .env files
# .env files should only have non-sensitive defaults
```

### 2. Keep Migrations in Git

```bash
# ✅ Good: Migration tracked
git add supabase/migrations/20240101000035_new_feature.sql
git commit -m "Add new feature migration"

# ❌ Bad: Local-only migrations
# All migrations should be committed
```

### 3. Use Seed Data for Development

```bash
# ✅ Good: Use seed.sql for personas, test data
# Seed data is tracked and shared

# ❌ Bad: Manual database inserts
# Use seed.sql or migration files
```

### 4. Test Docker Locally First

```bash
# ✅ Good: Test in Docker before deploying
docker-compose up
npm run test

# ❌ Bad: Deploy without local testing
```

---

## Migration Guide

### From Local Development to Docker

1. **Backup local database** (if any)
2. **Run sync script**: `npm run init`
3. **Verify services**: `docker-compose ps`
4. **Test application**: `npm run dev`
5. **Verify database**: `supabase status`

### From Single Machine to Team

1. **Share Doppler project** with team
2. **Each developer runs**: `npm run init`
3. **Verify parity**: Compare `supabase status` outputs
4. **Test scripts**: Run same script on both machines

---

## Summary

✅ **Environment Parity Achieved:**
- Docker virtualization for consistent runtime
- Supabase CLI for local database parity
- Doppler for centralized secrets
- One-command setup with `npm run init`
- Hot-reload development with volume mounts
- Git-tracked migrations and seed data

**Next Steps:**
1. Run `npm run init` on each development machine
2. Setup Doppler project and share with team
3. Verify all services are running
4. Start developing with `npm run dev`

---

## Support

For issues or questions:
- Check `scripts/sync-env.sh` logs
- Review Docker logs: `docker-compose logs`
- Review Supabase logs: `supabase logs`
- Verify Doppler setup: `doppler setup`
