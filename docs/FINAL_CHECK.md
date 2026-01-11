# Final Check - Apex Prompt Audit & Verification

Comprehensive verification script that audits prompt merges using GPT-4o, visualizes improvements with color-coded terminal output, validates Vapi API payloads, and calculates an Apex Readiness Score.

## Overview

The Final Check script:
1. **Compares** `base_prompt.txt` with `merged_prompt_output.txt`
2. **Analyzes** using GPT-4o as a "Sales Auditor"
3. **Visualizes** improvements with color-coded terminal output
4. **Validates** Vapi API payload (mock PATCH)
5. **Calculates** Apex Readiness Score (0-100)
6. **Recommends** Go/No-Go for Vapi deployment

## Features

### 1. Elliott Infusion Detection
- Identifies increased "Certainty" or "Aggressive" language
- Finds phrases showing more conviction, authority, or directness
- Scores: 0-100 (0 = no Elliott infusion, 100 = strong Elliott-style certainty)

### 2. Cline Infusion Detection
- Identifies "Surgical Discovery" or "Hidden Why" mining techniques
- Finds discovery questions or frameworks
- Scores: 0-100 (0 = no Cline infusion, 100 = strong Cline-style discovery)

### 3. Safety Guardrails Verification
- Verifies `$82,700` price point is preserved exactly
- Checks `PA Clauses 1-19` are intact
- Detects modifications to contract details or legal language
- Scores: 0-100 (0 = critical violations, 100 = all guardrails intact)

### 4. Terminal Heat Map
Color-coded visualization:
- **Green Text**: New high-conviction phrases (Elliott-style)
- **Yellow Text**: Modified discovery logic (Cline-style)
- **Red/Bold Text**: Critical "Fixed" legalities (Price, Clauses)

