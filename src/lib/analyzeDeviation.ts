/**
 * Script Deviation Analysis
 * Compares call transcript against script_segments to calculate adherence
 */

import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GateDeviation {
  gate: number;
  gateName: string;
  faithfulnessScore: number; // 0-100
  similarity: number; // 0-1
  isCriticalSkip: boolean; // similarity < 0.40
  masterScript: string;
  actualTranscript: string | null; // Best matching segment from transcript
  timestamp?: number; // When this gate was discussed (if available)
}

export interface DeviationAnalysis {
  gates: GateDeviation[];
  overallFaithfulness: number; // Average of all gates
  criticalSkips: GateDeviation[];
  goldenMoment: {
    gate: number;
    gateName: string;
    similarity: number;
    transcript: string;
  } | null;
  coachingInsights: string[];
}

const GATE_NAMES = [
  'The Intro (Approval/Denial)',
  'Fact Find (The Why)',
  'The Pitch (Inside/Outside)',
  'The Offer (Virtual Withdraw)',
  'The Close (Agreement)',
];

const CRITICAL_SKIP_THRESHOLD = 0.40;
const LOW_ADHERENCE_THRESHOLD = 0.60;

/**
 * Analyze script deviation for a call transcript
 */
export async function analyzeDeviation(transcript: string): Promise<DeviationAnalysis> {
  if (!transcript || transcript.trim().length === 0) {
    return getEmptyAnalysis();
  }

  try {
    // Generate embedding for the full transcript
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: transcript.trim(),
    });

    const transcriptEmbedding = embeddingResponse.data[0].embedding;

    // Get all script segments
    const { data: scriptSegments, error } = await supabaseAdmin
      .from('script_segments')
      .select('id, gate_number, gate_name, script_text, embedding')
      .order('gate_number', { ascending: true });

    if (error || !scriptSegments || scriptSegments.length === 0) {
      console.error('Error fetching script segments:', error);
      return getEmptyAnalysis();
    }

    // Calculate similarity for each gate
    const gateDeviations: GateDeviation[] = [];
    let maxSimilarity = 0;
    let goldenMoment: DeviationAnalysis['goldenMoment'] = null;

    for (const segment of scriptSegments) {
      if (!segment.embedding || !Array.isArray(segment.embedding)) {
        // Skip if no embedding
        gateDeviations.push({
          gate: segment.gate_number,
          gateName: segment.gate_name || GATE_NAMES[segment.gate_number - 1],
          faithfulnessScore: 0,
          similarity: 0,
          isCriticalSkip: true,
          masterScript: segment.script_text,
          actualTranscript: null,
        });
        continue;
      }

      // Calculate cosine similarity
      const similarity = cosineSimilarity(transcriptEmbedding, segment.embedding);
      const faithfulnessScore = Math.round(similarity * 100);

      // Find best matching segment from transcript (simplified - could use sliding window)
      const actualTranscript = extractBestMatch(transcript, segment.script_text);

      const deviation: GateDeviation = {
        gate: segment.gate_number,
        gateName: segment.gate_name || GATE_NAMES[segment.gate_number - 1],
        faithfulnessScore,
        similarity,
        isCriticalSkip: similarity < CRITICAL_SKIP_THRESHOLD,
        masterScript: segment.script_text,
        actualTranscript,
      };

      gateDeviations.push(deviation);

      // Track golden moment
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        goldenMoment = {
          gate: segment.gate_number,
          gateName: segment.gate_name || GATE_NAMES[segment.gate_number - 1],
          similarity,
          transcript: actualTranscript || transcript.substring(0, 200),
        };
      }
    }

    // Calculate overall faithfulness
    const overallFaithfulness = Math.round(
      gateDeviations.reduce((sum, g) => sum + g.faithfulnessScore, 0) / gateDeviations.length
    );

    // Identify critical skips
    const criticalSkips = gateDeviations.filter((g) => g.isCriticalSkip);

    // Generate coaching insights
    const coachingInsights = generateCoachingInsights(gateDeviations);

    return {
      gates: gateDeviations,
      overallFaithfulness,
      criticalSkips,
      goldenMoment,
      coachingInsights,
    };
  } catch (error) {
    console.error('Error analyzing deviation:', error);
    return getEmptyAnalysis();
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract best matching segment from transcript
 * Simplified version - in production, could use sliding window or more sophisticated matching
 */
function extractBestMatch(transcript: string, scriptText: string): string | null {
  // Extract keywords from script
  const scriptKeywords = scriptText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Find sentences in transcript that contain these keywords
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  let bestMatch: string | null = null;
  let maxMatches = 0;

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const matches = scriptKeywords.filter((keyword) => sentenceLower.includes(keyword)).length;

    if (matches > maxMatches && matches >= 2) {
      maxMatches = matches;
      bestMatch = sentence.trim();
    }
  }

  // If no good match, return a relevant portion of transcript
  if (!bestMatch && transcript.length > 0) {
    // Return middle portion (where most conversation happens)
    const start = Math.floor(transcript.length * 0.3);
    const end = Math.floor(transcript.length * 0.7);
    bestMatch = transcript.substring(start, end).trim().substring(0, 200);
  }

  return bestMatch;
}

