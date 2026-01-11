# DNA Scraper - YouTube Transcript Extractor

Extracts and analyzes transcripts from elite real estate closers (Eric Cline, Andy Elliott, etc.) to train the AI with authentic closing techniques.

## Overview

The DNA Scraper:
1. **Extracts** YouTube transcripts from video URLs
2. **Cleans** the text (removes timestamps, bracketed noises like `[Music]`)
3. **Saves** raw transcripts to `/raw_dna` folder
4. **Analyzes** transcripts with GPT-4o to extract:
   - Power Phrases (for Clause 17, Price Defense, Rapport, etc.)
   - Linguistic Patterns
   - Key Techniques
   - Emotional Triggers

## Installation

Dependencies are already installed:
- `youtube-transcript` - For extracting YouTube transcripts
- `fs-extra` - For file management
- `openai` - For GPT-4o analysis

## Usage

### Scrape YouTube Videos

```bash
npm run dna:scrape <youtube-url-1> [youtube-url-2] ...
```

**Example:**
```bash
npm run dna:scrape https://www.youtube.com/watch?v=VIDEO_ID
```

### Post-Process Existing Transcripts

If you already have transcripts in `/raw_dna`, analyze them:

```bash
npm run dna:analyze
```

## Output Structure

```
raw_dna/
├── video_title_1.txt          # Raw cleaned transcript
├── video_title_2.txt
└── analysis/
    ├── video_title_1_analysis.json  # GPT-4o analysis
    └── video_title_2_analysis.json
```

## Analysis Output Format

Each analysis JSON contains:

```json
{
  "summary": "2-3 sentence summary of linguistic style",
  "powerPhrases": [
    {
      "phrase": "exact phrase used",
      "context": "when/why it was used",
      "useCase": "clause_17|price_defense|rapport|objection_handling|closing|other",
      "frequency": 3
    }
  ],
  "linguisticPatterns": ["pattern 1", "pattern 2"],
  "keyTechniques": ["technique 1", "technique 2"],
  "emotionalTriggers": ["trigger 1", "trigger 2"]
}
```

## Use Cases

### Power Phrases for Clause 17

The scraper identifies phrases used to explain the Memorandum of Contract:
- "This is just a reservation sign"
- "It protects both of us during escrow"
- "It prevents other buyers from snaking the deal"

### Power Phrases for Price Defense

Identifies phrases used to justify offers:
- "Based on the comps in your area"
- "The 70% Rule ensures we can complete repairs"
- "This is what the numbers support"

## Integration with AI Training

The extracted power phrases can be:
1. **Added to objection banks** (`src/lib/objectionBank.ts`)
2. **Injected into system prompts** (`src/lib/generatePersona.ts`)
3. **Used in Learning Mode** to show reps authentic closing language

## Example Workflow

1. **Find elite closer videos** (Eric Cline, Andy Elliott, etc.)
2. **Scrape transcripts:**
   ```bash
   npm run dna:scrape https://youtube.com/watch?v=...
   ```
3. **Review analysis** in `raw_dna/analysis/`
4. **Extract power phrases** and add to training system
5. **Update AI prompts** with authentic closing language

## Troubleshooting

### "Transcript not available"

Some videos don't have transcripts enabled. Try:
- Different video from the same channel
- Check if captions are available on YouTube

### "Invalid YouTube URL"

Make sure the URL is in one of these formats:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

### OpenAI API Errors

Ensure `OPENAI_API_KEY` is set in your `.env.local`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

## Next Steps

After scraping, you can:
1. Review power phrases and add them to the objection bank
2. Update system prompts with authentic closing language
3. Create a "Power Phrase Library" component for reps to study
4. Integrate phrases into the AI judge for better scoring
