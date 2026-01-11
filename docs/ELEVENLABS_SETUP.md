# ElevenLabs API Key Setup Guide

This guide walks you through setting up your ElevenLabs API key so it works with the Sales Goat App's voice AI features.

## Overview

The app uses **Vapi.ai** as the voice AI orchestrator, which integrates with **ElevenLabs** for high-fidelity voices (Brian for Learning Mode, Stella for Practice Mode, and regional voices for Geographic Mirroring).

**Important**: Vapi requires the ElevenLabs API key to be configured in **both**:
1. Your environment variables (for documentation/backup)
2. The Vapi Dashboard (required for actual functionality)

---

## Step 1: Get Your ElevenLabs API Key

1. **Sign up or log in** to [ElevenLabs](https://elevenlabs.io)
2. Navigate to **Profile** → **API Keys** (or **Developers** → **API Keys**)
3. Click **"Create API Key"** or copy an existing key
4. **Important**: The full key is only shown once when created. Copy it immediately and store it securely.
5. Your API key will look like: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Add to Environment Variables

### For Local Development

1. Open your `.env.development` or `.env.local` file
2. Add the following line:

```bash
# ElevenLabs Configuration (for high-fidelity voices - Brian/Stella)
ELEVEN_LABS_API_KEY=sk-your_actual_api_key_here
```

3. Save the file
4. **Restart your dev server** if it's running:
   ```bash
   npm run dev
   ```

### For Production (Vercel)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Key**: `ELEVEN_LABS_API_KEY`
   - **Value**: Your ElevenLabs API key (starts with `sk-`)
   - **Environment**: Select all (Production, Preview, Development)
   - **Mark as Secret**: ✅ (recommended)
6. Click **"Save"**
7. **Redeploy** your application for changes to take effect

---

## Step 3: Configure in Vapi Dashboard (REQUIRED)

This is the **critical step** that actually enables ElevenLabs integration.

1. **Log in** to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Navigate to **Settings** → **Integrations** (or **Account** → **Integrations**)
3. Find the **ElevenLabs** section
4. Click **"Connect"** or **"Add API Key"**
5. Paste your ElevenLabs API key
6. Click **"Save"** or **"Connect"**
7. Vapi will automatically sync your voice library

### Verify Integration

1. In Vapi Dashboard, go to **Voices** tab
2. You should see ElevenLabs voices available, including:
   - **Brian** (`nPczCjzI2devNBz1zWls`) - Used for Learning Mode
   - **Stella** - Used for Practice Mode
   - Regional voices (Marcus, Clyde, Rachel, River) - Used for Geographic Mirroring

---

## Step 4: Test the Integration

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to** `http://localhost:3000/gauntlet` or `http://localhost:3000/persona-select`

3. **Start a call** in Learning Mode or Practice Mode

4. **Verify**:
   - The AI voice should sound natural and high-quality (ElevenLabs voices)
   - No errors in the browser console
   - The call connects successfully

### Troubleshooting

If you encounter errors:

1. **"Couldn't Find 11labs Voice" error**:
   - Verify the API key is correctly configured in Vapi Dashboard
   - Check that the voice ID exists in your ElevenLabs account
   - Ensure your ElevenLabs account has sufficient credits

2. **"Unauthorized" or "Invalid API Key"**:
   - Double-check the API key in Vapi Dashboard (no extra spaces)
   - Verify the key is active in your ElevenLabs account
   - Try regenerating the key in ElevenLabs and updating it in Vapi

3. **Voice not working but no errors**:
   - Check Vapi Dashboard → Settings → Integrations to ensure ElevenLabs is connected
   - Verify your ElevenLabs account has available credits
   - Check browser console for any warnings

---

## How It Works

When you create a Vapi assistant, the code specifies:

```typescript
voice: {
  provider: 'elevenlabs',
  voiceId: 'nPczCjzI2devNBz1zWls', // Brian voice
  model: 'eleven_turbo_v2_5',
  stability: 0.42,
  similarityBoost: 0.8,
}
```

Vapi uses the API key configured in their dashboard to authenticate with ElevenLabs on your behalf. The environment variable (`ELEVEN_LABS_API_KEY`) is for documentation and backup purposes, but **the Vapi Dashboard configuration is what actually enables the integration**.

---

## Billing Considerations

⚠️ **Important**: When you use your own ElevenLabs API key:
- **ElevenLabs usage** is billed directly to your ElevenLabs account
- **Vapi usage** is billed separately to your Vapi account
- You are **not** double-charged - Vapi just uses your key to access ElevenLabs

Monitor your usage in:
- **ElevenLabs Dashboard** → Usage/Billing
- **Vapi Dashboard** → Usage/Billing

---

## Voice IDs Used in This App

The app uses these specific ElevenLabs voice IDs:

| Voice | Voice ID | Use Case |
|-------|----------|----------|
| **Brian** | `nPczCjzI2devNBz1zWls` | Learning Mode (AI acts as acquisition agent) |
| **Stella** | `Stella` | Practice Mode (AI acts as skeptical seller) |
| **Marcus** | `z9fAnlkSqcjBvSqfU6nc` | Northeast region (NY/NJ/MA) |
| **Clyde** | `ErXw7SAsm4Li4Hq6msJp` | Deep South region (GA/AL/MS/TX) |
| **Rachel** | `21m00Tcm4TlvDq8ikWAM` | Midwest region (OH/IN/IL/MO) |
| **River** | `Lcf7u9O9v039i2kE53L7` | West Coast region (CA/AZ/NV) |

Make sure these voices are available in your ElevenLabs account (they should be by default).

---

## Quick Reference Checklist

- [ ] Obtained ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io)
- [ ] Added `ELEVEN_LABS_API_KEY` to `.env.development` (local)
- [ ] Added `ELEVEN_LABS_API_KEY` to Vercel environment variables (production)
- [ ] Configured API key in Vapi Dashboard → Settings → Integrations → ElevenLabs
- [ ] Verified voices are available in Vapi Dashboard → Voices
- [ ] Tested a call to ensure integration works
- [ ] Checked ElevenLabs account for available credits

---

## Need Help?

- **ElevenLabs Support**: [help.elevenlabs.io](https://help.elevenlabs.io)
- **Vapi Support**: [support.vapi.ai](https://support.vapi.ai)
- **Vapi Docs**: [docs.vapi.ai](https://docs.vapi.ai)
