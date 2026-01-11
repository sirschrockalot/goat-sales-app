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
  1: "Set the frame and establish credibility. Say: 'By the end of the call, one of three things will happen: 1. We'll approve the property and make you an offer. 2. We'll say it doesn't fit our buying criteria. 3. Or we'll decide it's not a fit right now and part as friends. Does that sound fair?' Then ask them to grab a pen and paper and have them repeat back your phone number.",
  2: "Don't rush past the motivation. Ask: 'Catch me up to speed, what's got you even thinking about selling this house?' Then ask about decision-makers, timeline, and what they'll do with the money.",
  3: "Time for the property condition walkthrough. Say: 'If I was walking through with you right now, what would I be seeing?' Then ask about foundation, roof, kitchen, bathrooms, HVAC, electrical, and plumbing. Don't forget to ask: 'How soon would you be ready to close?'",
  4: "Transition to numbers. Ask: 'If you had, say, $20,000 to $30,000 to put into the property, where do you think it would need to go first?' Then ask about the neighborhood and what they'd need to walk away with.",
  5: "Set up the hold. Say: 'I'm going to plug everything you told me into our system and see what this looks like from an investor standpoint. It usually takes me a couple of minutes. Can you hang on the line while I do that, or would you rather I call you right back?'",
  6: "Present the offer clearly. Say: 'The way we buy is as-is: You don't have to fix anything. You don't have to clean the house. We cover normal closing costs. Based on the condition of the property, the repairs we talked about, and what similar homes are going for in that area, the number that makes the most sense for us is: $[OFFER PRICE].' Then stop talking and let them react.",
  7: "Set expectations. Walk through the 5 next steps: Agreement (2–3 pages, plain English), Welcome Call, Photos/Walkthrough, Title Work, and Closing. Ask: 'Does that all sound good to you?'",
  8: "Get final commitment. Ask: 'Just so we're on the same page, if we lock this in at $[FINAL PRICE], are you 100% ready to move forward and sell the property to us?' Then confirm their email and offer to stay on the line to walk them through the agreement.",
};

interface UseVoiceHintsResult {
  voiceHintsEnabled: boolean;
  setVoiceHintsEnabled: (enabled: boolean) => void;
  lastHintTime: number | null;
  sendVoiceHint: (message: string) => Promise<void>;
}

export function useVoiceHints(isActive: boolean): UseVoiceHintsResult {
  const { callId, isActive: vapiIsActive, sendMessage } = useVapi();
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

  // Send voice hint using Vapi SDK's sendMessage method
  const sendVoiceHint = useCallback(async (message: string) => {
    if (!callId || !isActive) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot send voice hint: no callId or call not active');
      }
      return;
    }

    // Prevent sending hints too frequently (max once per 30 seconds)
    if (lastHintTime && Date.now() - lastHintTime < 30000) {
      return;
    }

    try {
      // Use Vapi SDK's sendMessage method directly (client-side)
      // This is more reliable than making server-side API calls
      sendMessage(message);
      setLastHintTime(Date.now());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending voice hint:', error);
      }
    }
  }, [callId, isActive, sendMessage, lastHintTime]);

  return {
    voiceHintsEnabled,
    setVoiceHintsEnabled,
    lastHintTime,
    sendVoiceHint,
  };
}
