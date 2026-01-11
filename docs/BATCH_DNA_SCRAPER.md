# Batch DNA Scraper - High-Volume YouTube Transcript Processor

Processes multiple YouTube URLs from a file, extracts transcripts, and generates tactical summaries focused on Objection Handling, Tonality Shifts, and Closing Frames.

## Overview

The Batch DNA Scraper:
1. **Reads** URLs from `urls_to_scrape.txt` (one per line)
2. **Scrapes** transcripts from each YouTube video
3. **Cleans** text (removes `[Music]`, `[Applause]`, timestamps)
4. **Saves** transcripts to `/raw_dna/scripts/[video-title].txt`
5. **Generates** GPT-4o tactical summaries
6. **Saves** summaries to `/raw_dna/summaries/[video-title]_summary.json`

## Setup

### 1. Install Dependencies

Dependencies are already installed:
- `youtube-transcript` - For extracting YouTube transcripts
- `fs-extra` - For file management
- `slugify` - For sanitizing filenames
- `openai` - For GPT-4o analysis

### 2. Create URLs File

Create `urls_to_scrape.txt` in the project root:

```
https://www.youtube.com/watch?v=VIDEO_ID_1
https://www.youtube.com/watch?v=VIDEO_ID_2
https://youtu.be/VIDEO_ID_3
# Comments start with #
# Empty lines are ignored
```

**Example:**
```
https://www.youtube.com/watch?v=eric-cline-closing-1
https://www.youtube.com/watch?v=andy-elliott-objection-handling
https://youtu.be/master-closer-techniques
```

## Usage

```bash
npm run dna:batch
```

The script will:
1. Read all URLs from `urls_to_scrape.txt`
2. Process each URL sequentially
3. Save transcripts and summaries
4. Display a summary report

## Output Structure

```
raw_dna/
├── scripts/
│   ├── eric-cline-closing-techniques.txt
│   ├── andy-elliott-objection-handling.txt
│   └── master-closer-techniques.txt
└── summaries/
    ├── eric-cline-closing-techniques_summary.json
    ├── andy-elliott-objection-handling_summary.json
    └── master-closer-techniques_summary.json
```

## Tactical Summary Format

Each summary JSON contains:

```json
{
  "videoTitle": "Eric Cline - Closing Techniques",
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "objectionHandling": {
    "techniques": [
      "Acknowledge then pivot",
      "Use seller's words against them",
      "Reframe the objection as a question"
    ],
    "powerPhrases": [
      "I understand your concern, but...",
      "What if I told you...",
      "Let me ask you this..."
    ],
    "rebuttalPatterns": [
      "Pattern 1: Empathize → Reframe → Close",
      "Pattern 2: Question → Listen → Counter"
    ]
  },
  "tonalityShifts": {
    "transitions": [
      {
        "from": "friendly",
        "to": "firm",
        "trigger": "Seller hesitates on price",
        "example": "\"I understand, but let me be direct with you...\""
      }
    ],
    "emotionalTriggers": [
      "urgency",
      "fear of loss",
      "desire for certainty"
    ]
  },
  "closingFrames": {
    "assumptiveCloses": [
      "When would be a good time to close?",
      "What's your timeline for moving?"
    ],
    "urgencyCreators": [
      "We have other properties we're looking at",
      "The market is moving fast right now"
    ],
    "finalStatements": [
      "This is the best offer you'll get",
      "Let's lock this in today"
    ]
  },
  "keyTakeaways": [
    "Takeaway 1: Specific insight",
    "Takeaway 2: Another insight",
    "Takeaway 3: Final insight"
  ]
}
```

## Features

### Text Cleaning

Automatically removes:
- Bracketed sounds: `[Music]`, `[Applause]`, `[Laughter]`
- Timestamps: `00:00:00`, `0:00`
- Extra whitespace

### Filename Sanitization

Uses `slugify` to create safe filenames:
- Converts to lowercase
- Removes special characters
- Replaces spaces with hyphens
- Limits length to 200 characters

### Rate Limiting

Includes a 2-second delay between requests to avoid:
- YouTube rate limiting
- API throttling
- Server overload

### Error Handling

- Continues processing even if one URL fails
- Logs detailed error messages
- Provides summary report at the end

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-key-here
```

## Example Output

```
🚀 Starting Batch DNA Scraper...

