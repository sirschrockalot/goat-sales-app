/**
 * Chain-of-Thought (CoT) Reasoning Engine
 * Hidden internal monologue system for Apex Closer AI
 */

import { getTexturesByContext, getRandomTextureForContext } from './acousticTextures';

export type EmotionalState = 'angry' | 'sad' | 'skeptical' | 'neutral' | 'open' | 'defensive' | 'curious';

export type TacticalChoice = 
  | 'cline-discovery'
  | 'cline-underwriting-hold'
  | 'cline-assume-close'
  | 'elliott-certainty'
  | 'elliott-math-defense'
  | 'elliott-emotional-anchoring'
  | 'rapport-building'
  | 'objection-handling'
  | 'price-justification'
  | 'clause-17-defense';

export interface CoTReasoning {
  emotionalState: EmotionalState;
  tacticalChoice: TacticalChoice;
  acousticChoice: string | null;
  reasoning: string;
  confidence: number; // 0-1
}

/**
 * Analyze seller's emotional state from transcript
 */
export function analyzeEmotionalState(transcript: string): EmotionalState {
  const lower = transcript.toLowerCase();
  
  // Anger indicators
  if (
    lower.includes('angry') ||
    lower.includes('mad') ||
    lower.includes('furious') ||
    lower.includes('ridiculous') ||
    lower.includes('insulting') ||
    lower.match(/[!]{2,}/) // Multiple exclamation marks
  ) {
    return 'angry';
  }

  // Sad indicators
  if (
    lower.includes('sad') ||
    lower.includes('depressed') ||
    lower.includes('overwhelmed') ||
    lower.includes('stressed') ||
    lower.includes('worried')
  ) {
    return 'sad';
  }

  // Skeptical indicators
  if (
    lower.includes('skeptical') ||
    lower.includes('doubt') ||
    lower.includes('not sure') ||
    lower.includes('question') ||
    lower.includes('how do i know')
  ) {
    return 'skeptical';
  }

  // Defensive indicators
  if (
    lower.includes('defensive') ||
    lower.includes('protect') ||
    lower.includes('careful') ||
    lower.includes('cautious')
  ) {
    return 'defensive';
  }

  // Curious indicators
  if (
    lower.includes('tell me more') ||
    lower.includes('explain') ||
    lower.includes('how does') ||
    lower.includes('what if')
  ) {
    return 'curious';
  }

  // Open indicators
  if (
    lower.includes('yes') ||
    lower.includes('okay') ||
    lower.includes('sounds good') ||
    lower.includes('i understand')
  ) {
    return 'open';
  }

  return 'neutral';
}

/**
 * Select tactical choice based on emotional state and context
 */
export function selectTacticalChoice(
  emotionalState: EmotionalState,
  context: {
    hasObjection: boolean;
    priceMentioned: boolean;
    clause17Mentioned: boolean;
    discoveryComplete: boolean;
  }
): TacticalChoice {
  // If angry, use empathy and rapport-building first
  if (emotionalState === 'angry') {
    return 'rapport-building';
  }

  // If sad, use discovery to find the "Hidden Why"
  if (emotionalState === 'sad') {
    return context.discoveryComplete ? 'elliott-emotional-anchoring' : 'cline-discovery';
  }

  // If skeptical, use certainty and math defense
  if (emotionalState === 'skeptical') {
    if (context.priceMentioned) {
      return 'elliott-math-defense';
    }
    return 'elliott-certainty';
  }

  // If defensive, use discovery to build trust
  if (emotionalState === 'defensive') {
    return context.discoveryComplete ? 'objection-handling' : 'cline-discovery';
  }

  // If curious, they're engaged - use assume close
  if (emotionalState === 'curious') {
    return context.discoveryComplete ? 'cline-assume-close' : 'cline-discovery';
  }

  // If open, assume the close
  if (emotionalState === 'open') {
    return 'cline-assume-close';
  }

  // Default: continue discovery or move to next step
  if (!context.discoveryComplete) {
    return 'cline-discovery';
  }

  if (context.clause17Mentioned) {
    return 'clause-17-defense';
  }

  if (context.priceMentioned && context.hasObjection) {
    return 'price-justification';
  }

  return 'cline-underwriting-hold';
}

/**
 * Select acoustic texture based on tactical choice and emotional state
 */
