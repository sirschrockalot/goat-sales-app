/**
 * Training Session Hook
 * Manages training mode state including script visibility toggle
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVapi } from '@/contexts/VapiContext';
import { getSoundboard } from '@/lib/soundboard';
import { getVapiClient } from '@/lib/vapi-client';

interface TrainingSessionResult {
  isScriptVisible: boolean;
  toggleScriptVisibility: () => void;
  scriptHiddenDuration: number; // Total seconds with script hidden (for XP multiplier)
  scriptHiddenStartTime: number | null;
}

export function useTrainingSession(): TrainingSessionResult {
  const { isActive } = useVapi();
  const [isScriptVisible, setIsScriptVisible] = useState(true);
  const [scriptHiddenDuration, setScriptHiddenDuration] = useState(0);
  const scriptHiddenStartTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track time spent with script hidden
  useEffect(() => {
    if (!isActive) {
      // Reset when call ends
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (scriptHiddenStartTimeRef.current) {
        const duration = Date.now() - scriptHiddenStartTimeRef.current;
        setScriptHiddenDuration((prev) => prev + Math.floor(duration / 1000));
        scriptHiddenStartTimeRef.current = null;
      }
      return;
    }

    if (!isScriptVisible && !scriptHiddenStartTimeRef.current) {
      // Script just hidden - start tracking
      scriptHiddenStartTimeRef.current = Date.now();
    } else if (isScriptVisible && scriptHiddenStartTimeRef.current) {
      // Script just shown - stop tracking and accumulate
      const duration = Date.now() - scriptHiddenStartTimeRef.current;
      setScriptHiddenDuration((prev) => prev + Math.floor(duration / 1000));
      scriptHiddenStartTimeRef.current = null;
    }

    // Update duration every second while hidden
    if (!isScriptVisible && scriptHiddenStartTimeRef.current) {
      intervalRef.current = setInterval(() => {
        if (scriptHiddenStartTimeRef.current) {
          const duration = Date.now() - scriptHiddenStartTimeRef.current;
          setScriptHiddenDuration((prev) => prev + Math.floor(duration / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isScriptVisible, isActive]);

  const toggleScriptVisibility = useCallback(() => {
    setIsScriptVisible((prev) => {
      const newValue = !prev;
      
      // Play sound feedback when hiding script
      if (!newValue) {
        try {
          const soundboard = getSoundboard();
          soundboard.play('mechanicalClick');
        } catch (error) {
          console.warn('Failed to play sound:', error);
        }
      }
      
      return newValue;
    });
  }, []);

  return {
    isScriptVisible,
    toggleScriptVisibility,
    scriptHiddenDuration,
    scriptHiddenStartTime: scriptHiddenStartTimeRef.current,
  };
}
