# Deep-DNA Ingestion System

Secure authenticated scraper and high-capacity video processor for Eric Cline's private training portal.

## Overview

The Deep-DNA Ingestion System consists of three components:
1. **Portal Scraper** - Authenticated web scraping with session persistence
2. **Video Processor** - Intelligent chunking engine for long videos (>1 hour)
3. **Prompt Merger** - Infuses Private Portal DNA into Vapi System Prompt

## Components

### 1. Portal Scraper (`scripts/privatePortalScraper.ts`)

**Features:**
- Secure login to `https://portal.theericcline.com/login`
- Session persistence (`playwright/.auth/user.json`)
- Recursive course module navigation
- Content extraction (headers, paragraphs, transcripts)
- Priority tagging (`PRIORITY: 10`)

**Usage:**
```bash
npm run portal:scrape
```

**Output:**
- `/raw_dna/private/portal_text.txt` (all lesson content)

### 2. Video Processor (`scripts/privateVideoProcessor.ts`)

**Features:**
- Audio extraction (mono MP3 at 64kbps)
- Intelligent chunking (splits if > 25MB into 10-minute segments)
- Whisper API transcription per chunk
- Merged transcript output

**Pipeline:**
```
Video File → Extract Audio (64kbps mono MP3) → Check Size
  ↓
If > 25MB → Chunk into 10-min segments → Transcribe each chunk
  ↓
If ≤ 25MB → Transcribe directly
  ↓
Merge transcripts → Save to portal_videos.txt
```

**Usage:**
```bash
npm run videos:process
```

**Output:**
- `/raw_dna/private/portal_videos.txt` (all video transcripts with `PRIORITY: 10`)

### 3. Prompt Merger (`scripts/apexPromptMerger.ts`)

**Features:**
- Reads `base_prompt.txt` and all files from `/raw_dna/private/`
- Uses GPT-4o to merge with specific instructions
- Infuses Private Portal DNA into Closing and Objection sections
- Preserves $82,700 price point and PA Clauses 1-19
- Updates Vapi Assistant via PATCH API

**Usage:**
```bash
npm run apex:merge <assistant-id>
```

## Setup

### 1. Environment Variables

Add to `.env.local`:
```bash
PORTAL_LOGIN_URL=https://portal.theericcline.com/login
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_password
OPENAI_API_KEY=sk-your-key-here
VAPI_SECRET_KEY=your-vapi-secret-key
```

### 2. Install FFmpeg

The video processor requires FFmpeg:

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 3. Install Dependencies

```bash
npm install
npx playwright install chromium
```

## Workflow

### Complete Ingestion Pipeline

```bash
# 1. Scrape private portal
npm run portal:scrape

# 2. Process videos (with chunking for long videos)
npm run videos:process

# 3. Merge with base prompt (infuses Private Portal DNA)
npm run apex:merge <assistant-id>
```

## Video Processing Details

### Audio Extraction
- Format: Mono MP3
- Bitrate: 64kbps
- Sample Rate: 22050 Hz
- Purpose: Reduces file size for API uploads

### Chunking Logic
- **Threshold**: 25MB
- **Chunk Size**: 10 minutes per segment
- **Why**: OpenAI Whisper API has file size limits
- **Result**: Long videos (>1 hour) are automatically split

### Transcription
- Model: OpenAI Whisper-1
- Language: English
- Temperature: 0 (deterministic)
- Prompt: "This is a real estate sales training video by Eric Cline..."

### Merging
- Chunks are transcribed separately
- Transcripts are merged with segment markers
- Final output is a cohesive transcript

## Prompt Merger Instructions

The merger specifically:

1. **Reads** all files from `/raw_dna/private/`
2. **Extracts** key insights:
   - Eric's Tips
   - Clause 17 specific phrasing
   - Closing techniques
   - Objection handling
   - Technical details
3. **Infuses** into:
   - Closing section
   - Objection Handling section
   - Persona and Tonality sections
4. **Preserves** (NEVER MODIFIES):
   - $82,700 price point
   - PA Clauses 1-19
   - ARV/70% Rule logic
   - Underwriting math

## Priority System

- **PRIORITY: 10** - Private Cline Portal (HIGHEST)
  - Overrides all conflicting content
  - Eric's specific phrasing used exactly
  - Clause 17 private phrasing takes precedence

- **LOWER PRIORITY** - Public YouTube summaries
  - Only used if not conflicting
  - Generic tactics as fallback

## File Structure

```
raw_dna/
└── private/
    ├── portal_text.txt          # Portal scraper output
    └── portal_videos.txt         # Video transcripts (chunked)

uploads/
└── private_videos/               # Drop videos here
    └── [your-videos].mp4

playwright/
└── .auth/
    └── user.json                 # Saved session state

temp/
└── video_processing/             # Temporary audio files (auto-cleaned)
```

## Troubleshooting

### Portal Scraper

**"Failed to login"**
- Check credentials in `.env` file
- Verify portal URL is correct
- Delete `playwright/.auth/user.json` and try again

**"No lesson links found"**
- Portal structure may have changed
- Manually navigate to a course page first
- Check browser console (run with `headless: false`)

### Video Processor

**"FFmpeg not found"**
- Install FFmpeg: `brew install ffmpeg` (macOS) or `sudo apt-get install ffmpeg` (Linux)
- Verify installation: `ffmpeg -version`

**"File API not available"**
- Requires Node.js 18+
- Update Node.js: `nvm install 18 && nvm use 18`

**"Transcription failed"**
- Check `OPENAI_API_KEY` is set
- Verify file format is supported
- Check API credits/limits

**"Chunking failed"**
- Ensure FFmpeg is properly installed
- Check video file is not corrupted
- Verify sufficient disk space in `temp/` directory

### Prompt Merger

**"No private portal files found"**
- Run `portal:scrape` first
- Run `videos:process` if you have videos
- Check files exist in `/raw_dna/private/`

**"$82,700 price point may have been modified"**
- Review the merged prompt manually
- The merger detected a potential issue
- Check that base_prompt.txt contains the price point

## Best Practices

1. **Regular Updates**: Run portal scraper when new content is added
2. **Video Processing**: Process videos in batches to avoid API rate limits
3. **Chunking**: Long videos (>1 hour) are automatically chunked
4. **Priority Review**: Verify Private Portal content is being prioritized
5. **Backup**: Keep backups of `/raw_dna/private/` folder
6. **Session Management**: Delete session state if login issues occur

## Example Workflow

```bash
# 1. Scrape private portal (saves session)
npm run portal:scrape

# 2. Upload videos to /uploads/private_videos/
# (copy video files to the folder)

# 3. Process videos (extracts, chunks if needed, transcribes)
npm run videos:process

# 4. Merge with base prompt (infuses Private Portal DNA)
npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

# 5. Verify Private Portal content was prioritized
# Check the merged prompt for Eric's specific phrasing
```

## Technical Details

### Chunking Algorithm
- Calculates audio duration and file size
- If > 25MB: Splits into 10-minute segments
- Each chunk is transcribed separately
- Transcripts are merged with segment markers

### Priority Weighting
- Private Portal content: `PRIORITY: 10` (highest)
- Public summaries: Lower priority
- Conflicts resolved in favor of Private Portal

### Safety Checks
- $82,700 price point preservation
- PA Clauses 1-19 preservation
- Technical logic preservation
- Structure maintenance

## Next Steps

After ingestion:

1. **Test the Assistant**: Make test calls to verify Private Portal DNA
2. **Monitor Performance**: Track metrics in Admin Dashboard
3. **Iterate**: Scrape more content and merge again
4. **Compare**: Use before/after word counts to track evolution