### 5. Vapi API Validation
- Mock PATCH validation (doesn't actually update)
- Checks character limit (100,000 characters)
- Validates payload structure
- Reports any errors

### 6. Apex Readiness Score
- Weighted calculation:
  - Elliott Infusion: 30%
  - Cline Infusion: 30%
  - Safety Guardrails: 40% (most important)
- **Go**: Score ≥ 85
- **No-Go**: Score < 85 (lists missing tactics)

## Setup

### 1. Prerequisites

Run the Apex Prompt Merger first to generate `merged_prompt_output.txt`:

```bash
npm run merge-prompts <assistant-id>
```

This creates:
- `base_prompt.txt` (original)
- `merged_prompt_output.txt` (new merged prompt)

### 2. Environment Variables

Ensure `.env` contains:
```bash
OPENAI_API_KEY=sk-your-key-here
```

## Usage

```bash
npm run final-check
```

**Example Output:**
```
🚀 Starting Final Check - Apex Prompt Audit...

📖 Reading prompts...
✅ Base prompt: 45,231 characters
✅ Merged prompt: 48,567 characters

🔍 Running GPT-4o Sales Auditor analysis...

================================================================================
📊 APEX PROMPT AUDIT - HEAT MAP
================================================================================

🔥 ELLIOTT INFUSION (Certainty/Aggression):
✅ Score: 87/100
   High-conviction phrases added:
   1. "I'm going to go to bat for you with my underwriters"
   2. "This is the best I could get the office to approve"
   3. "Let me see if I can squeeze a bit more out of the budget"

🔍 CLINE INFUSION (Surgical Discovery/Hidden Why):
✅ Score: 92/100
   Discovery logic modified:
   1. "DISCOVERY LOCK: You MUST NOT move to Step 3 until the rep uncovers your 'Hidden Why'"
   2. "Surface-level answers are NOT enough. Dig deeper for emotional drivers"

🛡️  SAFETY GUARDRAILS (CRITICAL - FIXED LEGALITIES):
   ✅ $82,700 price point: INTACT
   ✅ PA Clauses 1-19: INTACT
   Safety Score: 100/100

✨ IMPROVEMENTS:
   New high-conviction phrases (Elliott-style):
      1. "I'm going to go to bat for you"
      2. "This is the best I could get approved"
   Modified discovery logic (Cline-style):
      1. "Hidden Why" framework added
      2. Discovery lock protocol implemented

🔌 VAPI API VALIDATION (Mock PATCH):
   ✅ Payload is valid
   Character count: 48,567
   ✅ Within Vapi limit (100,000)

================================================================================
🚀 APEX READINESS SCORE: 93/100 - GO ✅
================================================================================

✅ RECOMMENDATION: PROCEED WITH VAPI UPDATE
   The merged prompt is ready for deployment.
```

## Score Breakdown

### Apex Readiness Score Calculation

```
Score = (Elliott Score × 0.3) + (Cline Score × 0.3) + (Safety Score × 0.4)
```

**Example:**
- Elliott: 87/100 (30% weight) = 26.1
- Cline: 92/100 (30% weight) = 27.6
- Safety: 100/100 (40% weight) = 40.0
- **Total: 93.7 → 93/100** ✅

### Go/No-Go Threshold

- **≥ 85**: ✅ **GO** - Proceed with Vapi update
- **< 85**: ❌ **NO-GO** - Address missing tactics first

## Missing Tactics (Score < 85)

If the score is below 85, the script lists specific missing tactics:

**Example:**
```
📋 MISSING TACTICS (Score < 85):
   1. Lacks assumptive closes
   2. No urgency creators
   3. Missing "Hidden Why" framework
   4. No discovery lock protocol
```

## Safety Guardrails

### Critical Checks

1. **Price Point**: `$82,700` must be preserved exactly
   - ✅ `$82,700` (correct)
   - ❌ `$82,700.00` (modified)
   - ❌ `82700` (modified)
   - ❌ `$85,000` (violation)

2. **PA Clauses**: `PA Clauses 1-19` or `Clause 17` must be intact
   - ✅ All clauses present and unchanged
   - ❌ Clauses modified or removed

3. **Contract Details**: Legal language must not be altered
   - ✅ Contract explanations preserved
   - ❌ Legal language modified

## Vapi API Validation

### Checks Performed

1. **Character Limit**: ≤ 100,000 characters
2. **Structure**: Contains persona definition ("You are...")
3. **Format**: Plain text (not JSON)

### Errors Reported

- `Prompt exceeds Vapi character limit`
- `Prompt missing persona definition`
- `Prompt appears to be JSON, should be plain text`

## Workflow

### Complete Pipeline

```bash
# 1. Scrape DNA
npm run scrape-dna

# 2. Merge prompts
npm run merge-prompts <assistant-id>

# 3. Verify with final check
npm run final-check

# 4. If score ≥ 85, proceed with Vapi update
# (Already done in step 2, but you can verify first)
```

### Verification-Only Workflow

If you want to verify before updating Vapi:

1. **Temporarily disable Vapi update** in `apexPromptMerger.ts`
2. Run merge to generate `merged_prompt_output.txt`
3. Run `final-check` to verify
4. If score ≥ 85, manually update Vapi or re-enable auto-update

## Troubleshooting

### "merged_prompt_output.txt not found"

**Solution**: Run `npm run merge-prompts <assistant-id>` first to generate the merged prompt file.

### "base_prompt.txt not found"

**Solution**: Create `base_prompt.txt` in the project root with your core system prompt.

### Low Apex Readiness Score

**Common Issues:**
- Missing Elliott infusion (certainty/aggression)
- Missing Cline infusion (discovery/Hidden Why)
- Safety guardrails violated (price/clauses modified)

**Solutions:**
1. Review the missing tactics list
2. Re-run DNA scraper to get more tactical summaries
3. Check that Private Portal content is being prioritized
4. Verify base prompt has all required elements

### Vapi Validation Errors

**"Prompt exceeds Vapi character limit"**
- Reduce prompt size
- Remove redundant content
- Optimize tactical summaries

**"Prompt missing persona definition"**
- Ensure prompt starts with "You are..." or similar
- Check that persona section wasn't accidentally removed

## Best Practices

1. **Always run final-check** before deploying to production
2. **Review the heat map** to understand what changed
3. **Verify safety guardrails** are 100% intact
4. **Check missing tactics** if score < 85
5. **Keep backups** of `base_prompt.txt` and `merged_prompt_output.txt`

## Integration with CI/CD

You can integrate this into your deployment pipeline:

```bash
# In your CI/CD script
npm run merge-prompts $ASSISTANT_ID
npm run final-check

# Check exit code (0 = success, 1 = failure)
if [ $? -eq 0 ]; then
  echo "✅ Prompt verified, proceeding with deployment"
else
  echo "❌ Prompt verification failed, aborting deployment"
  exit 1
fi
```

## Next Steps

After verification:

1. **If Score ≥ 85**: Proceed with Vapi update (already done by merger)
2. **If Score < 85**: Address missing tactics and re-run merge
3. **Monitor Performance**: Track metrics in Admin Dashboard
4. **Iterate**: Continue scraping DNA and merging to improve score
