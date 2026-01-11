/**
 * Private Video Processor - High-Capacity Chunking Engine
 * Processes long videos by extracting audio, chunking, and transcribing
 * 
 * Features:
 * - Audio extraction (mono MP3 at 64kbps)
 * - Intelligent chunking for videos > 25MB
 * - Whisper API transcription per chunk
 * - Merged transcript output with PRIORITY: 10
 */

import fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'private_videos');
const OUTPUT_FILE = path.join(process.cwd(), 'raw_dna', 'private', 'portal_videos.txt');
const TEMP_DIR = path.join(process.cwd(), 'temp', 'video_processing');

const SUPPORTED_FORMATS = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'];
const CHUNK_SIZE_MB = 25; // Chunk if audio > 25MB
const CHUNK_DURATION_MINUTES = 10; // 10-minute chunks

// Configure ffmpeg to use static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Check if file is a supported video format
 */
function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Get file size in MB
 */
async function getFileSizeMB(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size / (1024 * 1024); // Convert bytes to MB
}

/**
 * Extract audio from video as mono MP3 at 64kbps
 */
async function extractAudio(videoPath: string): Promise<string> {
  console.log(`🎵 Extracting audio from: ${path.basename(videoPath)}`);

  const audioPath = path.join(TEMP_DIR, `${path.basename(videoPath, path.extname(videoPath))}.mp3`);
  await fs.ensureDir(TEMP_DIR);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec('libmp3lame')
      .audioBitrate(64)
      .audioChannels(1) // Mono
      .audioFrequency(22050) // Lower frequency for smaller size
      .format('mp3')
      .on('end', () => {
        console.log(`✅ Audio extracted: ${path.basename(audioPath)}`);
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err);
        reject(err);
      })
      .save(audioPath);
  });
}

/**
 * Get audio duration in seconds
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * Chunk audio into 10-minute segments
 */
async function chunkAudio(audioPath: string): Promise<string[]> {
  const fileSizeMB = await getFileSizeMB(audioPath);

  console.log(`📊 Audio size: ${fileSizeMB.toFixed(2)}MB`);

  // Check if chunking is needed based on file size only
  if (fileSizeMB <= CHUNK_SIZE_MB) {
    console.log(`✅ Audio is ${fileSizeMB.toFixed(2)}MB (under ${CHUNK_SIZE_MB}MB limit) - no chunking needed`);
    return [audioPath];
  }

  // For large files, we need duration to chunk - try to get it, but if ffprobe fails, estimate
  let duration: number;
  try {
    duration = await getAudioDuration(audioPath);
  } catch (error) {
    // Estimate duration based on file size (rough estimate: 1MB ≈ 2 minutes at 64kbps mono)
    duration = (fileSizeMB / 1) * 120; // Rough estimate
    console.warn(`⚠️  Could not get audio duration, estimating ${duration.toFixed(0)}s based on file size`);
  }

  console.log(`✂️  Chunking audio into ${CHUNK_DURATION_MINUTES}-minute segments...`);
  console.log(`📊 Audio duration: ${duration.toFixed(0)}s`);

  const chunkDuration = CHUNK_DURATION_MINUTES * 60; // Convert to seconds
  const numChunks = Math.ceil(duration / chunkDuration);
  const chunkPaths: string[] = [];

  const baseName = path.basename(audioPath, path.extname(audioPath));

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration;
    const chunkPath = path.join(TEMP_DIR, `${baseName}_chunk_${i + 1}.mp3`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(audioPath)
        .setStartTime(startTime)
        .setDuration(chunkDuration)
        .audioCodec('libmp3lame')
        .audioBitrate(64)
        .audioChannels(1)
        .format('mp3')
        .on('end', () => {
          console.log(`✅ Created chunk ${i + 1}/${numChunks}: ${path.basename(chunkPath)}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ Error creating chunk ${i + 1}:`, err);
          reject(err);
        })
        .save(chunkPath);
    });

    chunkPaths.push(chunkPath);
  }

  console.log(`✅ Created ${chunkPaths.length} chunk(s)`);
  return chunkPaths;
}

