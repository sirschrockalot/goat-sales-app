/**
 * Heat Streak Hook
 * Tracks consecutive "On-Script" sentences and calculates combo multiplier
 */

import { useState, useEffect, useRef } from 'react';
import { useScriptTracker } from './useScriptTracker';

const ON_SCRIPT_THRESHOLD = 0.75; // Similarity threshold for "on-script"
const STREAK_REQUIREMENT = 3; // Need 3 consecutive on-script sentences to start streak
const MULTIPLIER_TIERS = [
  { streak: 3, multiplier: 1.1, color: '#ef4444' }, // Red/Orange
  { streak: 6, multiplier: 1.2, color: '#f59e0b' }, // Amber
  { streak: 10, multiplier: 1.3, color: '#3b82f6' }, // Blue
  { streak: 15, multiplier: 1.4, color: '#10b981' }, // Emerald
  { streak: 25, multiplier: 1.5, color: '#10b981' }, // Goat Emerald
];

export interface HeatStreakResult {
  streak: number;
  multiplier: number;
  color: string;
  isActive: boolean;
  borderGlow: string;
}

export function useHeatStreak(
  isActive: boolean,
  scriptTracker: ReturnType<typeof useScriptTracker>
): HeatStreakResult {
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [color, setColor] = useState('#10b981');
  const lastSimilarityRef = useRef<number>(0);
  const streakStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setStreak(0);
      setMultiplier(1.0);
      setColor('#10b981');
      lastSimilarityRef.current = 0;
      streakStartRef.current = 0;
      return;
    }

    // Check if current gate similarity is "on-script"
    const currentGateSimilarity = scriptTracker.gateSimilarities.find(
      (g) => g.gate === scriptTracker.currentGate
    )?.similarity || 0;

    if (currentGateSimilarity >= ON_SCRIPT_THRESHOLD) {
      // On-script: increment streak
      if (lastSimilarityRef.current >= ON_SCRIPT_THRESHOLD) {
        // Consecutive on-script
        setStreak((prev) => {
          const newStreak = prev + 1;
          
          // Find multiplier tier
          const tier = MULTIPLIER_TIERS.find((t) => newStreak >= t.streak) || MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1];
          setMultiplier(tier.multiplier);
          setColor(tier.color);
          
          return newStreak;
        });
      } else {
        // Starting new streak
        setStreak(1);
        setMultiplier(1.0);
        setColor('#10b981');
        streakStartRef.current = Date.now();
      }
    } else {
      // Off-script: reset streak if it was active
      if (streak >= STREAK_REQUIREMENT) {
        // Streak was active, now broken
        setStreak(0);
        setMultiplier(1.0);
        setColor('#10b981');
      } else {
        // Streak wasn't active yet, just reset
        setStreak(0);
        setMultiplier(1.0);
        setColor('#10b981');
      }
    }

    lastSimilarityRef.current = currentGateSimilarity;
  }, [scriptTracker.gateSimilarities, scriptTracker.currentGate, isActive, streak]);

  const isActiveStreak = streak >= STREAK_REQUIREMENT;
  
  // Calculate border glow intensity based on streak
  const borderGlow = isActiveStreak
    ? `0 0 ${Math.min(30, streak * 2)}px ${color}80, 0 0 ${Math.min(60, streak * 4)}px ${color}40`
    : 'none';

  return {
    streak,
    multiplier,
    color,
    isActive: isActiveStreak,
    borderGlow,
  };
}