📋 Found 3 URL(s) to scrape

[1/3] Processing: https://www.youtube.com/watch?v=...
📥 Scraping: https://www.youtube.com/watch?v=...
✅ Scraped: Eric Cline - Closing Techniques (15,234 characters)
💾 Saved: /raw_dna/scripts/eric-cline-closing-techniques.txt
🔍 Generating tactical summary for: Eric Cline - Closing Techniques
✅ Summary generated: 5 takeaways
💾 Saved summary: /raw_dna/summaries/eric-cline-closing-techniques_summary.json

[2/3] Processing: https://www.youtube.com/watch?v=...
...

============================================================
📊 BATCH SCRAPING SUMMARY
============================================================
✅ Successful: 3/3
❌ Failed: 0/3

✅ Successfully processed:
  - Eric Cline - Closing Techniques
    Transcript: /raw_dna/scripts/eric-cline-closing-techniques.txt
    Summary: /raw_dna/summaries/eric-cline-closing-techniques_summary.json
  ...

✅ Batch scraping complete!
```

## Use Cases

### 1. Bulk Processing

Process entire playlists or channel videos:

```
# urls_to_scrape.txt
https://www.youtube.com/watch?v=video1
https://www.youtube.com/watch?v=video2
https://www.youtube.com/watch?v=video3
...
```

### 2. Focused Analysis

Target specific topics:

```
# Objection Handling Videos
https://www.youtube.com/watch?v=objection-1
https://www.youtube.com/watch?v=objection-2

# Closing Techniques
https://www.youtube.com/watch?v=closing-1
https://www.youtube.com/watch?v=closing-2
```

### 3. Competitive Intelligence

Scrape competitor content to analyze their techniques.

## Integration with Other Tools

### With DNA Scraper

1. **Batch scrape** → `npm run dna:batch`
2. **Individual analysis** → `npm run dna:analyze` (if needed)

### With Prompt Merger

1. **Batch scrape** → `npm run dna:batch`
2. **Merge prompts** → `npm run prompt:merge <assistant-id>`

The batch scraper creates summaries that can be used by the prompt merger to update AI assistants.

## Troubleshooting

### "urls_to_scrape.txt not found"

Create the file in the project root with one URL per line.

### "No URLs found in urls_to_scrape.txt"

Ensure the file contains valid YouTube URLs (one per line).

### "Transcript not available"

Some videos don't have transcripts enabled. Try:
- Different videos from the same channel
- Check if captions are available on YouTube

### "Failed to fetch video title"

The script will fall back to using the video ID as the filename.

### OpenAI API Errors

Ensure `OPENAI_API_KEY` is set in your `.env.local`.

### Rate Limiting

If you encounter rate limits:
- Reduce the number of URLs per batch
- Increase the delay between requests (modify the `setTimeout` value)
- Process in smaller batches

## Best Practices

1. **Start Small**: Test with 2-3 URLs first
2. **Organize URLs**: Group related videos together
3. **Review Summaries**: Check tactical summaries for quality
4. **Incremental Processing**: Process large batches in smaller chunks
5. **Backup Data**: Keep `raw_dna/` folder backed up

## Next Steps

After batch scraping:

1. **Review Summaries**: Check `/raw_dna/summaries/` for insights
2. **Extract Power Phrases**: Use summaries to identify key techniques
3. **Update Prompts**: Use insights in prompt merger
4. **Train AI**: Integrate tactics into AI assistant prompts

## Comparison with DNA Scraper

| Feature | DNA Scraper | Batch DNA Scraper |
|---------|-------------|-------------------|
| Input | Command-line URLs | File (`urls_to_scrape.txt`) |
| Output | `/raw_dna/` + `/raw_dna/analysis/` | `/raw_dna/scripts/` + `/raw_dna/summaries/` |
| Analysis | Power phrases, linguistic patterns | Tactical summaries (objection handling, tonality, closing) |
| Use Case | Single video deep analysis | Bulk processing |
| Summary Focus | General linguistic analysis | Specific tactical insights |

Both tools complement each other:
- **DNA Scraper**: Deep analysis of individual videos
- **Batch Scraper**: High-volume processing with tactical focus
