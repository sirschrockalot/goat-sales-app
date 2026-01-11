# Prompt Merger - Automated System Prompt Updater

Automatically merges scraped DNA analysis (from elite closer transcripts) with your base prompt and updates the Vapi Assistant in real-time.

## Overview

The Prompt Merger:
1. **Reads** `base_prompt.txt` (your core wholesaling logic)
2. **Loads** DNA analysis files from `/raw_dna/analysis/`
3. **Merges** them using GPT-4o, preserving technical logic
4. **Updates** the Vapi Assistant via PATCH API
5. **Stores** the new version in Supabase for rollback capability

## Safety Features

### 🔒 Protected Elements (Never Modified)

1. **PA Summary Clauses (1-19)**
   - All Purchase Agreement clause explanations are preserved verbatim
   - The merger detects and protects the entire PA Summary section
   - No modifications to legal explanations

2. **Technical Real Estate Logic**
   - $82,700 purchase price point (preserved exactly)
   - ARV (After Repair Value) calculations
   - 70% Rule logic
   - Financial framework (Fix & Flip, Buy & Hold, Creative Finance)
   - Comp analysis instructions

### ✏️ Updated Elements

1. **Tonality & Voice**
   - Linguistic patterns from elite closers
   - Speaking style and rhythm
   - Emotional tone directives

2. **Objection Handling**
   - Power phrases integrated naturally
   - Rebuttal techniques updated
   - Objection response patterns

3. **Rapport Building**
   - Emotional triggers enhanced
   - Connection techniques updated
   - Story-telling patterns

## Setup

### 1. Create Base Prompt File

Create `base_prompt.txt` in the project root with your core system prompt:

```
You are a property SELLER (homeowner) who is considering selling your home...

[Your full system prompt with $82,700 price point, PA Summary clauses 1-19, etc.]
```

### 2. Scrape DNA First

Before merging, you need DNA analysis files:

```bash
# Scrape YouTube videos
npm run dna:scrape https://www.youtube.com/watch?v=VIDEO_ID

# This creates analysis files in /raw_dna/analysis/
```

## Usage

```bash
npm run prompt:merge <assistant-id>
```

**Example:**
```bash
npm run prompt:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f
```

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-key-here
VAPI_SECRET_KEY=your-vapi-secret-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How It Works

### 1. Base Prompt Reading
- Reads `base_prompt.txt` from project root
- Validates file exists and is not empty

### 2. DNA Analysis Loading
- Scans `/raw_dna/analysis/` for `*_analysis.json` files
- Loads all power phrases, linguistic patterns, techniques, and triggers

### 3. Safety Extraction
- Extracts PA Summary clauses (1-19) for preservation
- Identifies technical logic sections ($82,700, ARV, 70% Rule)

### 4. GPT-4o Merging
- Sends base prompt + DNA insights to GPT-4o
- Instructs model to:
  - Preserve technical logic verbatim
  - Preserve PA Summary clauses verbatim
  - Update only tonality and objection handling
  - Integrate power phrases naturally

### 5. Safety Validation
- Verifies PA Summary is preserved
- Verifies $82,700 price point is unchanged
- Warns if any protected elements are modified

### 6. Vapi Update
- Fetches current assistant config
- Updates system prompt via PATCH API
- Preserves all other settings (voice, model, etc.)

### 7. Version Storage
- Saves new prompt to `prompt_versions` table
- Deactivates previous versions
- Enables rollback capability

## Output

The script provides detailed logging:

```
🚀 Starting Prompt Merger...

✅ Read base prompt (15,234 characters)
✅ Loaded analysis: video_title_1_analysis.json
✅ Loaded analysis: video_title_2_analysis.json
✅ Loaded 2 DNA analysis file(s)

🔀 Merging prompts with GPT-4o...
✅ PA Summary clauses verified as preserved
✅ $82,700 price point verified as preserved
✅ Prompt merge complete

📤 Updating Vapi Assistant: aaf338ae-b74a-43e4-ac48-73dd99817e9f
✅ Vapi Assistant updated successfully

💾 Saving prompt version to Supabase...
✅ Saved prompt version 2 for assistant aaf338ae-b74a-43e4-ac48-73dd99817e9f

✅ Prompt merger complete!
📝 Changes: Updated objection handling with 5 new power phrases from Eric Cline...
💾 Version saved to Supabase for rollback
```

## Rollback

If a merged prompt causes issues, you can rollback using the Admin Dashboard:

1. Go to `/admin/dashboard`
2. Navigate to "AI Training Center"
3. View "Version History"
4. Click "Rollback" on a previous version

Or use the Supabase `prompt_versions` table directly.

## Troubleshooting

### "base_prompt.txt not found"

Create the file in the project root with your core system prompt.

### "No analysis files found"

Run `npm run dna:scrape` first to generate analysis files.

### "PA Summary may not be fully preserved"

The merger detected a potential issue. Review the merged prompt manually before deploying.

### "Failed to update assistant"

Check:
- `VAPI_SECRET_KEY` is correct
- Assistant ID is valid
- You have permissions to update the assistant

## Integration with DNA Scraper

The Prompt Merger is designed to work seamlessly with the DNA Scraper:

1. **Scrape** elite closer videos → `npm run dna:scrape`
2. **Analyze** transcripts → Analysis files created in `/raw_dna/analysis/`
3. **Merge** with base prompt → `npm run prompt:merge`
4. **Deploy** to Vapi Assistant → Automatic update via API

## Best Practices

1. **Test First**: Review the merged prompt before deploying to production
2. **Version Control**: Each merge creates a new version for easy rollback
3. **Incremental Updates**: Merge small batches of DNA analyses at a time
4. **Monitor Performance**: Track call performance after each merge
5. **Preserve Core Logic**: Never modify `base_prompt.txt` directly - use the merger

## Example Workflow

```bash
# 1. Scrape Eric Cline videos
npm run dna:scrape https://youtube.com/watch?v=closer-video-1
npm run dna:scrape https://youtube.com/watch?v=closer-video-2

# 2. Review analysis files
cat raw_dna/analysis/video_title_1_analysis.json

# 3. Merge with base prompt
npm run prompt:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

# 4. Test the updated assistant
# Make a test call and verify the new power phrases are used

# 5. If issues, rollback via Admin Dashboard
```

## Next Steps

After merging, you can:
1. Test the updated assistant with live calls
2. Monitor performance metrics in the Admin Dashboard
3. Rollback if needed using version history
4. Iterate by scraping more videos and merging again
