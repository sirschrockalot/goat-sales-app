/**
 * Batch DNA Scraper - High-Volume YouTube Transcript Processor
 * Processes multiple YouTube URLs from a file and generates tactical summaries
 * 
 * Features:
 * - Batch processing from urls_to_scrape.txt
 * - Automatic transcript cleaning (removes [Music], [Applause], etc.)
 * - GPT-4o tactical summaries (Objection Handling, Tonality Shifts, Closing Frames)
 * - Organized output structure
 */

import { YoutubeTranscript } from 'youtube-transcript';
import * as fs from 'fs-extra';
import * as path from 'path';
import slugify from 'slugify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

interface TacticalSummary {
  videoTitle: string;
  videoUrl: string;
  objectionHandling: {
    techniques: string[];
    powerPhrases: string[];
    rebuttalPatterns: string[];
  };
  tonalityShifts: {
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      example: string;
    }>;
    emotionalTriggers: string[];
  };
  closingFrames: {
    assumptiveCloses: string[];
    urgencyCreators: string[];
    finalStatements: string[];
  };
  keyTakeaways: string[];
}

/**
 * Clean transcript text by removing timestamps and bracketed noises
 */
function cleanTranscript(rawTranscript: TranscriptEntry[]): string {
  let cleanedText = rawTranscript
    .map(entry => entry.text)
    .join(' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Remove bracketed noises: [Music], [Applause], [Laughter], etc.
  cleanedText = cleanedText.replace(/\[.*?\]/g, '');

  // Remove timestamps if they appear in the text (format: 00:00:00 or 0:00)
  cleanedText = cleanedText.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '');

  // Remove extra whitespace
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  return cleanedText;
}

/**
 * Extract video title from YouTube URL
 */
async function getVideoTitle(videoUrl: string): Promise<string> {
  try {
    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch || !videoIdMatch[1]) {
      throw new Error('Invalid YouTube URL');
    }

    const videoId = videoIdMatch[1];

    // Fetch video metadata to get title
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
    
    if (response.ok) {
      const data = await response.json();
      return data.title || `video_${videoId}`;
    }

    // Fallback to video ID
    return `video_${videoId}`;
  } catch (error) {
    console.error(`Error fetching video title for ${videoUrl}:`, error);
    // Fallback: extract video ID and use it
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = videoIdMatch?.[1] || 'unknown';
    return `video_${videoId}`;
  }
}

/**
 * Sanitize filename using slugify
 */
function sanitizeFilename(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  }).substring(0, 200);
}

/**
 * Scrape YouTube transcript from a single URL
 */
async function scrapeTranscript(videoUrl: string): Promise<{ title: string; transcript: string }> {
  try {
    console.log(`📥 Scraping: ${videoUrl}`);

    // Extract transcript
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoUrl);

    // Clean the transcript
    const cleanedTranscript = cleanTranscript(rawTranscript);

    // Get video title
    const title = await getVideoTitle(videoUrl);

    console.log(`✅ Scraped: ${title} (${cleanedTranscript.length} characters)`);

    return {
      title,
      transcript: cleanedTranscript,
    };
  } catch (error) {
    console.error(`❌ Error scraping ${videoUrl}:`, error);
    throw error;
  }
}

/**
 * Save transcript to /raw_dna/scripts/
 */
async function saveTranscript(title: string, transcript: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'raw_dna', 'scripts');
  
  // Ensure directory exists
  await fs.ensureDir(outputDir);

  // Create filename
  const filename = `${sanitizeFilename(title)}.txt`;
  const filePath = path.join(outputDir, filename);

  // Save transcript
  await fs.writeFile(filePath, transcript, 'utf-8');

  console.log(`💾 Saved: ${filePath}`);

  return filePath;
}

/**
 * Generate tactical summary using GPT-4o
 */
