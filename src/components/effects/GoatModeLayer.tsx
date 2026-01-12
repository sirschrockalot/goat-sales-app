'use client';

/**
 * Goat Mode Layer
 * Atmospheric visual effects for high-performance reps
 * Triggers when maintaining 90+ score and 100% script adherence for 30+ seconds
 */

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';

interface GoatModeLayerProps {
  isActive: boolean;
  adherenceScore: number; // 0-100
  intensity?: number; // 0-1, based on audio/certainty
  onGate5Complete?: () => void;
}

export default function GoatModeLayer({
  isActive,
  adherenceScore,
  intensity = 0.5,
  onGate5Complete,
}: GoatModeLayerProps) {
  const [showLightning, setShowLightning] = useState(false);
  const { isActive: callActive } = useVapi();

  // Calculate glow intensity based on adherence and audio intensity
  const glowIntensity = isActive ? Math.min(1, (adherenceScore / 100) * 0.8 + intensity * 0.2) : 0;
  const gridIntensity = isActive ? adherenceScore / 100 : 0;

  // Trigger lightning when Gate 5 completes in Goat Mode
  useEffect(() => {
    if (isActive && adherenceScore === 100) {
      // This would be triggered from parent when Gate 5 completes
      // For now, we'll handle it via props or context
    }
  }, [isActive, adherenceScore]);

  if (!isActive || !callActive) {
    return null;
  }

  return (
    <>
      {/* Atmospheric Glow - Viewport Edges */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[60]"
        style={{
          background: `
            radial-gradient(circle at top left, rgba(16, 185, 129, ${glowIntensity * 0.3}) 0%, transparent 50%),
            radial-gradient(circle at top right, rgba(16, 185, 129, ${glowIntensity * 0.3}) 0%, transparent 50%),
            radial-gradient(circle at bottom left, rgba(16, 185, 129, ${glowIntensity * 0.3}) 0%, transparent 50%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, ${glowIntensity * 0.3}) 0%, transparent 50%)
          `,
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Matrix/Grid Overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[59] opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, ${gridIntensity * 0.1}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, ${gridIntensity * 0.1}) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
        animate={{
          backgroundPosition: ['0 0', '50px 50px'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Lightning Bolt Effect (when Gate 5 completes) */}
      {showLightning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center overflow-hidden"
        >
          {/* Screen shake effect */}
          <motion.div
            animate={{
              x: [0, -20, 20, -15, 15, -10, 10, 0],
              y: [0, -20, 20, -15, 15, -10, 10, 0],
            }}
            transition={{
              duration: 0.5,
              times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1],
            }}
            className="absolute inset-0"
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 400 800"
              className="absolute"
              style={{ filter: 'drop-shadow(0 0 60px rgba(16, 185, 129, 1))' }}
            >
              {/* Main lightning bolt */}
              <motion.path
                d="M200 50 L180 200 L220 250 L160 400 L240 450 L200 600 L220 750"
                stroke="#10b981"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              {/* Inner white core */}
              <motion.path
                d="M200 50 L180 200 L220 250 L160 400 L240 450 L200 600 L220 750"
                stroke="#ffffff"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              />
              {/* Branch 1 */}
              <motion.path
                d="M200 200 L190 250 L210 280"
                stroke="#10b981"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.15, delay: 0.1 }}
              />
              {/* Branch 2 */}
              <motion.path
                d="M200 400 L185 450 L215 480"
                stroke="#10b981"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.15, delay: 0.2 }}
              />
            </svg>
          </motion.div>
        </motion.div>
      )}

      {/* Pulsing Border Effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[58]"
        style={{
          border: `2px solid rgba(16, 185, 129, ${glowIntensity * 0.5})`,
          boxShadow: `
            inset 0 0 ${glowIntensity * 60}px rgba(16, 185, 129, ${glowIntensity * 0.3}),
            0 0 ${glowIntensity * 80}px rgba(16, 185, 129, ${glowIntensity * 0.2})
          `,
        }}
        animate={{
          borderColor: [
            `rgba(16, 185, 129, ${glowIntensity * 0.5})`,
            `rgba(16, 185, 129, ${glowIntensity})`,
            `rgba(16, 185, 129, ${glowIntensity * 0.5})`,
          ],
          boxShadow: [
            `inset 0 0 ${glowIntensity * 60}px rgba(16, 185, 129, ${glowIntensity * 0.3}), 0 0 ${glowIntensity * 80}px rgba(16, 185, 129, ${glowIntensity * 0.2})`,
            `inset 0 0 ${glowIntensity * 100}px rgba(16, 185, 129, ${glowIntensity * 0.5}), 0 0 ${glowIntensity * 120}px rgba(16, 185, 129, ${glowIntensity * 0.4})`,
            `inset 0 0 ${glowIntensity * 60}px rgba(16, 185, 129, ${glowIntensity * 0.3}), 0 0 ${glowIntensity * 80}px rgba(16, 185, 129, ${glowIntensity * 0.2})`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </>
  );
}

/**
 * Trigger lightning effect (call this when Gate 5 completes in Goat Mode)
 */
export function triggerGoatModeLightning(setShowLightning: (show: boolean) => void) {
  setShowLightning(true);
  setTimeout(() => setShowLightning(false), 500);
}
