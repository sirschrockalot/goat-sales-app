# Vapi Assistants Used by the UI

## Overview

The UI creates assistants **dynamically** on each call attempt via the `/api/vapi/create-assistant` API route. It does NOT use pre-existing assistants from the Vapi Dashboard (except for one special case).

## Assistant Creation Flow

1. **User starts a call** from the persona selector or gauntlet
2. **UI calls** `/api/vapi/create-assistant` with parameters:
   - `personaMode`: `'acquisition'` or `'disposition'`
   - `difficulty`: 1-10 (default: 5)
   - `gauntletLevel`: Optional (1-5 for gauntlet mode)
   - `roleReversal`: `true` for Learning Mode
   - `exitStrategy`: `'fix_and_flip'`, `'buy_and_hold'`, or `'creative_finance'`
   - `propertyLocation`: Optional (for regional voices)
   - `sellerName`: Optional (for personalized first message)
   - `propertyAddress`: Optional (for personalized first message)

3. **API creates a new assistant** with name pattern:
   - **Regular Mode**: `Sales Goat {personaMode} - Level {difficulty}`
     - Example: `Sales Goat acquisition - Level 5`
   - **Gauntlet Mode**: `Sales Goat {Acquisition|Dispo} - Gauntlet Level {gauntletLevel}`
     - Example: `Sales Goat Acquisition - Gauntlet Level 3`

4. **Assistant is created with**:
   - **Voice**: ElevenLabs (Brian or Stella based on mode)
   - **Model**: GPT-4o or GPT-4o-Mini (based on cost optimization)
   - **System Prompt**: Full 2.0 script with PA Summary
   - **First Message**: Dynamic (includes seller name and property address if provided)

## Special Case: Pre-Configured Assistant

**Only for Acquisitions Gauntlet Mode:**

If `ACQUISITIONS_ASSISTANT_ID` is set in environment variables, the API will use that pre-created assistant instead of creating a new one for gauntlet mode.

```typescript
// In create-assistant/route.ts
if (gauntletLevel && validPersonaMode === 'acquisition') {
  const acquisitionsAssistantId = process.env.ACQUISITIONS_ASSISTANT_ID;
  
  if (acquisitionsAssistantId) {
    // Use the pre-created assistant
    return NextResponse.json({
      success: true,
      assistantId: acquisitionsAssistantId,
      // ...
    });
  }
}
```

**Default ID**: `aaf338ae-b74a-43e4-ac48-73dd99817e9f` (from env.example)

## Voice Configuration

### Learning Mode (Role Reversal)
- **Voice**: Brian (`ByWUwXA3MMLREYmxtB32`)
- **Model**: `eleven_turbo_v2_5`
- **Stability**: Context-aware (0.42 for rapport, 0.60 for contract)
- **Similarity Boost**: 0.8

### Practice Mode (Regular)
- **Voice**: Stella (`2vbhUP8zyKg4dEZaTWGn`) for seller persona
- **Voice**: Brian (`ByWUwXA3MMLREYmxtB32`) for acquisition agent
- **Model**: `eleven_turbo_v2_5`
- **Stability**: 0.5
- **Similarity Boost**: 0.75

### Regional Voices
- If `propertyLocation` is provided, uses region-specific voices
- Falls back to Brian/Stella if no regional voice configured

## Why Assistants Can't Be Published

The 21 duplicate assistants that were deleted were created during **failed attempts** when:

1. **ElevenLabs integration wasn't configured** in Vapi Dashboard
2. **Voice IDs were invalid** (using old IDs like `pNInz6obpgDQGcFmaJgB` or `21m00Tcm4TlvDq8ikWAM`)
3. **Voice IDs didn't match** the user's ElevenLabs account

These assistants were stuck in "unpublished" state because Vapi couldn't find the voices.

## Current Status

After cleanup:
- ✅ **18 problematic assistants deleted**
- ⚠️ **3 remaining** (rate-limited, will be deleted on next attempt)
- ✅ **UI will now create new assistants** with correct voice IDs:
  - Brian: `ByWUwXA3MMLREYmxtB32`
  - Stella: `2vbhUP8zyKg4dEZaTWGn`

## Verification

To see which assistants the UI is creating:

```bash
npm run vapi:list
```

This will show:
- All assistants in your Vapi account
- Which ones are published/unpublished
- Duplicate names (indicates failed creation attempts)
- Voice configurations

## Troubleshooting

If the UI still can't create assistants:

1. **Check ElevenLabs integration**:
   - Vapi Dashboard → Settings → Integrations → ElevenLabs
   - Ensure API key is configured
   - Verify voice IDs exist in your ElevenLabs account

2. **Verify voice IDs**:
   - Check `.env` for `ELEVEN_LABS_BRIAN_VOICE_ID` and `ELEVEN_LABS_SELLER_VOICE_ID`
   - These should match your ElevenLabs account voice IDs

3. **Check assistant creation**:
   - Look for new assistants with names like `Sales Goat acquisition - Level 5`
   - If they're unpublished, check the error message in Vapi Dashboard

4. **Test voice configuration**:
   ```bash
   npm run test:ai-services
   ```
   This will test both Brian and Stella voices with full ElevenLabs configuration.
