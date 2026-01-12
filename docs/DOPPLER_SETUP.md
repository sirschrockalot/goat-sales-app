# Doppler Setup Guide

Complete guide for setting up Doppler secrets management for the Goat Sales App.

## Quick Start

```bash
# Run the automated setup script
npm run doppler:setup
```

This will:
1. ✅ Create/verify Doppler project
2. ✅ Create dev and prod configs
3. ✅ Configure your local machine
4. ✅ Guide you through setting secrets

## Manual Setup

### 1. Authenticate with Doppler

```bash
doppler login
```

### 2. Create Project

```bash
doppler projects create goat-sales-app
```

### 3. Create Configs

```bash
# Development config
doppler configs create dev --project goat-sales-app

# Production config
doppler configs create prod --project goat-sales-app
```

### 4. Setup Local Machine

```bash
doppler setup --project goat-sales-app --config dev
```

This creates a `.doppler.yaml` file in your project root.

## Setting Secrets

### Interactive Setup

```bash
npm run doppler:setup
```

Follow the prompts to set secrets interactively.

### Manual Setup (One at a Time)

```bash
# Required secrets
doppler secrets set OPENAI_API_KEY="sk-..." --config dev
doppler secrets set NEXT_PUBLIC_SUPABASE_URL="https://..." --config dev
doppler secrets set SUPABASE_SERVICE_ROLE_KEY="..." --config dev
doppler secrets set VAPI_SECRET_KEY="..." --config dev
doppler secrets set NEXT_PUBLIC_VAPI_API_KEY="..." --config dev
```

### Bulk Setup (Using Template)

1. Copy the template:
   ```bash
   cp scripts/doppler-secrets-template.sh scripts/set-my-secrets.sh
   ```

2. Edit `scripts/set-my-secrets.sh` with your actual values

3. Run it:
   ```bash
   bash scripts/set-my-secrets.sh
   ```

## Required Secrets

### Core Application

| Secret | Description | Example |
|--------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `SUPABASE_SANDBOX_URL` | Sandbox Supabase URL | `https://xxx-sandbox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `VAPI_SECRET_KEY` | Vapi secret API key | `...` |
| `NEXT_PUBLIC_VAPI_API_KEY` | Vapi public API key | `...` |

### Optional Secrets

| Secret | Description | When Needed |
|--------|-------------|-------------|
| `ELEVEN_LABS_API_KEY` | ElevenLabs API key | Voice synthesis |
| `DEEPGRAM_API_KEY` | Deepgram API key | Fast STT |
| `SLACK_WEBHOOK_URL` | Slack webhook | Alerts/notifications |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | SMS alerts |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | SMS alerts |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | SMS alerts |
| `ALERT_PHONE_NUMBER` | Your phone number | SMS alerts |
| `DOCUSIGN_*` | DocuSign credentials | Contract generation |
| `PANDADOC_*` | PandaDoc credentials | Contract generation |
| `CONTRACT_WEBHOOK_URL` | Contract webhook | Contract generation |
| `INVESTORBASE_API_KEY` | InvestorBase API key | Market data |
| `ZILLOW_API_KEY` | Zillow API key | Market data |
| `CRON_SECRET` | Cron job secret | Scheduled tasks |
| `NEXT_PUBLIC_APP_URL` | App URL | Webhooks/links |

## Using Doppler

### Run Commands with Doppler

```bash
# Development server
doppler run -- npm run dev

# Or use the shortcut
npm run dev:doppler

# Run scripts
doppler run -- npm run sandbox:generate-personas
doppler run -- npm run audit:daily
```

### View Secrets

```bash
# View all secrets (values hidden)
npm run doppler:secrets

# View specific secret
doppler secrets get OPENAI_API_KEY --config dev

# View raw secrets (for debugging)
doppler secrets --config dev --only-names
```

### Update Secrets

```bash
# Update a secret
doppler secrets set OPENAI_API_KEY="sk-new-key" --config dev