async function generateTacticalSummary(
  videoTitle: string,
  videoUrl: string,
  transcript: string
): Promise<TacticalSummary> {
  console.log(`🔍 Generating tactical summary for: ${videoTitle}`);

  const prompt = `You are a Sales Tactics Analyst specializing in real estate closing techniques. Analyze the following transcript from an elite real estate closer and extract specific tactical insights.

**Focus Areas:**
1. **Objection Handling**: How does the closer handle objections? What phrases do they use? What patterns emerge?
2. **Tonality Shifts**: When and how does the closer change their tone? What triggers these shifts? (e.g., from friendly to firm, from empathetic to authoritative)
3. **Closing Frames**: What assumptive closes are used? How is urgency created? What are the final statements before asking for commitment?

**Transcript:**
${transcript.substring(0, 15000)}${transcript.length > 15000 ? '...\n[TRUNCATED - FULL TRANSCRIPT PROVIDED TO MODEL]' : ''}

**Output Format (JSON):**
{
  "objectionHandling": {
    "techniques": ["technique 1", "technique 2", ...],
    "powerPhrases": ["exact phrase 1", "exact phrase 2", ...],
    "rebuttalPatterns": ["pattern 1", "pattern 2", ...]
  },
  "tonalityShifts": {
    "transitions": [
      {
        "from": "friendly/empathetic/consultative",
        "to": "firm/authoritative/direct",
        "trigger": "what caused the shift (e.g., objection, hesitation)",
        "example": "exact quote showing the shift"
      }
    ],
    "emotionalTriggers": ["trigger word/phrase 1", "trigger 2", ...]
  },
  "closingFrames": {
    "assumptiveCloses": ["close 1", "close 2", ...],
    "urgencyCreators": ["urgency phrase 1", "urgency phrase 2", ...],
    "finalStatements": ["final statement 1", "final statement 2", ...]
  },
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", ...]
}

**Requirements:**
- Extract EXACT phrases (quote verbatim from transcript)
- Identify SPECIFIC techniques (not generic advice)
- Focus on ACTIONABLE tactics that can be replicated
- Highlight UNIQUE patterns that stand out
- Provide 3-5 key takeaways that summarize the most important insights`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Sales Tactics Analyst. Extract specific, actionable tactical insights from real estate closing transcripts. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const summary = JSON.parse(response) as Omit<TacticalSummary, 'videoTitle' | 'videoUrl'>;

    const fullSummary: TacticalSummary = {
      videoTitle,
      videoUrl,
      ...summary,
    };

    console.log(`✅ Summary generated: ${summary.keyTakeaways?.length || 0} takeaways`);

    return fullSummary;
  } catch (error) {
    console.error('Error generating tactical summary:', error);
    throw error;
  }
}

/**
 * Save tactical summary to /raw_dna/summaries/
 */
async function saveTacticalSummary(title: string, summary: TacticalSummary): Promise<string> {
  const outputDir = path.join(process.cwd(), 'raw_dna', 'summaries');
  
  // Ensure directory exists
  await fs.ensureDir(outputDir);

  // Create filename
  const filename = `${sanitizeFilename(title)}_summary.json`;
  const filePath = path.join(outputDir, filename);

  // Save summary
  await fs.writeFile(filePath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`💾 Saved summary: ${filePath}`);

  return filePath;
}

/**
 * Read URLs from urls_to_scrape.txt
 */
async function readUrlsFromFile(): Promise<string[]> {
  const urlsFile = path.join(process.cwd(), 'urls_to_scrape.txt');
  
  if (!(await fs.pathExists(urlsFile))) {
    throw new Error(
      `urls_to_scrape.txt not found at ${urlsFile}\n` +
      'Please create this file with one YouTube URL per line.'
    );
  }

  const content = await fs.readFile(urlsFile, 'utf-8');
  const urls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Filter empty lines and comments

  if (urls.length === 0) {
    throw new Error('No URLs found in urls_to_scrape.txt');
  }

  console.log(`📋 Found ${urls.length} URL(s) to scrape`);
  return urls;
}

/**
 * Main batch scraper function
 */
export async function batchScrapeTranscripts(): Promise<void> {
  console.log('🚀 Starting Batch DNA Scraper...\n');

  try {
    // 1. Read URLs from file
    const urls = await readUrlsFromFile();

    const results: Array<{
      url: string;
      title: string;
      transcriptPath: string;
      summaryPath?: string;
      success: boolean;
      error?: string;
    }> = [];

    // 2. Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

      try {
        // Scrape transcript
        const { title, transcript } = await scrapeTranscript(url);

        // Save transcript
        const transcriptPath = await saveTranscript(title, transcript);

        // Generate tactical summary
        const summary = await generateTacticalSummary(title, url, transcript);

        // Save summary
        const summaryPath = await saveTacticalSummary(title, summary);

        results.push({
          url,
          title,
          transcriptPath,
          summaryPath,
          success: true,
        });

        // Small delay to avoid rate limiting
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      } catch (error) {
        console.error(`❌ Failed to process ${url}:`, error);
        results.push({
          url,
          title: 'Unknown',
          transcriptPath: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 3. Summary report
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH SCRAPING SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}/${urls.length}`);
    console.log(`❌ Failed: ${failed}/${urls.length}`);

    if (successful > 0) {
      console.log('\n✅ Successfully processed:');
      results
        .filter(r => r.success)
        .forEach(r => {
          console.log(`  - ${r.title}`);
          console.log(`    Transcript: ${r.transcriptPath}`);
          if (r.summaryPath) {
            console.log(`    Summary: ${r.summaryPath}`);
          }
        });
    }

    if (failed > 0) {
      console.log('\n❌ Failed to process:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.url}`);
          console.log(`    Error: ${r.error}`);
        });
    }

    console.log('\n✅ Batch scraping complete!');
  } catch (error) {
    console.error('❌ Error in batch scraper:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  batchScrapeTranscripts()
    .then(() => {
      console.log('\n✅ Success!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
