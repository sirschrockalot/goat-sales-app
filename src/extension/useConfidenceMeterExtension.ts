/**
 * Confidence Meter Hook for Chrome Extension
 * Adapted from useConfidenceMeter for extension context
 */

export interface ConfidenceMetrics {
  score: number; // 0-100
  wpm: number;
  hasUptalk: boolean;
  volumeConsistency: number;
  hesitationCount: number;
}

const IDEAL_WPM_MIN = 130;
const IDEAL_WPM_MAX = 150;
const HESITATION_WORDS = ['um', 'uh', 'ah', 'er', 'like', 'you know'];
const UPTALK_THRESHOLD = 0.15;

/**
 * Calculate confidence score from audio analysis data
 * This would receive data from the WebSocket server
 */
export function calculateConfidenceScore(
  wpm: number,
  volumeConsistency: number,
  hesitationCount: number,
  hasUptalk: boolean
): number {
  let score = 50; // Base score

  // WPM scoring (130-150 is ideal)
  if (wpm >= IDEAL_WPM_MIN && wpm <= IDEAL_WPM_MAX) {
    score += 25; // Perfect pacing
  } else if (wpm >= 120 && wpm < IDEAL_WPM_MIN) {
    score += 15; // Slightly slow but acceptable
  } else if (wpm > IDEAL_WPM_MAX && wpm <= 170) {
    score += 10; // Slightly fast but acceptable
  } else if (wpm < 100) {
    score -= 20; // Too slow (low energy)
  } else if (wpm > 180) {
    score -= 15; // Too fast (nervous)
  }

  // Volume consistency scoring
  score += (volumeConsistency - 50) * 0.3;

  // Hesitation penalty
  score -= hesitationCount * 5;

  // Uptalk penalty
  if (hasUptalk) {
    score -= 15;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Detect hesitation markers in transcript
 */
export function detectHesitations(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  HESITATION_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  });

  // Detect long silences
  const longPauses = (text.match(/\s{3,}/g) || []).length;
  count += longPauses;

  return count;
}
