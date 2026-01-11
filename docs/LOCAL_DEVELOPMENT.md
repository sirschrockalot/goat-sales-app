# Local Development Setup Guide

This guide explains how to set up a local development environment using Supabase CLI and Docker, while maintaining a separate production environment on Vercel.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script (installs dependencies, creates env files, starts Supabase, seeds DB)
./scripts/setup-local-dev.sh

# Then start the dev server
npm run dev:local
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment files
cp env.development.example .env.development
cp env.production.example .env.production

# 3. Edit .env.development and add your OPENAI_API_KEY

# 4. Start local Supabase
npm run supabase:start

# 5. Seed the database with test data
npm run db:seed

# 6. Start the development server (pointing to local Supabase)
npm run dev:local
```

## 📋 Prerequisites

1. **Docker Desktop** - Required for running Supabase locally
   - Download from: https://www.docker.com/products/docker-desktop
   - Ensure Docker is running before starting Supabase

2. **Supabase CLI** - Install globally
   ```bash
   npm install -g supabase
   ```

3. **Node.js** - Version 18+ recommended

## 🔧 Setup Steps

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### Step 2: Initialize Local Supabase

The `supabase/config.toml` file is already configured. To start the local instance:

```bash
npm run supabase:start
```

This will:
- Start Docker containers for PostgreSQL, Auth, Storage, etc.
- Create a local Supabase instance at `http://localhost:54321`
- Generate local API keys (stored in `.env.development`)

### Step 3: Apply Migrations

Migrations are automatically applied when you start Supabase. To reset and reapply:

```bash
npm run supabase:reset
```

### Step 4: Seed Test Data

Populate the local database with realistic test data:

```bash
npm run db:seed
```

This creates:
- 5 mock users with varying XP and gauntlet levels
- Acquisitions script segments (5 gates)
- Dispositions script segments (5 gates)
- 10 mock call records with realistic scores and transcripts

### Step 5: Start Development Server

Start Next.js pointing to your local Supabase:

```bash
npm run dev:local
```

The app will be available at `http://localhost:3000`

## 📁 Environment Files

### Setup Environment Files

1. **Copy example files:**
   ```bash
   cp env.development.example .env.development
   cp env.production.example .env.production
   ```

2. **Edit `.env.development`:**
   - Update `OPENAI_API_KEY` with your key
   - All other values are pre-configured for local Supabase

3. **Edit `.env.production`:**
   - Fill in your production Supabase credentials
   - Add all production API keys
   - **Never commit this file**

### Environment File Priority

Next.js loads environment files in this order (later files override earlier ones):
1. `.env.development` (when `NODE_ENV=development`)
2. `.env.local` (git-ignored, for local overrides)
3. `.env.development.local` (git-ignored, highest priority for development)

**Note:** `.env.local` takes precedence and is git-ignored, so you can safely override any values.

## 🗄️ Database Management

### View Local Database

Access the Supabase Studio (local dashboard):
```bash
# Studio URL is shown when you run: supabase start
# Usually: http://localhost:54323
```

Or use the CLI:
```bash
supabase db diff  # See differences
supabase db dump  # Export schema
```

### Sync Schema from Production

To pull the latest schema from production:

```bash
npm run db:sync
```

**Note:** This requires linking your production project first:
```bash
supabase link --project-ref your-project-ref
supabase db pull
```

### Reset Local Database

Reset and reseed the local database:

```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Reapply all migrations
3. Run the seed script

## 👥 Test Users

After running `npm run db:seed`, you can login with:

| Email | Password | Role | Level | XP | Path |
|-------|----------|------|-------|----|----|
| sarah.johnson@test.com | testpassword123 | Admin | 5 | 2500 | Acquisitions |
| mike.chen@test.com | testpassword123 | User | 4 | 1800 | Acquisitions |
| emma.rodriguez@test.com | testpassword123 | User | 5 | 3200 | Dispositions |
| david.kim@test.com | testpassword123 | User | 2 | 950 | Acquisitions |
| lisa.thompson@test.com | testpassword123 | User | 5 | 4200 | Dispositions |

## 📊 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:local` | Start Next.js with local Supabase |
| `npm run supabase:start` | Start local Supabase Docker containers |
| `npm run supabase:stop` | Stop local Supabase containers |
| `npm run supabase:status` | Check Supabase status |
| `npm run supabase:reset` | Reset database and reapply migrations |
| `npm run db:seed` | Populate database with test data |
| `npm run db:sync` | Sync schema from production |
| `npm run db:reset` | Reset database and seed |

## 🔒 Row Level Security (RLS)

All RLS policies from production are mirrored in local development. This ensures:
- Security testing works the same locally and in production
- Users can only access their own data
- Admin-only routes are properly protected

To verify RLS policies:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🐛 Troubleshooting

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start
- Try `npm run supabase:start` again

### "Port 54321 is already in use"
- Another Supabase instance might be running
- Run `npm run supabase:stop` first
- Or change the port in `supabase/config.toml`

### "Migration failed"
- Check if all migrations are in `supabase/migrations/`
- Try `npm run supabase:reset` to start fresh
- Check Supabase logs: `supabase logs`

### "Cannot connect to local Supabase"
- Verify Supabase is running: `npm run supabase:status`
- Check `.env.development` has correct URL
- Ensure Docker containers are healthy

### "Seed script fails"
- Make sure migrations have been applied
- Check that Supabase is running
- Verify `.env.development` has `SUPABASE_SERVICE_ROLE_KEY`

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

## 🔄 Workflow

### Daily Development

1. Start Supabase: `npm run supabase:start`
2. Start dev server: `npm run dev:local`
3. Make changes and test locally
4. Stop when done: `npm run supabase:stop`

### After Pulling Changes

1. Pull latest code
2. Reset database: `npm run db:reset`
3. Start development: `npm run dev:local`

### Before Deploying

1. Test locally with `npm run dev:local`
2. Run smoke test: `npx tsx scripts/launch-day-smoketest.ts`
3. Deploy to Vercel (uses `.env.production`)

## 🎯 Benefits of Local Development

- **Fast iteration** - No network latency
- **Safe testing** - No risk to production data
- **Offline development** - Work without internet
- **Cost savings** - No API usage charges
- **Full control** - Reset database anytime
