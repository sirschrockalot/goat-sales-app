# Private Portal Scraper - Eric Cline's Private Training Portal

Secure authenticated scraper for extracting elite sales DNA from Eric Cline's private training portal.

## Overview

The Private Portal Scraper consists of two components:
1. **Portal Scraper** - Authenticated web scraping of course content
2. **Video Processor** - OpenAI Whisper transcription of training videos

Both components tag content with `SOURCE: PRIVATE_PORTAL | PRIORITY: HIGH` for weighted priority in the Apex Prompt Merger.

## Setup

### 1. Environment Variables

Add to `.env.local` or `.env.development`:

```bash
# Private Portal Configuration
PORTAL_LOGIN_URL=https://your-portal-url.com/login
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_password

# OpenAI (for video transcription)
OPENAI_API_KEY=sk-your-key-here
```

### 2. Install Dependencies

Dependencies are already installed:
- `playwright` - For browser automation
- `chokidar` - For file watching
- `openai` - For Whisper API
- `fs-extra` - For file management

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

## Portal Scraper

### Usage

```bash
npm run portal:scrape
```

### Features

- **Secure Login**: Authenticates with portal credentials
- **Session Management**: Saves browser state/cookies to avoid re-login
- **Course Navigation**: Automatically finds and navigates through course modules
- **Content Extraction**:
  - Lesson titles
  - Technical text content
  - "Eric's Tips" sections
- **Priority Tagging**: All content tagged with `SOURCE: PRIVATE_PORTAL | PRIORITY: HIGH`

### Output

Saves to: `/raw_dna/private/text_lessons.txt`

**Format:**
```
================================================================================
SOURCE: PRIVATE_PORTAL | PRIORITY: HIGH
Scraped: 2024-01-15T10:30:00.000Z
Portal: https://your-portal-url.com/login
================================================================================

================================================================================
LESSON: Clause 17 Explanation
URL: https://portal.com/lesson/clause-17
================================================================================

CONTENT:
[Full lesson text content]

ERIC'S TIPS:
1. [Tip 1]
2. [Tip 2]
...
```

### Session Persistence

Browser state is saved to `.playwright-state/portal-auth.json`. The scraper will:
1. Try to use saved session first
2. Login if session expired
3. Save new session after successful login

## Video Processor

### Usage

**Process existing videos:**
```bash
npm run videos:process
```

**Watch for new videos (continuous):**
```bash
npm run videos:watch
```

### Features

- **Automatic Detection**: Watches `/uploads/private_videos/` folder
- **Format Support**: `.mp4`, `.mov`, `.m4v`, `.avi`, `.mkv`, `.webm`
- **OpenAI Whisper**: High-fidelity transcription using Whisper-1 model
- **Priority Tagging**: All transcripts tagged with `SOURCE: PRIVATE_PORTAL | PRIORITY: HIGH`
- **Duplicate Prevention**: Skips files that already have transcripts

### Workflow

1. **Upload videos** to `/uploads/private_videos/`
2. **Run processor** (one-time or watch mode)
3. **Transcripts saved** to `/raw_dna/private/video_transcripts/`

### Output

Saves to: `/raw_dna/private/video_transcripts/[video-name]_transcript.txt`

**Format:**
```
================================================================================
SOURCE: PRIVATE_PORTAL | PRIORITY: HIGH
Video: eric-cline-closing-techniques.mp4
Processed: 2024-01-15T10:30:00.000Z
Model: OpenAI Whisper-1
================================================================================

[Full transcript text]
```

## Priority Weighting in Apex Prompt Merger

The Apex Prompt Merger (`apex:merge`) automatically gives **HIGHEST PRIORITY** to Private Portal content:

### Priority Hierarchy

1. **PRIVATE_PORTAL** (HIGHEST)
   - Text lessons from portal scraper
   - Video transcripts from video processor
   - Eric's specific phrasing (especially Clause 17)
   - Technical details from private training

2. **PUBLIC TACTICAL SUMMARIES** (LOWER)
   - YouTube scraped summaries
   - Generic public tactics
   - Only used if not conflicting with Private Portal

### Override Logic

- **Clause 17 Phrasing**: Private Portal phrasing overrides public tactics
- **Technical Details**: Private Portal technicalities take precedence
- **Eric's Tips**: Private tips override generic advice
- **Specific Techniques**: Private techniques replace public patterns

## Integration Workflow

```
1. Scrape Private Portal
   ↓
   npm run portal:scrape
   ↓
   /raw_dna/private/text_lessons.txt
   ↓
2. Process Private Videos
   ↓
   npm run videos:process (or videos:watch)
   ↓
   /raw_dna/private/video_transcripts/
   ↓
3. Merge with Base Prompt
   ↓
   npm run apex:merge <assistant-id>
   ↓
4. Private Portal content overrides public tactics
   ↓
   Live assistant with Eric's private technicalities
```

## Troubleshooting

### Portal Scraper

**"Failed to login"**
- Check credentials in `.env` file
- Verify `PORTAL_LOGIN_URL` is correct
- Portal structure may have changed - check selectors

**"No course modules found"**
- Portal structure may be different
- Manually navigate to a course page and run again
- Check browser console for errors (run with `headless: false`)

**"Session expired"**
- Delete `.playwright-state/portal-auth.json`
- Run scraper again to create new session

### Video Processor

**"File not found"**
- Ensure videos are in `/uploads/private_videos/`
- Check file permissions

**"Transcription failed"**
- Verify `OPENAI_API_KEY` is set
- Check file format is supported
- Ensure file is not corrupted

**"Whisper API error"**
- Check API key has sufficient credits
- Verify file size (Whisper has size limits)
- Try converting video to MP4 format

## Security Notes

- **Credentials**: Never commit `.env` files with portal credentials
- **Session State**: `.playwright-state/` contains authentication cookies - keep secure
- **Private Content**: All scraped content is marked as private and excluded from git

## Best Practices

1. **Regular Updates**: Run portal scraper when new content is added
2. **Video Processing**: Use watch mode for continuous processing
3. **Priority Review**: Check that Private Portal content is being prioritized
4. **Backup**: Keep backups of `/raw_dna/private/` folder
5. **Session Management**: Delete session state if login issues occur

## Example Workflow

```bash
# 1. Scrape private portal
npm run portal:scrape

# 2. Upload videos to /uploads/private_videos/
# (copy video files to the folder)

# 3. Process videos
npm run videos:process

# 4. Merge with base prompt (Private Portal gets priority)
npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

# 5. Verify Private Portal content was prioritized
# Check the merged prompt for Eric's specific phrasing
```

## File Structure

```
raw_dna/
└── private/
    ├── text_lessons.txt          # Portal scraper output
    └── video_transcripts/
        ├── video1_transcript.txt
        └── video2_transcript.txt

uploads/
└── private_videos/
    ├── eric-cline-closing.mp4
    └── clause-17-explanation.mov

.playwright-state/
└── portal-auth.json              # Saved session state
```