/**
 * Transcribe audio chunk using OpenAI Whisper API
 */
async function transcribeChunk(chunkPath: string, chunkNumber: number, totalChunks: number): Promise<string> {
  console.log(`🎤 Transcribing chunk ${chunkNumber}/${totalChunks}: ${path.basename(chunkPath)}`);

  try {
    const fileBuffer = await fs.readFile(chunkPath);
    const fileName = path.basename(chunkPath);

    // Create File object for OpenAI API (Node.js 18+)
    if (typeof File === 'undefined') {
      throw new Error('File API not available. Please use Node.js 18+ or install a File polyfill.');
    }

    const file = new File([fileBuffer], fileName, {
      type: 'audio/mpeg',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en',
      temperature: 0,
      prompt: 'This is a real estate sales training video by Eric Cline. Focus on technical details, specific phrases, and sales techniques.',
    });

    return transcription as unknown as string;
  } catch (error) {
    console.error(`Error transcribing chunk ${chunkNumber}:`, error);
    throw error;
  }
}

/**
 * Process a single video file
 */
async function processVideoFile(videoPath: string): Promise<string> {
  const fileName = path.basename(videoPath);
  console.log(`\n📹 Processing video: ${fileName}`);

  try {
    // Step 1: Extract audio
    const audioPath = await extractAudio(videoPath);

    // Step 2: Chunk audio if needed
    const chunks = await chunkAudio(audioPath);

    // Step 3: Transcribe each chunk
    const transcripts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const transcript = await transcribeChunk(chunks[i], i + 1, chunks.length);
      transcripts.push(transcript);

      // Small delay between API calls
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Step 4: Merge transcripts
    const mergedTranscript = transcripts.join('\n\n[--- Next Segment ---]\n\n');

    // Cleanup: Remove temporary audio files
    try {
      await fs.remove(audioPath);
      for (const chunk of chunks) {
        if (chunk !== audioPath) {
          await fs.remove(chunk);
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️  Error cleaning up temp files:', cleanupError);
    }

    console.log(`✅ Transcription complete: ${mergedTranscript.length} characters`);
    return mergedTranscript;
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error);
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
  await fs.ensureDir(TEMP_DIR);

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

    try {
      // Process video (extract, chunk, transcribe, merge)
      const transcript = await processVideoFile(filePath);

      // Append to output
      outputContent += `\n${'='.repeat(80)}\n`;
      outputContent += `Video: ${file}\n`;
      outputContent += `Processed: ${new Date().toISOString()}\n`;
      outputContent += `Model: OpenAI Whisper-1 (Chunked Processing)\n`;
      outputContent += `${'='.repeat(80)}\n\n`;
      outputContent += transcript;
      outputContent += '\n\n' + '-'.repeat(80) + '\n\n';

      console.log(`✅ Transcript added for: ${file}`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      // Continue with other files
    }
  }

  // Save output file
  await fs.writeFile(OUTPUT_FILE, outputContent, 'utf-8');

  // Cleanup temp directory
  try {
    await fs.remove(TEMP_DIR);
  } catch (cleanupError) {
    console.warn('⚠️  Error cleaning up temp directory:', cleanupError);
  }

  console.log(`\n✅ Processing complete!`);
  console.log(`💾 Appended to: ${OUTPUT_FILE}`);
}

/**
 * Main processor function
 */
export async function processPrivateVideos(): Promise<void> {
  console.log('🚀 Starting Private Video Processor (Deep-DNA Ingestion)...\n');

  try {
    await processAllVideos();
    console.log('\n✅ Transcription complete!');
  } catch (error) {
    console.error('❌ Error in video processor:', error);
    throw error;
  }
}

// CLI interface - always run when executed directly
processPrivateVideos()
  .then(() => {
    console.log('\n✅ Success!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
