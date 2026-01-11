# Apex Prompt Merger - Elite Sales Architect

Merges core real estate logic with scraped tactical summaries from elite closers (Elliott/Cline), focusing on "Transfer of Conviction" style while preserving all technical details.

## Overview

The Apex Prompt Merger:
1. **Reads** `base_prompt.txt` (core wholesaling logic, PA Clauses 1-19, underwriting math)
2. **Loads** tactical summaries from `/raw_dna/summaries/`
3. **Merges** using GPT-4o with focus on "Transfer of Conviction" style
4. **Preserves** all technical contract details and price points
5. **Updates** Persona and Tonality sections
6. **Infuses** objection handling with elite closer techniques
7. **Updates** Vapi Assistant via PATCH API
8. **Logs** before/after word count and key tactical changes

## Key Features

### 🔒 Protected Elements (Never Modified)

1. **Technical Contract Details**
   - PA Clauses 1-19 (preserved verbatim)
   - All contract explanations unchanged

2. **Price Points & Math**
   - $82,700 purchase price (preserved exactly)
   - ARV calculations
   - 70% Rule logic
   - Underwriting formulas

3. **Core Logic**
   - Wholesaling process steps
   - Financial framework
   - Comp analysis instructions

### ✏️ Updated Elements

1. **Persona Section**
   - Infused with "Transfer of Conviction" style
   - Reflects Elliott/Cline confidence and authority
   - Enhanced conviction and certainty

2. **Tonality Directives**
   - Updated to match elite closer patterns
   - Tonality shift techniques integrated
   - Emotional trigger patterns added

3. **Objection Handling**
   - Power phrases from summaries integrated
   - Rebuttal patterns applied
   - "Transfer of Conviction" style infused
   - Assumptive closes and urgency creators added

## Setup

### 1. Base Prompt File

Ensure `base_prompt.txt` exists in project root with:
- Core wholesaling logic
- PA Clauses 1-19
- Underwriting math ($82,700, ARV, 70% Rule)

### 2. Tactical Summaries

Run batch scraper first to generate summaries:

```bash
npm run dna:batch
```

This creates files in `/raw_dna/summaries/` with tactical insights.

## Usage

```bash
npm run apex:merge <assistant-id>
```

**Example:**
```bash
npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f
```

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-key-here
VAPI_SECRET_KEY=your-vapi-secret-key
```

## How It Works

### 1. Base Prompt Reading
- Reads `base_prompt.txt` from project root
- Calculates word count for comparison

### 2. Tactical Summary Loading
- Scans `/raw_dna/summaries/` for `*_summary.json` files
- Aggregates all tactical insights:
  - Objection handling techniques
  - Power phrases
  - Rebuttal patterns
  - Tonality shifts
  - Closing frames
  - Key takeaways

### 3. GPT-4o Merging
- Sends base prompt + tactical insights to GPT-4o
- Instructs model to:
  - Preserve ALL technical details verbatim
  - Update Persona with "Transfer of Conviction" style
  - Update Tonality directives
  - Infuse objection handling with elite closer techniques
  - Maintain prompt structure

### 4. Safety Validation
- Verifies $82,700 price point is preserved
- Checks PA Summary clauses are intact
- Warns if protected elements are modified

### 5. Before/After Comparison
- Logs word count before and after
- Shows percentage change
- Lists all tactical changes made

### 6. Vapi Update
- Fetches current assistant config
- Updates system prompt via PATCH API
- Preserves all other settings

## Output Example

```
🚀 Starting Apex Prompt Merger (Elite Sales Architect)...

✅ Read base prompt (15,234 characters, 2,456 words)
✅ Loaded summary: eric-cline-closing-techniques_summary.json
✅ Loaded summary: andy-elliott-objection-handling_summary.json
✅ Loaded 2 tactical summary file(s)

🔀 Merging prompts with GPT-4o (Elite Sales Architect)...
✅ $82,700 price point verified as preserved
✅ PA Summary clauses verified as preserved
✅ Prompt merge complete

============================================================
📊 BEFORE vs AFTER COMPARISON
============================================================
Before: 2,456 words (15,234 characters)
After:  2,678 words (16,892 characters)
Change: +222 words (+9.0%)