# Delete a secret
doppler secrets delete OPENAI_API_KEY --config dev
```

## Environment-Specific Configs

### Development

```bash
# Switch to dev config
doppler setup --project goat-sales-app --config dev

# Set dev-specific secrets
doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000" --config dev
doppler secrets set USE_LOCAL_DB="true" --config dev
```

### Production

```bash
# Switch to prod config
doppler setup --project goat-sales-app --config prod

# Set prod-specific secrets
doppler secrets set NEXT_PUBLIC_APP_URL="https://your-app.vercel.app" --config prod
doppler secrets set USE_LOCAL_DB="false" --config prod
```

## Integration with Docker

### Using Doppler in Docker

The `docker-compose.yml` supports Doppler via environment variable:

```yaml
environment:
  - DOPPLER_TOKEN=${DOPPLER_TOKEN:-}
```

To use:

```bash
# Get Doppler token
export DOPPLER_TOKEN=$(doppler configure get token --plain)

# Start Docker with Doppler
docker-compose up -d
```

Or run commands inside container:

```bash
docker-compose exec app doppler run -- npm run dev
```

## Team Collaboration

### Sharing Doppler Project

1. **Invite team members** to your Doppler project:
   ```bash
   # Via Doppler dashboard: https://dashboard.doppler.com
   # Or via CLI (if you have admin access)
   ```

2. **Each team member runs**:
   ```bash
   doppler setup --project goat-sales-app --config dev
   ```

3. **Secrets are automatically synced** - no need to share `.env` files!

### Environment Parity

All team members get the same secrets:
- ✅ No more `.env` file sharing
- ✅ Secrets automatically synced
- ✅ Easy to rotate keys
- ✅ Audit trail of changes

## Best Practices

### 1. Never Commit Secrets

```bash
# ✅ Good: Secrets in Doppler
doppler secrets set KEY=value --config dev

# ❌ Bad: Secrets in .env files
echo "KEY=value" >> .env  # Don't do this!
```

### 2. Use Different Configs for Environments

```bash
# Development
doppler setup --config dev

# Production
doppler setup --config prod
```

### 3. Rotate Keys Regularly

```bash
# Update a secret
doppler secrets set OPENAI_API_KEY="sk-new-key" --config dev

# All team members get the new key automatically
```

### 4. Use Doppler for All Secrets

Even local development should use Doppler:
```bash
# ✅ Good: Use Doppler even locally
doppler run -- npm run dev

# ❌ Bad: Use .env files
npm run dev  # Without Doppler
```

## Troubleshooting

### Problem: Doppler not authenticated

```bash
# Re-authenticate
doppler login

# Verify
doppler me
```

### Problem: Wrong project/config

```bash
# Check current setup
doppler setup

# Reset to correct project/config
doppler setup --project goat-sales-app --config dev
```

### Problem: Secrets not loading

```bash
# Verify secrets exist
doppler secrets --config dev

# Test with a command
doppler run -- env | grep OPENAI_API_KEY
```

### Problem: Team member can't access

1. Verify they're invited to the project
2. Have them run: `doppler setup --project goat-sales-app --config dev`
3. Check permissions in Doppler dashboard

## Verification

### Check Setup

```bash
# Verify authentication
doppler me

# Verify project/config
doppler setup

# Verify secrets (values hidden)
doppler secrets --config dev

# Test with app
doppler run -- npm run dev
```

### Expected Output

When running `doppler secrets --config dev`, you should see:

```
OPENAI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VAPI_SECRET_KEY
NEXT_PUBLIC_VAPI_API_KEY
...
```

## Summary

✅ **Doppler Setup Complete:**
- Project created: `goat-sales-app`
- Configs created: `dev`, `prod`
- Local machine configured
- Secrets can be set via `npm run doppler:setup`

**Next Steps:**
1. Run `npm run doppler:setup` to configure secrets
2. Verify with `npm run doppler:secrets`
3. Start app with `npm run dev:doppler`

---

## Support

For Doppler-specific issues:
- Doppler Docs: https://docs.doppler.com
- Doppler Dashboard: https://dashboard.doppler.com
- Check setup: `doppler setup`
