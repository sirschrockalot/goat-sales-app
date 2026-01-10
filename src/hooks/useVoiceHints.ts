/**
 * Voice Hints Hook
 * Manages automatic voice hint triggers based on script adherence
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVapi } from '@/contexts/VapiContext';
import { useScriptTracker } from './useScriptTracker';

const GATE_STUCK_THRESHOLD = 15000; // 15 seconds
const LOW_ADHERENCE_THRESHOLD = 0.40;

const GATE_HINTS: Record<number, string> = {
  1: "Remember to set the Approval/Denial frame. Say: 'I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?'",
  2: "Don't rush past the motivation. Ask: 'Catch me up to speed, what's got you even thinking about selling?' You need to uncover their 'Why' before moving forward.",
  3: "Time for the property walkthrough. Say: 'We open the front door—what am I seeing?' Then ask about the major three: roof, HVAC, and foundation.",
  4: "Present the offer with confidence. Say: 'Your property was just approved for purchase. We've moved your funds into a Virtual Withdraw Account.'",
  5: "Assume the close. Say: 'Let's verify your name and address. I'm sending a simple two-page agreement. It's written in third-grade English.'",
};

interface UseVoiceHintsResult {
  voiceHintsEnabled: boolean;
  setVoiceHintsEnabled: (enabled: boolean) => void;
  lastHintTime: number | null;
  sendVoiceHint: (message: string) => Promise<void>;
}

export function useVoiceHints(isActive: boolean): UseVoiceHintsResult {
  const { callId, isActive: vapiIsActive } = useVapi();
  const { currentGate, gateSimilarities, lastCheckTime } = useScriptTracker(isActive || vapiIsActive);
  
  const [voiceHintsEnabled, setVoiceHintsEnabled] = useState(false);
  const [lastHintTime, setLastHintTime] = useState<number | null>(null);
  
  const gateStuckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGateCheckRef = useRef<number>(0);
  const lastGateRef = useRef<number>(1);

  // Check if rep is stuck on a gate
  useEffect(() => {
    if (!isActive || !voiceHintsEnabled || !callId) {
      if (gateStuckTimerRef.current) {
        clearTimeout(gateStuckTimerRef.current);
        gateStuckTimerRef.current = null;
      }
      return;
    }

    const currentGateSimilarity = gateSimilarities.find(
      (g) => g.gate === currentGate
    )?.similarity || 0;

    // If gate changed, reset timer
    if (currentGate !== lastGateRef.current) {
      lastGateRef.current = currentGate;
      lastGateCheckRef.current = Date.now();
      if (gateStuckTimerRef.current) {
        clearTimeout(gateStuckTimerRef.current);
        gateStuckTimerRef.current = null;
      }
    }

    // If similarity is low, start/continue timer
    if (currentGateSimilarity < LOW_ADHERENCE_THRESHOLD && lastCheckTime) {
      const timeSinceLastCheck = Date.now() - lastCheckTime;
      
      // If we've been stuck for 15 seconds, send hint
      if (timeSinceLastCheck >= GATE_STUCK_THRESHOLD) {
        const hint = GATE_HINTS[currentGate];
        if (hint) {
          sendVoiceHint(hint);
          lastGateCheckRef.current = Date.now();
        }
      } else {
        // Set timer for remaining time
        const remainingTime = GATE_STUCK_THRESHOLD - timeSinceLastCheck;
        if (gateStuckTimerRef.current) {
          clearTimeout(gateStuckTimerRef.current);
        }
        gateStuckTimerRef.current = setTimeout(() => {
          const hint = GATE_HINTS[currentGate];
          if (hint) {
            sendVoiceHint(hint);
            lastGateCheckRef.current = Date.now();
          }
        }, remainingTime);
      }
    } else {
      // Gate is progressing, clear timer
      if (gateStuckTimerRef.current) {
        clearTimeout(gateStuckTimerRef.current);
        gateStuckTimerRef.current = null;
      }
      lastGateCheckRef.current = Date.now();
    }

    return () => {
      if (gateStuckTimerRef.current) {
        clearTimeout(gateStuckTimerRef.current);
      }
    };
  }, [currentGate, gateSimilarities, lastCheckTime, voiceHintsEnabled, callId, isActive]);

  // Send voice hint via API
  const sendVoiceHint = useCallback(async (message: string) => {
    if (!callId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot send voice hint: no callId');
      }
      return;
    }

    // Prevent sending hints too frequently (max once per 30 seconds)
    if (lastHintTime && Date.now() - lastHintTime < 30000) {
      return;
    }

    try {
      const response = await fetch('/api/vapi/voice-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          message,
        }),
      });

      if (response.ok) {
        setLastHintTime(Date.now());
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to send voice hint:', await response.text());
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending voice hint:', error);
      }
    }
  }, [callId, lastHintTime]);

  return {
    voiceHintsEnabled,
    setVoiceHintsEnabled,
    lastHintTime,
    sendVoiceHint,
  };
}
