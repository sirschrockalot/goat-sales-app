/**
 * Script Tracker Hook
 * Monitors transcript and tracks adherence to the 5-gate script
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVapi } from '@/contexts/VapiContext';

interface GateSimilarity {
  gate: number;
  gateName: string;
  similarity: number;
}

interface ScriptTrackerResult {
  currentGate: number; // 1-5
  adherenceScore: number; // 0-100
  gateSimilarities: GateSimilarity[];
  isChecking: boolean;
  lastCheckTime: number | null;
  isGoatModeActive: boolean; // True when maintaining 90+ similarity and 100% adherence for 30+ seconds
  goatModeStartTime: number | null; // Timestamp when Goat Mode activated
}

const CHECK_INTERVAL = 5000; // 5 seconds
const SIMILARITY_THRESHOLD = 0.75; // Threshold to advance to next gate
const LOW_SIMILARITY_THRESHOLD = 0.40; // Threshold for warning

export function useScriptTracker(
  isActive: boolean,
  voiceHintEnabled: boolean = false,
  mode: 'acquisition' | 'disposition' = 'acquisition'
): ScriptTrackerResult {
  const { transcript, transcriptionHistory, isActive: vapiIsActive, personaMode } = useVapi();
  
  // Use the provided isActive or fall back to Vapi's isActive
  const active = isActive || vapiIsActive;
  
  const [currentGate, setCurrentGate] = useState(1);
  const [adherenceScore, setAdherenceScore] = useState(0);
  const [gateSimilarities, setGateSimilarities] = useState<GateSimilarity[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [isGoatModeActive, setIsGoatModeActive] = useState(false);
  const [goatModeStartTime, setGoatModeStartTime] = useState<number | null>(null);
  const [highAdherenceStartTime, setHighAdherenceStartTime] = useState<number | null>(null);

  const transcriptBufferRef = useRef<string>('');
  const lastCheckRef = useRef<number>(0);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accumulate transcript from user messages only
  useEffect(() => {
    if (!active) {
      transcriptBufferRef.current = '';
      return;
    }

    // Get only user (rep) transcriptions
    const userTranscripts = transcriptionHistory
      .filter((e) => e.role === 'user')
      .map((e) => e.transcript)
      .join(' ');

      transcriptBufferRef.current = userTranscripts;
  }, [transcriptionHistory, active]);

  // Throttled check function
  const checkScriptAdherence = useCallback(async () => {
    if (!active || !transcriptBufferRef.current.trim()) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckRef.current;

    // Throttle: only check every 5 seconds
    if (timeSinceLastCheck < CHECK_INTERVAL) {
      // Schedule next check
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      checkTimeoutRef.current = setTimeout(() => {
        checkScriptAdherence();
      }, CHECK_INTERVAL - timeSinceLastCheck);
      return;
    }

    setIsChecking(true);
    lastCheckRef.current = now;

    try {
      // Get recent transcript (last 500 characters for context)
      const recentTranscript = transcriptBufferRef.current.slice(-500);

      // Determine script mode from personaMode or passed mode
      const scriptMode = personaMode === 'disposition' ? 'disposition' : mode;

      const response = await fetch('/api/script/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: recentTranscript,
          currentGate,
          mode: scriptMode, // Pass mode to API
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update gate similarities
        setGateSimilarities(data.gates || []);
        setAdherenceScore(data.adherenceScore || 0);
        setLastCheckTime(Date.now());

        // Auto-advance gate if similarity threshold met
        const currentGateSimilarity = data.gates?.find(
          (g: GateSimilarity) => g.gate === currentGate
        )?.similarity || 0;

        if (currentGateSimilarity > SIMILARITY_THRESHOLD && currentGate < 5) {
          setCurrentGate((prev) => Math.min(5, prev + 1));
        }

        // Also check if recommended gate is different
        if (data.recommendedGate && data.recommendedGate > currentGate) {
          setCurrentGate(data.recommendedGate);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking script adherence:', error);
      }
    } finally {
      setIsChecking(false);
    }
  }, [active, currentGate]);

  // Trigger check when transcript updates (throttled)
  useEffect(() => {
    if (!active) {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      return;
    }

    // Schedule check after transcript update
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkScriptAdherence();
    }, CHECK_INTERVAL);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [transcriptBufferRef.current, active, checkScriptAdherence]);

      // Reset on call end
      useEffect(() => {
        if (!active) {
          setCurrentGate(1);
          setAdherenceScore(0);
          setGateSimilarities([]);
          setLastCheckTime(null);
          setIsGoatModeActive(false);
          setGoatModeStartTime(null);
          setHighAdherenceStartTime(null);
          transcriptBufferRef.current = '';
        }
      }, [active]);

      return {
        currentGate,
        adherenceScore,
        gateSimilarities,
        isChecking,
        lastCheckTime,
        isGoatModeActive,
        goatModeStartTime,
      };
    }

// Export threshold constants for use in components
export { SIMILARITY_THRESHOLD, LOW_SIMILARITY_THRESHOLD };
