/**
 * Private Video Transcriber - OpenAI Whisper Transcription
 * Processes private training videos and generates high-fidelity transcripts
 * 
 * Features:
 * - Processes /uploads/private_videos/ folder
 * - Transcribes .mp4 and .mov files using OpenAI Whisper API
 * - Appends transcripts with PRIORITY: 10 tagging
 * - Automatic processing of all files
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'private_videos');
const OUTPUT_FILE = path.join(process.cwd(), 'raw_dna', 'private', 'portal_videos.txt');

const SUPPORTED_FORMATS = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'];

/**
 * Check if file is a supported video format
 */
function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Transcribe video using OpenAI Whisper API
 */
async function transcribeVideo(videoPath: string): Promise<string> {
  console.log(`🎬 Transcribing: ${path.basename(videoPath)}`);

  try {
    // OpenAI Whisper API requires a File object
    // In Node.js, we create a File from the buffer
    // File is available in Node.js 18+ (globalThis.File)
    const fileBuffer = await fs.readFile(videoPath);
    const fileName = path.basename(videoPath);
    
    // Create a File object for the OpenAI API
    // Check if File is available (Node.js 18+)
    if (typeof File === 'undefined') {
      // Fallback for older Node.js versions
      // Import File from 'undici' or use a polyfill
      throw new Error('File API not available. Please use Node.js 18+ or install a File polyfill.');
    }
    
    const file = new File([fileBuffer], fileName, {
      type: 'video/mp4', // Default to mp4, Whisper handles various formats
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en', // Eric Cline's training is in English
      temperature: 0, // More deterministic
      prompt: 'This is a real estate sales training video by Eric Cline. Focus on technical details, specific phrases, and sales techniques.',
    });

    // When response_format is 'text', the API returns a string directly
    return transcription as unknown as string;
  } catch (error) {
    console.error(`Error transcribing ${videoPath}:`, error);
    throw error;
  }
}

/**
 * Process all videos in the upload directory and append to output file
 */
async function processAllVideos(): Promise<void> {
  console.log('🔍 Scanning for videos...');

  if (!(await fs.pathExists(UPLOAD_DIR))) {
    console.log(`📁 Creating upload directory: ${UPLOAD_DIR}`);
    await fs.ensureDir(UPLOAD_DIR);
    console.log('📭 No videos to process');
    return;
  }

  const files = await fs.readdir(UPLOAD_DIR);
  const videoFiles = files.filter(file => isVideoFile(file));

  if (videoFiles.length === 0) {
    console.log('📭 No video files found in upload directory');
    return;
  }

  console.log(`📹 Found ${videoFiles.length} video file(s)`);

  // Prepare output directory
  const outputDir = path.dirname(OUTPUT_FILE);
  await fs.ensureDir(outputDir);

  // Initialize or append to output file
  let outputContent = '';

  // If file exists, read it to check what's already processed
  const processedFiles = new Set<string>();
  if (await fs.pathExists(OUTPUT_FILE)) {
    const existingContent = await fs.readFile(OUTPUT_FILE, 'utf-8');
    // Extract already processed filenames
    const processedMatches = existingContent.match(/Video: ([^\n]+)/g);
    if (processedMatches) {
      processedMatches.forEach(match => {
        const filename = match.replace('Video: ', '').trim();
        processedFiles.add(filename);
      });
    }
    outputContent = existingContent + '\n\n';
  } else {
    // Create header for new file
    outputContent += '='.repeat(80) + '\n';
    outputContent += 'SOURCE: PRIVATE_CLINE_PORTAL | PRIORITY: 10\n';
    outputContent += `Processed: ${new Date().toISOString()}\n`;
    outputContent += '='.repeat(80) + '\n\n';
  }

  // Process each video
  for (const file of videoFiles) {
    const filePath = path.join(UPLOAD_DIR, file);

    // Skip if already processed
    if (processedFiles.has(file)) {
      console.log(`⏭️  Already processed: ${file}`);
      continue;
    }

    console.log(`\n📹 Processing: ${file}`);

    try {
      // Transcribe video
      const transcript = await transcribeVideo(filePath);

      // Append to output
      outputContent += `\n${'='.repeat(80)}\n`;
      outputContent += `Video: ${file}\n`;
      outputContent += `Processed: ${new Date().toISOString()}\n`;
      outputContent += `Model: OpenAI Whisper-1\n`;
      outputContent += `${'='.repeat(80)}\n\n`;
      outputContent += transcript;
      outputContent += '\n\n' + '-'.repeat(80) + '\n\n';

      console.log(`✅ Transcript added for: ${file}`);
      console.log(`📝 Length: ${transcript.length} characters`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      // Continue with other files
    }
  }

  // Save output file
  await fs.writeFile(OUTPUT_FILE, outputContent, 'utf-8');

  console.log(`\n✅ Processing complete!`);
  console.log(`💾 Appended to: ${OUTPUT_FILE}`);
}

/**
 * Main processor function
 */
export async function transcribePrivateVideos(): Promise<void> {
  console.log('🚀 Starting Private Video Transcriber...\n');

  try {
    await processAllVideos();
    console.log('\n✅ Transcription complete!');
  } catch (error) {
    console.error('❌ Error in video transcriber:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  transcribePrivateVideos()
    .then(() => {
      console.log('\n✅ Success!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