🔧 KEY TACTICAL CHANGES:
  1. Updated Persona section with "Transfer of Conviction" style from Elliott/Cline
  2. Infused objection handling with 15 new power phrases
  3. Integrated tonality shift techniques (friendly → firm transitions)
  4. Added assumptive closes and urgency creators to closing section
  5. Enhanced emotional triggers based on elite closer patterns

📤 Updating Vapi Assistant: aaf338ae-b74a-43e4-ac48-73dd99817e9f
✅ Vapi Assistant updated successfully

✅ Apex Prompt Merger complete!
📝 Applied 5 tactical updates
💾 Assistant updated in Vapi
```

## "Transfer of Conviction" Style

The merger specifically focuses on infusing the "Transfer of Conviction" style, which includes:

### Key Elements:
- **Confidence**: Unwavering belief in the offer and process
- **Authority**: Taking control of the conversation
- **Certainty**: Speaking with conviction, not hesitation
- **Directness**: Cutting through objections with firm responses
- **Urgency**: Creating time pressure when needed

### Tonality Shifts:
- From friendly/empathetic → firm/authoritative
- Triggered by: objections, hesitation, price resistance
- Example: "I understand your concern, but let me be direct with you..."

### Objection Handling:
- Power phrases that transfer conviction
- Rebuttal patterns that maintain control
- Assumptive closes that assume the sale

## Comparison with Regular Prompt Merger

| Feature | Prompt Merger | Apex Prompt Merger |
|---------|---------------|-------------------|
| Focus | General linguistic patterns | "Transfer of Conviction" style |
| Input | DNA analysis files | Tactical summaries |
| Updates | Tonality & objection handling | Persona, tonality, objection handling |
| Style | Natural language patterns | Elite closer conviction |
| Use Case | General improvements | High-pressure, elite-level training |

## Integration Workflow

```
1. Scrape Elite Closer Videos
   ↓
   npm run dna:batch
   ↓
2. Generate Tactical Summaries
   ↓
   /raw_dna/summaries/*_summary.json
   ↓
3. Merge with Base Prompt
   ↓
   npm run apex:merge <assistant-id>
   ↓
4. Update Vapi Assistant
   ↓
   Live assistant with "Transfer of Conviction" style
```

## Best Practices

1. **Test First**: Review the merged prompt before deploying
2. **Incremental Updates**: Merge small batches of summaries at a time
3. **Monitor Performance**: Track call performance after each merge
4. **Preserve Core Logic**: Never modify `base_prompt.txt` directly
5. **Version Control**: Consider saving merged prompts for rollback

## Troubleshooting

### "base_prompt.txt not found"

Create the file in the project root with your core system prompt.

### "No tactical summary files found"

Run `npm run dna:batch` first to generate summaries.

### "$82,700 price point may have been modified"

The merger detected a potential issue. Review the merged prompt manually.

### "Failed to update assistant"

Check:
- `VAPI_SECRET_KEY` is correct
- Assistant ID is valid
- You have permissions to update the assistant

## Next Steps

After merging:

1. **Test the Assistant**: Make test calls to verify the new style
2. **Monitor Performance**: Track metrics in Admin Dashboard
3. **Iterate**: Scrape more videos and merge again
4. **Compare**: Use before/after word counts to track evolution

## Example Workflow

```bash
# 1. Scrape Elliott/Cline videos
npm run dna:batch

# 2. Review summaries
cat raw_dna/summaries/eric-cline-closing-techniques_summary.json

# 3. Merge with base prompt
npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

# 4. Test the updated assistant
# Make a test call and verify "Transfer of Conviction" style

# 5. Monitor performance
# Check Admin Dashboard for call metrics
```

## Key Differences from Regular Merger

The Apex Prompt Merger is specifically designed for:
- **Elite-level training** (Battle-Test Mode, Apex Level)
- **High-pressure scenarios** (Elliott-style intensity)
- **Transfer of Conviction** (not just language patterns)
- **Persona transformation** (not just objection handling)

Use the regular `prompt:merge` for general improvements, and `apex:merge` for elite-level, high-pressure training scenarios.