export function selectAcousticTexture(
  tacticalChoice: TacticalChoice,
  emotionalState: EmotionalState
): string | null {
  const contextMap: Record<TacticalChoice, string> = {
    'cline-discovery': 'thinking',
    'cline-underwriting-hold': 'calculating',
    'cline-assume-close': 'transitioning',
    'elliott-certainty': 'preparing-important-statement',
    'elliott-math-defense': 'calculating',
    'elliott-emotional-anchoring': 'empathizing',
    'rapport-building': 'building-rapport',
    'objection-handling': 'responding',
    'price-justification': 'calculating',
    'clause-17-defense': 'clarifying',
  };

  const context = contextMap[tacticalChoice];
  const texture = getRandomTextureForContext(context);
  return texture?.tag || null;
}

/**
 * Generate CoT reasoning for a response
 */
export function generateCoTReasoning(
  transcript: string,
  context: {
    hasObjection: boolean;
    priceMentioned: boolean;
    clause17Mentioned: boolean;
    discoveryComplete: boolean;
  }
): CoTReasoning {
  const emotionalState = analyzeEmotionalState(transcript);
  const tacticalChoice = selectTacticalChoice(emotionalState, context);
  const acousticChoice = selectAcousticTexture(tacticalChoice, emotionalState);

  // Generate reasoning explanation
  const reasoning = generateReasoningExplanation(emotionalState, tacticalChoice, context);

  // Calculate confidence based on how well the tactical choice fits
  const confidence = calculateConfidence(emotionalState, tacticalChoice, context);

  return {
    emotionalState,
    tacticalChoice,
    acousticChoice,
    reasoning,
    confidence,
  };
}

/**
 * Generate reasoning explanation
 */
function generateReasoningExplanation(
  emotionalState: EmotionalState,
  tacticalChoice: TacticalChoice,
  context: any
): string {
  const explanations: Record<string, string> = {
    'angry-rapport-building': 'Seller is angry. Need to de-escalate and build rapport before addressing concerns.',
    'sad-cline-discovery': 'Seller is sad. Need to discover the "Hidden Why" - what\'s really driving this sale.',
    'skeptical-elliott-certainty': 'Seller is skeptical. Need to demonstrate absolute certainty and confidence.',
    'skeptical-elliott-math-defense': 'Seller is questioning the price. Need to defend $82,700 with math and certainty.',
    'defensive-cline-discovery': 'Seller is defensive. Need to build trust through discovery before pushing forward.',
    'curious-cline-assume-close': 'Seller is curious and engaged. Time to assume the close and move forward.',
    'open-cline-assume-close': 'Seller is open. Assume the close and transition to contract walk-through.',
  };

  const key = `${emotionalState}-${tacticalChoice}`;
  return explanations[key] || `Using ${tacticalChoice} tactic to address ${emotionalState} emotional state.`;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  emotionalState: EmotionalState,
  tacticalChoice: TacticalChoice,
  context: any
): number {
  let confidence = 0.7; // Base confidence

  // Increase confidence if tactical choice matches emotional state well
  const goodMatches: Record<string, string[]> = {
    angry: ['rapport-building', 'elliott-emotional-anchoring'],
    sad: ['cline-discovery', 'elliott-emotional-anchoring'],
    skeptical: ['elliott-certainty', 'elliott-math-defense'],
    defensive: ['cline-discovery', 'rapport-building'],
    curious: ['cline-assume-close', 'objection-handling'],
    open: ['cline-assume-close', 'cline-underwriting-hold'],
  };

  if (goodMatches[emotionalState]?.includes(tacticalChoice)) {
    confidence += 0.2;
  }

  // Increase confidence if discovery is complete and we're moving forward
  if (context.discoveryComplete && ['cline-assume-close', 'cline-underwriting-hold'].includes(tacticalChoice)) {
    confidence += 0.1;
  }

  return Math.min(1.0, confidence);
}

/**
 * Format CoT reasoning as XML thinking tags
 */
export function formatCoTAsThinking(cot: CoTReasoning): string {
  return `<thinking>
Emotional State: ${cot.emotionalState}
Tactical Choice: ${cot.tacticalChoice}
Acoustic Choice: ${cot.acousticChoice || 'none'}
Reasoning: ${cot.reasoning}
Confidence: ${(cot.confidence * 100).toFixed(0)}%
</thinking>`;
}

/**
 * Strip thinking tags from text
 */
export function stripThinkingTags(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}
