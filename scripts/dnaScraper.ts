/**
 * DNA Scraper - YouTube Transcript Extractor for Elite Real Estate Closers
 * Extracts and analyzes transcripts from Eric Cline, Andy Elliott, and other top closers
 */

import { YoutubeTranscript } from 'youtube-transcript';
import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

interface PowerPhrase {
  phrase: string;
  context: string;
  useCase: 'clause_17' | 'price_defense' | 'rapport' | 'objection_handling' | 'closing' | 'other';
  frequency: number;
}

interface LinguisticAnalysis {
  summary: string;
  powerPhrases: PowerPhrase[];
  linguisticPatterns: string[];
  keyTechniques: string[];
  emotionalTriggers: string[];
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
    // Note: This requires youtube-dl or similar, but for now we'll use a simpler approach
    // We can use the video ID as a fallback filename
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
    
    if (response.ok) {
      const data = await response.json();
      return sanitizeFilename(data.title || `video_${videoId}`);
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
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 200) // Limit length
    .trim();
}

/**
 * Scrape YouTube transcript from a single URL
 */
async function scrapeTranscript(videoUrl: string): Promise<{ title: string; transcript: string }> {
  try {
    console.log(`📥 Scraping transcript from: ${videoUrl}`);

    // Extract transcript
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoUrl);

    // Clean the transcript
    const cleanedTranscript = cleanTranscript(rawTranscript);

    // Get video title
    const title = await getVideoTitle(videoUrl);

    console.log(`✅ Successfully scraped: ${title} (${cleanedTranscript.length} characters)`);

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
 * Save transcript to raw_dna folder
 */
async function saveTranscript(title: string, transcript: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'raw_dna');
  
  // Ensure directory exists
  await fs.ensureDir(outputDir);

  // Create filename
  const filename = `${sanitizeFilename(title)}.txt`;
  const filePath = path.join(outputDir, filename);

  // Save transcript
  await fs.writeFile(filePath, transcript, 'utf-8');

  console.log(`💾 Saved transcript to: ${filePath}`);

  return filePath;
}

/**
 * Analyze transcript with GPT-4o to extract linguistic patterns and power phrases
 */
async function analyzeTranscript(transcript: string, videoTitle: string): Promise<LinguisticAnalysis> {
  console.log(`🔍 Analyzing transcript: ${videoTitle}`);

  const prompt = `You are a Sales Linguistics Analyst specializing in real estate closing techniques. Analyze the following transcript from an elite real estate closer (Eric Cline, Andy Elliott, or similar) and extract:

1. **Linguistic Patterns**: Recurring speech patterns, sentence structures, or rhetorical techniques
2. **Power Phrases**: Specific phrases used for:
   - Clause 17 (Memorandum of Contract) explanations
   - Price Defense (justifying offers, ARV calculations, 70% Rule)
   - Rapport Building (emotional connection, empathy)
   - Objection Handling (rebuttals, pivots)
   - Closing Techniques (assumptive closes, urgency creation)
3. **Key Techniques**: Specific sales techniques demonstrated
4. **Emotional Triggers**: Words or phrases that trigger emotional responses

Transcript:
${transcript.substring(0, 8000)}${transcript.length > 8000 ? '...' : ''}

Return a JSON object with this structure:
{
  "summary": "2-3 sentence summary of the linguistic style and key techniques",
  "powerPhrases": [
    {
      "phrase": "exact phrase used",
      "context": "when/why it was used",
      "useCase": "clause_17|price_defense|rapport|objection_handling|closing|other",
      "frequency": number of times it appeared
    }
  ],
  "linguisticPatterns": ["pattern 1", "pattern 2", ...],
  "keyTechniques": ["technique 1", "technique 2", ...],
  "emotionalTriggers": ["trigger 1", "trigger 2", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Sales Linguistics Analyst. Extract power phrases, linguistic patterns, and sales techniques from real estate closing transcripts. Return valid JSON only.',
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

    const analysis = JSON.parse(response) as LinguisticAnalysis;

    console.log(`✅ Analysis complete: Found ${analysis.powerPhrases.length} power phrases`);

    return analysis;
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    throw error;
  }
}

/**
 * Save analysis to JSON file
 */
async function saveAnalysis(videoTitle: string, analysis: LinguisticAnalysis): Promise<string> {
  const outputDir = path.join(process.cwd(), 'raw_dna', 'analysis');
  
  // Ensure directory exists
  await fs.ensureDir(outputDir);

  // Create filename
  const filename = `${sanitizeFilename(videoTitle)}_analysis.json`;
  const filePath = path.join(outputDir, filename);

  // Save analysis
  await fs.writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf-8');

  console.log(`💾 Saved analysis to: ${filePath}`);

  return filePath;
}

/**
 * Main scraper function - processes multiple YouTube URLs
 */
export async function scrapeYouTubeTranscripts(urls: string[]): Promise<void> {
  console.log(`🚀 Starting DNA Scraper for ${urls.length} video(s)...\n`);

  const results: Array<{ url: string; title: string; transcriptPath: string; analysisPath?: string }> = [];

  for (const url of urls) {
    try {
      // Scrape transcript
      const { title, transcript } = await scrapeTranscript(url);

      // Save raw transcript
      const transcriptPath = await saveTranscript(title, transcript);

      // Analyze transcript
      const analysis = await analyzeTranscript(transcript, title);

      // Save analysis
      const analysisPath = await saveAnalysis(title, analysis);

      results.push({
        url,
        title,
        transcriptPath,
        analysisPath,
      });

      console.log(''); // Empty line for readability
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
      console.log(''); // Empty line for readability
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully processed: ${results.length}/${urls.length} videos`);
  results.forEach(result => {
    console.log(`  - ${result.title}`);
    console.log(`    Transcript: ${result.transcriptPath}`);
    if (result.analysisPath) {
      console.log(`    Analysis: ${result.analysisPath}`);
    }
  });
}

/**
 * Post-process existing transcripts in raw_dna folder
 */
export async function postProcessTranscripts(): Promise<void> {
  const rawDnaDir = path.join(process.cwd(), 'raw_dna');
  
  if (!(await fs.pathExists(rawDnaDir))) {
    console.error('❌ raw_dna directory does not exist');
    return;
  }

  const files = await fs.readdir(rawDnaDir);
  const transcriptFiles = files.filter(file => file.endsWith('.txt'));

  console.log(`🔍 Found ${transcriptFiles.length} transcript file(s) to analyze...\n`);

  for (const file of transcriptFiles) {
    try {
      const filePath = path.join(rawDnaDir, file);
      const transcript = await fs.readFile(filePath, 'utf-8');
      const title = path.basename(file, '.txt');

      console.log(`📝 Processing: ${title}`);

      // Analyze transcript
      const analysis = await analyzeTranscript(transcript, title);

      // Save analysis
      await saveAnalysis(title, analysis);

      console.log(''); // Empty line for readability
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      console.log(''); // Empty line for readability
    }
  }

  console.log('✅ Post-processing complete!');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
DNA Scraper - YouTube Transcript Extractor

Usage:
  npm run dna:scrape <youtube-url-1> [youtube-url-2] ...
  npm run dna:analyze

Examples:
  npm run dna:scrape https://www.youtube.com/watch?v=VIDEO_ID
  npm run dna:analyze
    `);
    process.exit(0);
  }

  if (args[0] === 'analyze' || args[0] === 'post-process') {
    postProcessTranscripts()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // Treat all args as YouTube URLs
    scrapeYouTubeTranscripts(args)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  }
}
