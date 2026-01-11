# Fix: "Couldn't validate eleven labs credential" Error

## Problem

Your ElevenLabs API key is **valid** (it can access voices), but it's **missing the `user_read` permission** that Vapi needs to validate the key in their dashboard.

## Solution: Create an Unrestricted API Key

### Step 1: Check Your ElevenLabs Account Plan

1. Go to [elevenlabs.io](https://elevenlabs.io) and log in
2. Check your account plan:
   - **Free tier**: May not allow unrestricted keys
   - **Paid plan** (Starter/Creator/Pro/Scale): Can create unrestricted keys

### Step 2: Create a New Unrestricted API Key

1. Go to **Profile** → **API Keys** (or **Developers** → **API Keys**)
2. **Delete your current key** (optional, but recommended for security)
3. Click **"Create API Key"**
4. **IMPORTANT**: When creating the key:
   - Select **"Unrestricted"** or **"Full Access"** (NOT "Limited")
   - Make sure it has **all permissions** enabled
   - The key needs `user_read` permission specifically
5. Copy the new key immediately (it's only shown once)

### Step 3: Update Vapi Dashboard

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai) → **Settings** → **Integrations**
2. Find **ElevenLabs** section
3. Click **"Edit"** or **"Update"** (or delete and reconnect)
4. Paste your **new unrestricted** API key
5. Make sure there are **no extra spaces** before or after
6. Click **"Save"** or **"Connect"**

### Step 4: Verify Integration

1. In Vapi Dashboard, go to **Voices** tab
2. You should see ElevenLabs voices listed
3. If you see voices, the integration is working!

### Step 5: Update Environment Variables (Optional)

Update your `.env.local` file with the new key for reference:

```bash
ELEVEN_LABS_API_KEY=sk_your_new_unrestricted_key_here
```

## Why This Happens

- **Limited API keys** only have specific permissions (e.g., `voices_read`, `text_to_speech`)
- **Vapi needs `user_read` permission** to validate the key and check your account status
- **Unrestricted keys** have all permissions, including `user_read`

## If You Can't Create Unrestricted Keys

If your ElevenLabs account doesn't allow unrestricted keys:

1. **Upgrade your ElevenLabs plan** to a paid tier (Starter, Creator, Pro, or Scale)
2. Paid plans allow unrestricted API keys
3. Free tier may have restrictions

## Test Your New Key

After creating the unrestricted key, test it:

```bash
# This should return your user info (not just voices)
curl -X GET "https://api.elevenlabs.io/v1/user" \
  -H "xi-api-key: sk_your_new_unrestricted_key"
```

If this returns user information (not an error), the key has the correct permissions.
