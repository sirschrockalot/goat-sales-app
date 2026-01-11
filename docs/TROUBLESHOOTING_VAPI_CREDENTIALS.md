# Troubleshooting: "The provided credentials are not valid" Error

## Common Causes

### 1. ElevenLabs API Key Not Added to Vapi Dashboard

**This is the most common cause.** The ElevenLabs API key must be configured in the Vapi Dashboard, not just in your environment variables.

**Solution:**
1. Go to [Vapi Dashboard](https://dashboard.vapi.ai) → **Settings** → **Integrations**
2. Find **ElevenLabs** section
3. Click **"Connect"** or **"Add API Key"**
4. Paste your ElevenLabs API key: `sk_2b95aac8b4b35c12b81ff5a91ef816a14409c09af9e126a7`
5. Make sure there are **no extra spaces** before or after the key
6. Click **"Save"** or **"Connect"**

### 2. ElevenLabs API Key Missing Permissions ⚠️ **LIKELY ISSUE**

**Your API key is valid but missing the `user_read` permission**, which Vapi needs to validate the key.

**Solution:**
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io) → **Profile** → **API Keys**
2. **Delete the current key** (or create a new one)
3. **Create a new API key** with **UNRESTRICTED** permissions:
   - When creating the key, make sure to select **"Unrestricted"** or **"Full Access"**
   - Do NOT select "Limited" or specific permissions only
   - The key needs `user_read` permission for Vapi to validate it
4. Copy the new unrestricted key
5. Update it in Vapi Dashboard → Settings → Integrations → ElevenLabs
6. Update `.env.local` with the new key

**Note:** If you can't create an unrestricted key, your ElevenLabs account might be on a free tier. You need a **paid plan** (Starter, Creator, Pro, or Scale) to create unrestricted API keys.

### 3. API Key Format

Your key uses `sk_` (underscore). Some systems expect `sk-` (dash), but both formats should work. However, if you're getting errors:

**Solution:**
1. Verify the key format in your ElevenLabs account
2. Copy the key directly from ElevenLabs (don't type it manually)
3. Make sure there are no hidden characters or spaces

### 4. Key Not Active or Expired

**Solution:**
1. Check your ElevenLabs account → **API Keys**
2. Verify the key is **Active** (not revoked or expired)
3. If needed, regenerate the key and update it in Vapi Dashboard

### 5. Vapi API Keys Issue

If the error is about Vapi credentials (not ElevenLabs), check:

**Solution:**
1. Verify `VAPI_SECRET_KEY` in `.env.local` is correct
2. Verify `NEXT_PUBLIC_VAPI_API_KEY` in `.env.local` is correct
3. These should match your Vapi Dashboard → **Settings** → **API Keys**

## Step-by-Step Fix

1. **Verify ElevenLabs Key in Your Account:**
   ```bash
   # Check if key is valid by testing it
   curl -X GET "https://api.elevenlabs.io/v1/voices" \
     -H "xi-api-key: sk_2b95aac8b4b35c12b81ff5a91ef816a14409c09af9e126a7"
   ```
   If this returns a 401 error, the key is invalid.

2. **Add Key to Vapi Dashboard:**
   - Go to https://dashboard.vapi.ai
   - Settings → Integrations → ElevenLabs
   - Paste: `sk_2b95aac8b4b35c12b81ff5a91ef816a14409c09af9e126a7`
   - Save

3. **Verify Integration:**
   - In Vapi Dashboard, go to **Voices** tab
   - You should see ElevenLabs voices listed
   - If not, the integration failed

4. **Test Again:**
   - Restart your dev server
   - Try creating a call again

## Still Not Working?

1. **Regenerate ElevenLabs Key:**
   - Create a new key in ElevenLabs
   - Update it in Vapi Dashboard
   - Update `.env.local` (optional, for reference)

2. **Check Vapi Dashboard Logs:**
   - Go to Vapi Dashboard → **Logs** or **Activity**
   - Look for specific error messages

3. **Contact Support:**
   - Vapi Support: support.vapi.ai
   - ElevenLabs Support: help.elevenlabs.io

## Quick Checklist

- [ ] ElevenLabs account is on a paid plan
- [ ] API key is unrestricted (full permissions)
- [ ] Key is active (not revoked)
- [ ] Key is added to Vapi Dashboard → Settings → Integrations → ElevenLabs
- [ ] No extra spaces in the key when pasting
- [ ] Vapi Dashboard shows ElevenLabs voices in Voices tab
- [ ] VAPI_SECRET_KEY is correct in `.env.local`
- [ ] NEXT_PUBLIC_VAPI_API_KEY is correct in `.env.local`
