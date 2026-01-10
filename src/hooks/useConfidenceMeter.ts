/**
 * useConfidenceMeter Hook
 * Monitors Vapi SDK events to calculate real-time confidence/certainty score
 * Based on volume consistency, pacing (WPM), and hesitation markers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getVapiClient } from '@/lib/vapi-client';

interface ConfidenceMetrics {
  score: number; // 0-100
  wpm: number; // Words per minute
  hasUptalk: boolean; // Warning indicator for uptalking
  volumeConsistency: number; // 0-100
  hesitationCount: number;
}

interface SpeechEvent {
  type: 'speech-start' | 'speech-end' | 'volume-level';
  timestamp: number;
  volume?: number;
  duration?: number;
}

const IDEAL_WPM_MIN = 130;
const IDEAL_WPM_MAX = 150;
const HESITATION_WORDS = ['um', 'uh', 'ah', 'er', 'like', 'you know'];
const UPTALK_THRESHOLD = 0.15; // 15% volume increase at end of sentence

export function useConfidenceMeter(isActive: boolean) {
  const [metrics, setMetrics] = useState<ConfidenceMetrics>({
    score: 50, // Start at neutral
    wpm: 0,
    hasUptalk: false,
    volumeConsistency: 70,
    hesitationCount: 0,
  });

  const speechEventsRef = useRef<SpeechEvent[]>([]);
  const wordCountRef = useRef(0);
  const lastSpeechStartRef = useRef<number | null>(null);
  const volumeHistoryRef = useRef<number[]>([]);
  const transcriptRef = useRef<string>('');
  const wpmCalculationRef = useRef<{ words: number; timeWindow: number }[]>([]);

  // Calculate WPM from recent speech
  const calculateWPM = useCallback(() => {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const recentEvents = wpmCalculationRef.current.filter(
      (e) => now - e.timeWindow < windowMs
    );

    if (recentEvents.length === 0) return 0;

    const totalWords = recentEvents.reduce((sum, e) => sum + e.words, 0);
    const totalTime = Math.min(windowMs, now - recentEvents[0].timeWindow);
    const wpm = totalTime > 0 ? (totalWords / totalTime) * 60000 : 0;

    return Math.round(wpm);
  }, []);

  // Detect hesitation markers in transcript
  const detectHesitations = useCallback((text: string): number => {
    const lowerText = text.toLowerCase();
    let count = 0;

    HESITATION_WORDS.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    });

    // Detect long silences (represented as multiple spaces or pauses)
    const longPauses = (text.match(/\s{3,}/g) || []).length;
    count += longPauses;

    return count;
  }, []);

  // Detect uptalking (volume increase at end of sentence)
  const detectUptalk = useCallback((volumes: number[]): boolean => {
    if (volumes.length < 3) return false;

    // Get last 30% of volumes (end of sentence)
    const endStart = Math.floor(volumes.length * 0.7);
    const endVolumes = volumes.slice(endStart);
    const startVolumes = volumes.slice(0, endStart);

    if (endVolumes.length === 0 || startVolumes.length === 0) return false;

    const avgEnd = endVolumes.reduce((a, b) => a + b, 0) / endVolumes.length;
    const avgStart = startVolumes.reduce((a, b) => a + b, 0) / startVolumes.length;

    // Uptalking if end volume is significantly higher
    return avgEnd > avgStart * (1 + UPTALK_THRESHOLD);
  }, []);

  // Calculate volume consistency score
  const calculateVolumeConsistency = useCallback((volumes: number[]): number => {
    if (volumes.length < 2) return 70; // Default if not enough data

    // Calculate coefficient of variation (lower = more consistent)
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance =
      volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    // Convert to 0-100 score (lower variation = higher score)
    const consistency = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));

    return Math.round(consistency);
  }, []);

  // Calculate overall confidence score
  const calculateConfidenceScore = useCallback(
    (
      wpm: number,
      volumeConsistency: number,
      hesitationCount: number,
      hasUptalk: boolean
    ): number => {
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
      score += (volumeConsistency - 50) * 0.3; // Weighted contribution

      // Hesitation penalty
      score -= hesitationCount * 5; // -5 points per hesitation

      // Uptalk penalty
      if (hasUptalk) {
        score -= 15; // Significant penalty for uptalking
      }

      // Clamp to 0-100
      return Math.max(0, Math.min(100, Math.round(score)));
    },
    []
  );

  // Update metrics
  const updateMetrics = useCallback(() => {
    const wpm = calculateWPM();
    const volumeConsistency = calculateVolumeConsistency(volumeHistoryRef.current);
    const hesitationCount = detectHesitations(transcriptRef.current);
    const hasUptalk = detectUptalk(volumeHistoryRef.current);

    const score = calculateConfidenceScore(
      wpm,
      volumeConsistency,
      hesitationCount,
      hasUptalk
    );

    setMetrics({
      score,
      wpm,
      hasUptalk,
      volumeConsistency,
      hesitationCount,
    });
  }, [calculateWPM, calculateVolumeConsistency, detectHesitations, detectUptalk, calculateConfidenceScore]);

  // Monitor Vapi SDK events
  useEffect(() => {
    if (!isActive) {
      // Reset metrics when call ends
      setMetrics({
        score: 50,
        wpm: 0,
        hasUptalk: false,
        volumeConsistency: 70,
        hesitationCount: 0,
      });
      speechEventsRef.current = [];
      volumeHistoryRef.current = [];
      transcriptRef.current = '';
      wpmCalculationRef.current = [];
      return;
    }

    const client = getVapiClient();
    let unsubscribeTranscript: (() => void) | null = null;

    // Set up event listeners
    // Note: Adjust these based on actual Vapi SDK API
    const setupListeners = () => {
      try {
        const vapiInstance = (client as any).vapi || client;
        
        // Listen for speech events (if available in Vapi SDK)
        if (vapiInstance && typeof vapiInstance.on === 'function') {
          // Speech start
          vapiInstance.on('speech-start', (data: any) => {
            const event: SpeechEvent = {
              type: 'speech-start',
              timestamp: Date.now(),
            };
            speechEventsRef.current.push(event);
            lastSpeechStartRef.current = Date.now();
          });

          // Volume level updates
          vapiInstance.on('volume-level', (data: any) => {
            const volume = data.volume || data.level || 0.5;
            volumeHistoryRef.current.push(volume);

            // Keep only last 50 volume readings
            if (volumeHistoryRef.current.length > 50) {
              volumeHistoryRef.current.shift();
            }

            updateMetrics();
          });

          // Alternative event names that might be used
          vapiInstance.on('audio-level', (data: any) => {
            const volume = data.volume || data.level || 0.5;
            volumeHistoryRef.current.push(volume);
            if (volumeHistoryRef.current.length > 50) {
              volumeHistoryRef.current.shift();
            }
            updateMetrics();
          });
        }
      } catch (error) {
        console.warn('Could not set up Vapi event listeners:', error);
        // Continue without real-time volume data - will use transcript-based metrics
      }
    };

    // Subscribe to transcript updates for hesitation detection
    unsubscribeTranscript = client.onTranscription((event) => {
      if (event.role === 'user') {
        transcriptRef.current = event.transcript;
        
        // Count words for WPM calculation
        const words = event.transcript.split(/\s+/).filter((w) => w.length > 0);
        wordCountRef.current += words.length;

        // Add to WPM calculation window
        const now = Date.now();
        wpmCalculationRef.current.push({
          words: words.length,
          timeWindow: now,
        });

        // Clean old entries (older than 1 minute)
        wpmCalculationRef.current = wpmCalculationRef.current.filter(
          (e) => now - e.timeWindow < 60000
        );

        updateMetrics();
      }
    });

    setupListeners();

    // Periodic update (fallback if events don't fire)
    const interval = setInterval(() => {
      updateMetrics();
    }, 1000);

    return () => {
      if (unsubscribeTranscript) {
        unsubscribeTranscript();
      }
      clearInterval(interval);
    };
  }, [isActive, updateMetrics]);

  return metrics;
}