/**
 * Generate coaching insights based on deviation analysis
 */
function generateCoachingInsights(gates: GateDeviation[]): string[] {
  const insights: string[] = [];

  // Check for skipped gates
  const skippedGates = gates.filter((g) => g.isCriticalSkip);
  if (skippedGates.length > 0) {
    const gateNames = skippedGates.map((g) => `Gate ${g.gate} (${g.gateName})`).join(', ');
    insights.push(`You skipped or rushed through ${skippedGates.length} critical gate${skippedGates.length > 1 ? 's' : ''}: ${gateNames}. These are non-negotiable steps.`);
  }

  // Check for out-of-order progression
  const lowScores = gates.filter((g) => g.similarity < LOW_ADHERENCE_THRESHOLD);
  const highScores = gates.filter((g) => g.similarity >= LOW_ADHERENCE_THRESHOLD);

  if (lowScores.length > 0 && highScores.length > 0) {
    // Check if later gates have higher scores than earlier ones (out of order)
    const outOfOrder = lowScores.some((low) => {
      const laterHigh = highScores.find((high) => high.gate > low.gate);
      return laterHigh !== undefined;
    });

    if (outOfOrder) {
      insights.push('You moved ahead before properly completing earlier gates. The script is sequential for a reason—don\'t skip steps.');
    }
  }

  // Check Gate 2 (Fact Find) specifically
  const gate2 = gates.find((g) => g.gate === 2);
  if (gate2 && gate2.similarity < 0.50) {
    insights.push('You didn\'t properly uncover "The Why" in Gate 2. Without understanding their motivation, you can\'t use it against objections later.');
  }

  // Check Gate 5 (The Close) specifically
  const gate5 = gates.find((g) => g.gate === 5);
  if (gate5 && gate5.similarity < 0.50) {
    insights.push('The Close was weak. You need to assume the close and walk them through the agreement process step-by-step.');
  }

  // If no specific insights, provide general feedback
  if (insights.length === 0) {
    const avgScore = gates.reduce((sum, g) => sum + g.similarity, 0) / gates.length;
    if (avgScore < 0.60) {
      insights.push('Overall script adherence needs work. Stick closer to the master script—it\'s proven to work.');
    } else if (avgScore < 0.80) {
      insights.push('Good effort, but you\'re paraphrasing too much. The exact words matter for consistency and results.');
    }
  }

  return insights.slice(0, 3); // Max 3 insights
}

/**
 * Get empty analysis structure
 */
function getEmptyAnalysis(): DeviationAnalysis {
  return {
    gates: [],
    overallFaithfulness: 0,
    criticalSkips: [],
    goldenMoment: null,
    coachingInsights: [],
  };
}
