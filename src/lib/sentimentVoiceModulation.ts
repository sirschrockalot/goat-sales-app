/**
 * Sentiment-Driven Voice Modulation
 * Adjusts voice parameters in real-time based on seller's sentiment
 */

import { analyzeEmotionalState, EmotionalState } from './chainOfThought';

export interface VoiceParameters {
  stability: number; // 0.0 - 1.0
  similarityBoost: number; // 0.0 - 1.0
  style?: number; // 0.0 - 1.0 (if supported)
  styleExaggeration?: number; // 0.0 - 1.0 (if supported)
  speechRate?: number; // Relative rate adjustment
}

export interface SellerSpeechMetrics {
  speechRate: number; // Words per minute (estimated)
  sentiment: EmotionalState;
  volume?: number; // 0.0 - 1.0 (if available)
  pitch?: number; // 0.0 - 1.0 (if available)
}

/**
 * Get voice parameters based on seller sentiment and context
 */
export function getVoiceParametersForSentiment(
  sellerSentiment: EmotionalState,
  context: {
    isConflict: boolean;
    isRapportBuilding: boolean;
    sellerSpeechRate?: number;
  }
): VoiceParameters {
  const baseParams: VoiceParameters = {
    stability: 0.5,
    similarityBoost: 0.8,
  };

  // Conflict: Increase stability to sound authoritative
  if (context.isConflict || sellerSentiment === 'angry' || sellerSentiment === 'defensive') {
    return {
      ...baseParams,
      stability: 0.8, // Higher stability = more authoritative, less variation
      similarityBoost: 0.85,
      speechRate: 1.0, // Normal rate
    };
  }

  // Rapport-Building: Decrease stability and increase style_exaggeration for empathy
  if (context.isRapportBuilding || sellerSentiment === 'sad' || sellerSentiment === 'open') {
    return {
      ...baseParams,
      stability: 0.4, // Lower stability = more variation, more human
      similarityBoost: 0.75,
      styleExaggeration: 0.6, // More expressive
      speechRate: 0.95, // Slightly slower for empathy
    };
  }

  // Skeptical: Moderate stability with clarity
  if (sellerSentiment === 'skeptical') {
    return {
      ...baseParams,
      stability: 0.6, // Moderate stability
      similarityBoost: 0.8,
      speechRate: 1.0,
    };
  }

  // Curious: Slightly higher energy
  if (sellerSentiment === 'curious') {
    return {
      ...baseParams,
      stability: 0.5,
      similarityBoost: 0.8,
      styleExaggeration: 0.5,
      speechRate: 1.05, // Slightly faster
    };
  }

  // Default: Balanced
  return baseParams;
}

/**
 * Acoustic Mirroring: Adjust speech rate based on seller's rate
 */
export function applyAcousticMirroring(
  baseParams: VoiceParameters,
  sellerSpeechRate: number,
  baseRate: number = 150 // Average words per minute
): VoiceParameters {
  // If seller's speech rate is fast, increase closer's rate by 10%
  const rateMultiplier = sellerSpeechRate > baseRate * 1.1 ? 1.1 : 1.0;
  
  return {
    ...baseParams,
    speechRate: (baseParams.speechRate || 1.0) * rateMultiplier,
  };
}

/**
 * Get dynamic voice parameters based on full context
 */
export function getDynamicVoiceParameters(
  transcript: string,
  sellerMetrics?: SellerSpeechMetrics
): VoiceParameters {
  // Analyze seller's emotional state
  const sentiment = analyzeEmotionalState(transcript);

  // Determine context
  const isConflict = sentiment === 'angry' || sentiment === 'defensive';
  const isRapportBuilding = sentiment === 'sad' || sentiment === 'open' || sentiment === 'curious';

  // Get base parameters
  let params = getVoiceParametersForSentiment(sentiment, {
    isConflict,
    isRapportBuilding,
    sellerSpeechRate: sellerMetrics?.speechRate,
  });

  // Apply acoustic mirroring if seller metrics available
  if (sellerMetrics?.speechRate) {
    params = applyAcousticMirroring(params, sellerMetrics.speechRate);
  }

  return params;
}

/**
 * Format voice parameters for Vapi/ElevenLabs API
 */
export function formatVoiceParamsForVapi(params: VoiceParameters): {
  provider: '11labs';
  voiceId: string;
  model: string;
  stability: number;
  similarityBoost: number;
  styleExaggeration?: number;
} {
  // Note: speechRate is not directly supported by ElevenLabs API
  // It would need to be handled via SSML or post-processing
  // For now, we focus on stability and similarityBoost which are supported

  return {
    provider: '11labs',
    voiceId: process.env.ELEVEN_LABS_BRIAN_VOICE_ID || 'nPczCjzI2devNBz1zQrb',
    model: 'eleven_turbo_v2_5',
    stability: params.stability,
    similarityBoost: params.similarityBoost,
    ...(params.styleExaggeration !== undefined && {
      styleExaggeration: params.styleExaggeration,
    }),
  };
}

/**
 * Get voice parameters for specific tactical choices
 */
export function getVoiceParamsForTactic(tacticalChoice: string): VoiceParameters {
  const tacticMap: Record<string, VoiceParameters> = {
    'cline-discovery': {
      stability: 0.4,
      similarityBoost: 0.75,
      styleExaggeration: 0.5,
    },
    'cline-underwriting-hold': {
      stability: 0.6,
      similarityBoost: 0.8,
    },
    'cline-assume-close': {
      stability: 0.7,
      similarityBoost: 0.85,
    },
    'elliott-certainty': {
      stability: 0.8,
      similarityBoost: 0.9,
    },
    'elliott-math-defense': {
      stability: 0.75,
      similarityBoost: 0.85,
    },
    'rapport-building': {
      stability: 0.4,
      similarityBoost: 0.7,
      styleExaggeration: 0.6,
    },
    'objection-handling': {
      stability: 0.6,
      similarityBoost: 0.8,
    },
  };

  return tacticMap[tacticalChoice] || {
    stability: 0.5,
    similarityBoost: 0.8,
  };
}
