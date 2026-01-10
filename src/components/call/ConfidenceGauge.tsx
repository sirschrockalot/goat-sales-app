'use client';

/**
 * Confidence Gauge Component
 * Semi-circular radial gauge showing real-time confidence/certainty score
 * Includes uptalk warning indicator
 */

import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useConfidenceMeter } from '@/hooks/useConfidenceMeter';

interface ConfidenceGaugeProps {
  isActive: boolean;
  size?: number;
}

export default function ConfidenceGauge({
  isActive,
  size = 140,
}: ConfidenceGaugeProps) {
  const { score, wpm, hasUptalk } = useConfidenceMeter(isActive);

  // Animate score with spring physics for smooth, bouncy movement
  const spring = useSpring(score, {
    stiffness: 100,
    damping: 15,
    mass: 0.5,
  });

  // Calculate angle for semi-circle (0-180 degrees)
  const angle = useTransform(spring, (value) => {
    // Map 0-100 score to 0-180 degrees (semi-circle)
    return value * 1.8; // 100 * 1.8 = 180 degrees
  });

  // Determine color based on score
  const getColor = (score: number): string => {
    if (score >= 76) return '#22C55E'; // Bright Emerald Green (Goat Mode)
    if (score >= 41) return '#EAB308'; // Yellow (Developing Certainty)
    return '#EF4444'; // Dim Red (Lack of Conviction)
  };

  // Determine glow color
  const getGlowColor = (score: number): string => {
    if (score >= 76) return 'rgba(34, 197, 94, 0.5)';
    if (score >= 41) return 'rgba(234, 179, 8, 0.5)';
    return 'rgba(239, 68, 68, 0.3)';
  };

  const color = getColor(score);
  const glowColor = getGlowColor(score);
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size; // Bottom center for semi-circle
  const needleLength = radius * 0.85;

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-2">Confidence</div>
      <div
        className="relative"
        style={{
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          className="overflow-visible"
          style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}
        >
          {/* Background semi-circle segments */}
          {/* Red segment (0-40) */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius * 0.4} L ${centerX} ${centerY} Z`}
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            opacity="0.3"
          />
          <path
            d={`M ${centerX} ${centerY - radius * 0.4} A ${radius} ${radius} 0 0 1 ${centerX + radius * 0.35} ${centerY - radius * 0.7} L ${centerX} ${centerY} Z`}
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            opacity="0.3"
          />

          {/* Yellow segment (41-75) */}
          <path
            d={`M ${centerX + radius * 0.35} ${centerY - radius * 0.7} A ${radius} ${radius} 0 0 1 ${centerX + radius * 0.7} ${centerY - radius * 0.85} L ${centerX} ${centerY} Z`}
            fill="none"
            stroke="#EAB308"
            strokeWidth="8"
            opacity="0.3"
          />
          <path
            d={`M ${centerX + radius * 0.7} ${centerY - radius * 0.85} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} L ${centerX} ${centerY} Z`}
            fill="none"
            stroke="#EAB308"
            strokeWidth="8"
            opacity="0.3"
          />

          {/* Green segment (76-100) - full top arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 0 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="#22C55E"
            strokeWidth="8"
            opacity="0.2"
          />

          {/* Active arc based on score - animated from left to right */}
          <motion.path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            style={{
              pathLength: useTransform(spring, (s) => s / 100),
            }}
          />

          {/* Needle - animated with spring physics */}
          <motion.line
            x1={centerX}
            y1={centerY}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              x2: useTransform(spring, (s) => {
                const angleDeg = s * 1.8 - 90; // 0-100 score to -90 to 90 degrees
                const rad = (angleDeg * Math.PI) / 180;
                return centerX + needleLength * Math.cos(rad);
              }),
              y2: useTransform(spring, (s) => {
                const angleDeg = s * 1.8 - 90;
                const rad = (angleDeg * Math.PI) / 180;
                return centerY - needleLength * Math.sin(rad);
              }),
            }}
          />

          {/* Center dot */}
          <circle
            cx={centerX}
            cy={centerY}
            r="6"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
          />
        </svg>

        {/* Score display */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ paddingTop: '20%' }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <motion.div
              className="text-2xl font-bold"
              style={{ color }}
            >
              {Math.round(score)}
            </motion.div>
            <div className="text-xs text-gray-500 mt-1">
              {wpm > 0 ? `${wpm} WPM` : '—'}
            </div>
          </motion.div>
        </motion.div>

        {/* Uptalk Warning Indicator */}
        <AnimatePresence>
          {hasUptalk && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-2 right-0"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="bg-red-500 rounded-full p-1.5"
                style={{
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                }}
              >
                <AlertTriangle className="w-4 h-4 text-white" />
              </motion.div>
              <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-red-500/90 text-white text-xs rounded whitespace-nowrap">
                Uptalk Detected
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
