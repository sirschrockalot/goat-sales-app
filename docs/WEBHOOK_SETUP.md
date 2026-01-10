# Supabase Database Webhook Setup Guide

## Overview
This guide explains how to configure the Supabase Database Webhook to automatically generate embeddings for new rebuttals.

## API Endpoint
**URL:** `https://your-domain.com/api/rebuttals/embed`

## Configuration Steps

### 1. Access Supabase Dashboard
1. Log in to your Supabase project dashboard
2. Navigate to **Database** → **Webhooks**
3. Click **Create a new webhook**

### 2. Webhook Configuration

#### Basic Settings
- **Name:** `rebuttal_embedding_generator`
- **Table:** `rebuttals`
- **Events:** Select **INSERT** only
- **HTTP Request**
  - **Method:** `POST`
  - **URL:** `https://your-domain.com/api/rebuttals/embed`
  - **HTTP Headers:**
    - `Content-Type: application/json`
    - `x-webhook-secret: your_webhook_secret_here` (optional, but recommended)

#### Advanced Settings
- **HTTP Version:** `1.1` or `2`
- **Retry Policy:** Enable retries (recommended: 3 retries with exponential backoff)

### 3. Security Configuration

#### Option A: Using Webhook Secret (Recommended)
1. Generate a secure random string (e.g., using `openssl rand -hex 32`)
2. Add it to your `.env.local` file:
   ```
   SUPABASE_WEBHOOK_SECRET=your_generated_secret_here
   ```
3. Add the same secret as a header in the Supabase webhook configuration:
   - Header name: `x-webhook-secret`
   - Header value: `your_generated_secret_here`

#### Option B: Without Secret (Less Secure)
- The webhook will still work, but anyone with the URL can trigger it
- Only use this in development or if the endpoint is behind additional authentication

### 4. Testing the Webhook

#### Test via Supabase Dashboard
1. Go to **Database** → **Table Editor** → `rebuttals`
2. Insert a new row with:
   - `rebuttal_text`: "This is a test rebuttal"
   - Leave `embedding` as NULL
3. Check the webhook logs in Supabase Dashboard
4. Verify the `embedding` column is populated with a vector

#### Test via API
```bash
curl -X POST https://your-domain.com/api/rebuttals/embed \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_webhook_secret_here" \
  -d '{
    "type": "INSERT",
    "table": "rebuttals",
    "record": {
      "id": "test-id-123",
      "rebuttal_text": "This is a test rebuttal"
    }
  }'
```

### 5. Monitoring

#### Check Webhook Logs
1. In Supabase Dashboard, go to **Database** → **Webhooks**
2. Click on your webhook
3. View the **Logs** tab to see:
   - Success/failure status
   - Response codes
   - Error messages

#### Check Application Logs
- Monitor your Next.js application logs for:
  - `Generating embedding for rebuttal ID: {id}`
  - `Successfully generated and stored embedding for rebuttal ID: {id}`
  - Any error messages

### 6. Troubleshooting

#### Common Issues

**Issue: Webhook not triggering**
- Verify the webhook is enabled in Supabase Dashboard
- Check that the URL is correct and accessible
- Ensure the table name matches exactly: `rebuttals`

**Issue: 401 Unauthorized**
- Verify the `x-webhook-secret` header matches your `.env.local` value
- Or remove the secret check if not using it

**Issue: 500 Internal Server Error**
- Check that `OPENAI_API_KEY` is set in `.env.local`
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check application logs for detailed error messages

**Issue: Embedding not updating**
- Verify the row ID exists in the database
- Check that the `embedding` column type is `vector(1536)`
- Ensure the Supabase service role key has update permissions

### 7. Environment Variables Required

Make sure these are set in your `.env.local`:
```env
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_WEBHOOK_SECRET=your_webhook_secret (optional)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

## Webhook Payload Structure

The webhook expects a payload in this format:
```json
{
  "type": "INSERT",
  "table": "rebuttals",
  "record": {
    "id": "uuid-here",
    "rebuttal_text": "The rebuttal text to embed",
    "embedding": null
  }
}
```

## Notes

- The webhook only processes `INSERT` events
- If an embedding already exists, it will skip generation
- The embedding uses OpenAI's `text-embedding-3-small` model (1536 dimensions)
- The service role key bypasses Row Level Security (RLS) to update the embedding
