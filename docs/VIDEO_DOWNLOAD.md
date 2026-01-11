# Video Download from Eric Cline Portal

## Overview

The Private Portal Scraper now includes video download functionality. It automatically detects and downloads videos from lesson pages while scraping text content.

## Features

- **Automatic Video Detection**: Finds video elements on lesson pages
- **Multiple Source Support**: Handles `<video>`, `<iframe>`, `<source>`, and video links
- **Authenticated Downloads**: Uses session cookies for authenticated access
- **Smart Naming**: Uses lesson title + timestamp for unique filenames
- **Fallback Methods**: Tries fetch first, falls back to page.goto if needed

## Usage

### Basic Usage

```bash
npm run portal:scrape
```

This will:
1. Login to the portal (or use saved session)
2. Navigate through all lesson pages
3. Extract text content
4. **Download any videos found on each page**
5. Save videos to `/uploads/private_videos/`
6. Save text to `/raw_dna/private/portal_text.txt`

### Video Detection

The scraper looks for videos using multiple methods:

1. **Video Elements**: `<video>` tags with `src` or `<source>` children
2. **Iframes**: Video iframes (skips YouTube/Vimeo embeds)
3. **Video Links**: Direct links to `.mp4`, `.mov`, `.m4v` files
4. **Data Attributes**: Elements with `data-video`, `data-src`, `data-url`
5. **Class-based**: Elements with `video` or `player` in class names

### Download Process

For each video found:
1. Extracts the video URL
2. Makes URL absolute if relative
3. Skips YouTube/Vimeo embeds (can't download directly)
4. Downloads with authentication cookies
5. Saves to `/uploads/private_videos/[lesson-title]_[timestamp].mp4`
6. Reports file size

## Output

### Video Files

Saved to: `/uploads/private_videos/`

**Naming Convention:**
- Format: `[sanitized-lesson-title]_[timestamp].[ext]`
- Example: `clause_17_explanation_1704123456789.mp4`

### Console Output

```
🎥 Looking for videos on: https://portal.com/lesson/clause-17
📥 Downloading video: https://portal.com/videos/clause-17.mp4...
✅ Downloaded: clause_17_explanation_1704123456789.mp4 (45.2 MB)
🎥 Downloaded 1 video(s) to /uploads/private_videos/
```

## Next Steps

After downloading videos:

1. **Transcribe Videos**:
   ```bash
   npm run videos:process
   ```
   This will transcribe all videos in `/uploads/private_videos/` using OpenAI Whisper.

2. **Merge with Base Prompt**:
   ```bash
   npm run apex:merge <assistant-id>
   ```
   This merges the video transcripts (with PRIORITY: 10) into the Vapi assistant prompt.

## Video Detection Strategies

### Strategy 1: Direct Video Elements
```html
<video src="https://portal.com/video.mp4"></video>
```
✅ Will be detected and downloaded

### Strategy 2: Source Elements
```html
<video>
  <source src="https://portal.com/video.mp4" type="video/mp4">
</video>
```
✅ Will be detected and downloaded

### Strategy 3: Video Links
```html
<a href="/videos/lesson-1.mp4">Download Video</a>
```
✅ Will be detected and downloaded

### Strategy 4: Embedded Videos
```html
<iframe src="https://youtube.com/embed/..."></iframe>
```
⏭️ Will be skipped (can't download YouTube/Vimeo directly)

## Authentication

Videos are downloaded with authentication:
- Uses cookies from the logged-in session
- Includes `Referer` header for portal access
- Falls back to `page.goto()` if fetch fails

## Troubleshooting

### "No downloadable videos found"
- Portal may use JavaScript-loaded videos (try running with `headless: false` to debug)
- Videos might be in iframes that require interaction
- Check browser console for video URLs

### "Failed to download video"
- Video URL might require additional authentication
- File might be too large (check network timeout)
- Portal might block automated downloads

### "HTTP 403 Forbidden"
- Session might have expired - delete `playwright/.auth/user.json` and re-run
- Portal might require additional headers
- Check if video URL is accessible in browser

## Manual Video Detection

If automatic detection fails, you can:

1. **Run with visible browser**:
   ```typescript
   // In privatePortalScraper.ts, change:
   browser = await chromium.launch({
     headless: false, // See what's happening
   });
   ```

2. **Inspect page manually**:
   - Open browser DevTools
   - Check Network tab for video requests
   - Look for `.mp4`, `.mov`, `.m4v` files
   - Note the exact URL pattern

3. **Add custom selectors**:
   - Update `videoSelectors` array in `downloadVideosFromPage()`
   - Add portal-specific selectors

## Best Practices

1. **Test First**: Run scraper on one lesson page first to verify video detection
2. **Check File Sizes**: Large videos (>100MB) might timeout - consider chunking
3. **Monitor Downloads**: Watch console output to see which videos are found
4. **Verify Files**: Check `/uploads/private_videos/` after scraping
5. **Process Videos**: Run `videos:process` after downloading to transcribe

## Example Workflow

```bash
# 1. Scrape portal and download videos
npm run portal:scrape

# Output:
# ✅ Scraped 5 lesson(s)
# 🎥 Downloaded 3 video(s) to /uploads/private_videos/

# 2. Check downloaded videos
ls -lh uploads/private_videos/

# 3. Transcribe videos
npm run videos:process

# 4. Merge with base prompt
npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f
```

## Limitations

- **Embedded Videos**: Cannot download YouTube/Vimeo embeds directly
- **DRM Protected**: Videos with DRM protection cannot be downloaded
- **JavaScript-Loaded**: Videos loaded dynamically via JavaScript may not be detected
- **Large Files**: Very large videos (>500MB) may timeout or fail

## Security Notes

- **Authentication**: Videos are downloaded with your portal session cookies
- **Private Content**: All videos are saved locally and excluded from git
- **Session State**: Keep `playwright/.auth/user.json` secure (contains auth cookies)
