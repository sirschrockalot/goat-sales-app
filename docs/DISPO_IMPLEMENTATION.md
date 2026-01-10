# Dispositions (Dispo) Training Path Implementation

This document summarizes the implementation of the Dispositions training path for the Sales Goat App.

## Overview

The Dispositions path allows reps to train on selling properties to investors (buyers) rather than acquiring properties from sellers. This uses a different script with 5 distinct logic gates.

## Database Setup

### Migration: `20240101000010_create_dispo_script_segments.sql`
- Creates `dispo_script_segments` table with the 5 Dispo gates
- Pre-seeds script text from `DISPO_SCRIPT_MAPPING.md`:
  1. **The Hook (The Numbers)** - Lead with ARV, Buy-in, Spread, ROI
  2. **The Narrative (The Comp Analysis)** - Justify ARV with comps
  3. **The Scarcity Anchor (The Competition)** - Create urgency with FOMO
  4. **The Terms (Transaction Clarity)** - Set non-negotiable closing terms
  5. **The Clinch (The Assignment)** - Get assignment signed immediately

### Embedding Script: `scripts/embed-dispo-scripts.ts`
- Generates OpenAI embeddings for all Dispo script segments
- Run with: `npx tsx scripts/embed-dispo-scripts.ts`
- Updates the `dispo_script_segments` table with vector embeddings

## AI Personas

### File: `src/lib/dispoGauntletLevels.ts`
Defines 5 Dispo-specific personas for the Gauntlet:

1. **Level 1: The Newbie Buyer** - Eager, asks basic questions, trusts the rep
2. **Level 2: The Busy Investor** - Time-constrained, wants quick numbers
3. **Level 3: The Analytical Investor** - Challenges ARV and repair estimates
4. **Level 4: The Aggressive Negotiator** - Tries to low-ball and change terms
5. **Level 5: The Hardball Hedge Fund** - Ultimate challenge, ruthless negotiator

Each persona includes:
- System prompt with Dispo-specific objections
- Voice configuration (11Labs)
- Behavioral parameters (objection frequency, skepticism, resistance)
- Required score: 90+ to unlock next level

## Grading Logic

### File: `src/lib/dispoGrading.ts`
- `gradeDispoCall()` function evaluates Dispo calls using Dispo-specific criteria:
  - **The Hook**: Did they lead with numbers (ARV, Buy-in, Spread)?
  - **The Narrative**: Did they provide comp analysis?
  - **The Scarcity Anchor**: Did they create urgency?
  - **The Terms**: Did they state terms clearly?
  - **The Clinch**: Did they get commitment to sign?
  - **Tonality**: Professional, urgent, authoritative (0-10)

## API Updates

### `src/app/api/vapi-webhook/route.ts`
- Detects `personaMode` from call metadata
- Uses `gradeDispoCall()` for Dispo calls, `gradeCall()` for Acquisition calls
- Calculates logic gates based on mode
- Passes mode to `analyzeDeviation()` for correct table selection

### `src/app/api/vapi/create-assistant/route.ts`
- Accepts `gauntletLevel` parameter for Gauntlet challenges
- Uses `getDispoGauntletLevel()` for Dispo mode
- Uses `getGauntletLevel()` for Acquisition mode
- Falls back to `generatePersona()` for non-Gauntlet calls

### `src/app/api/script/embed/route.ts`
- Accepts `table` parameter to support both `script_segments` and `dispo_script_segments`
- Generates embeddings for the appropriate table

### `src/app/api/script/check/route.ts`
- Already supports mode parameter (acquisition/disposition)
- Dynamically selects RPC function: `match_script_segments` vs `match_dispo_script_segments`

## Script Deviation Analysis

### File: `src/lib/analyzeDeviation.ts`
- Updated to accept `mode` parameter ('acquisition' | 'disposition')
- Selects correct table: `script_segments` vs `dispo_script_segments`
- Uses appropriate gate names based on mode
- Calculates faithfulness scores for each gate

## UI Components

### `src/app/gauntlet/page.tsx`
- Path selection toggle: "Acquisitions" vs "Dispositions"
- Passes `selectedPath` to assistant creation API
- Displays appropriate gate names based on selected path
- Uses `gauntletLevel` parameter when creating assistants

### `src/components/call/ScriptProgress.tsx`
- Already supports dynamic gate names based on mode
- Displays correct gate names for Acquisition vs Dispo

### `src/hooks/useScriptTracker.ts`
- Accepts `mode` parameter
- Passes mode to `/api/script/check` endpoint
- Uses `personaMode` from VapiContext as fallback

## Testing Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Generate embeddings: `npx tsx scripts/embed-dispo-scripts.ts`
- [ ] Test Gauntlet Level 1 Dispo call
- [ ] Verify grading uses Dispo criteria
- [ ] Verify script tracking uses `dispo_script_segments` table
- [ ] Verify deviation analysis uses correct gates
- [ ] Test path toggle in Gauntlet UI
- [ ] Verify assistant creation uses Dispo personas

## Next Steps

1. Run the embedding script after migration
2. Test with a Level 1 Dispo call
3. Verify all gates are tracked correctly
4. Test progression through Gauntlet levels
