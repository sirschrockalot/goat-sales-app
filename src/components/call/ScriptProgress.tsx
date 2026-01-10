'use client';

/**
 * Script Progress Component
 * Displays horizontal progress bar with 5 script gates
 * Shows adherence status with visual feedback
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useScriptTracker, LOW_SIMILARITY_THRESHOLD, SIMILARITY_THRESHOLD } from '@/hooks/useScriptTracker';
import { useVapi } from '@/contexts/VapiContext';
import { getSoundboard } from '@/lib/soundboard';

interface ScriptProgressProps {
  className?: string;
  isActive?: boolean;
  voiceHintEnabled?: boolean;
}

const ACQUISITION_GATE_NAMES = [
  'Intro',
  'Fact Find',
  'Pitch',
  'Offer',
  'Close',
];

const ACQUISITION_GATE_FULL_NAMES = [
  'The Intro (Approval/Denial)',
  'Fact Find (The Why)',
  'The Pitch (Inside/Outside)',
  'The Offer (Virtual Withdraw)',
  'The Close (Agreement)',
];

const DISPO_GATE_NAMES = [
  'Intro',
  'ARV & Condition',
  'Neighborhood',
  'Timeline & Terms',
  'Agreement',
];

const DISPO_GATE_FULL_NAMES = [
  'The Intro (Value Proposition)',
  'Fact Find (ARV & Condition)',
  'The Pitch (Neighborhood Context)',
  'The Offer (Timeline & Terms)',
  'The Close (Agreement & Next Steps)',
];

export default function ScriptProgress({ className = '', isActive: propIsActive, voiceHintEnabled = false }: ScriptProgressProps) {
  const { isActive: contextIsActive, personaMode } = useVapi();
  const isActive = propIsActive ?? contextIsActive;
  const mode = personaMode || 'acquisition';
  const scriptTracker = useScriptTracker(isActive || false, voiceHintEnabled, mode);
  const { currentGate, adherenceScore, gateSimilarities, isChecking } = scriptTracker;
  const previousPassedGatesRef = useRef<Set<number>>(new Set());
  const soundboard = getSoundboard();

  // Select gate names based on mode
  const GATE_NAMES = mode === 'disposition' ? DISPO_GATE_NAMES : ACQUISITION_GATE_NAMES;
  const GATE_FULL_NAMES = mode === 'disposition' ? DISPO_GATE_FULL_NAMES : ACQUISITION_GATE_FULL_NAMES;

  // Play chime when a gate passes
  useEffect(() => {
    if (!isActive) return;

    const currentPassedGates = new Set(
      gateSimilarities
        .filter((g) => g.similarity >= SIMILARITY_THRESHOLD)
        .map((g) => g.gate)
    );

    // Check for newly passed gates
    currentPassedGates.forEach((gate) => {
      if (!previousPassedGatesRef.current.has(gate)) {
        soundboard.playChime();
        
        // If Gate 5 (The Clinch) completes in Goat Mode, trigger lightning
        if (gate === 5 && isGoatModeActive) {
          const handler = (window as any).__goatModeGate5Handler;
          if (handler) {
            handler();
          }
        }
      }
    });

    previousPassedGatesRef.current = currentPassedGates;
  }, [gateSimilarities, isActive, isGoatModeActive]);

  const getGateStatus = (gateNumber: number): 'passed' | 'active' | 'pending' | 'warning' => {
    if (gateNumber < currentGate) {
      return 'passed';
    }
    if (gateNumber === currentGate) {
      const similarity = gateSimilarities.find((g) => g.gate === gateNumber)?.similarity || 0;
      if (similarity < LOW_SIMILARITY_THRESHOLD) {
        return 'warning';
      }
      return 'active';
    }
    return 'pending';
  };

  const getGateSimilarity = (gateNumber: number): number => {
    return gateSimilarities.find((g) => g.gate === gateNumber)?.similarity || 0;
  };

  return (
    <div className={`rounded-2xl p-6 border border-white/10 ${className}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Script Adherence</h3>
          <div className="text-sm text-gray-400">
            Score: <span className="font-semibold" style={{ color: '#22C55E' }}>{adherenceScore}%</span>
            {isChecking && (
              <span className="ml-2 text-xs text-gray-500">Checking...</span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Gate {currentGate}/5
        </div>
      </div>

      {/* Horizontal Progress Bar */}
      <div className="flex gap-2 mb-4">
        {GATE_NAMES.map((name, index) => {
          const gateNumber = index + 1;
          const status = getGateStatus(gateNumber);
          const similarity = getGateSimilarity(gateNumber);

          return (
            <GateSegment
              key={gateNumber}
              gateNumber={gateNumber}
              name={name}
              status={status}
              similarity={similarity}
              isCurrent={gateNumber === currentGate}
            />
          );
        })}
      </div>

      {/* Current Gate Info */}
      {currentGate <= 5 && (
        <div className="mt-4 p-3 rounded-lg border" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: getGateStatus(currentGate) === 'warning' 
            ? 'rgba(239, 68, 68, 0.3)' 
            : 'rgba(234, 179, 8, 0.3)',
        }}>
          <div className="text-xs text-gray-400 mb-1">Current Focus</div>
          <div className="text-sm font-semibold text-white">
            {GATE_FULL_NAMES[currentGate - 1]}
          </div>
          {getGateStatus(currentGate) === 'warning' && (
            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <span>⚠️</span>
              <span>Low adherence - Review script requirements</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GateSegmentProps {
  gateNumber: number;
  name: string;
  status: 'passed' | 'active' | 'pending' | 'warning';
  similarity: number;
  isCurrent: boolean;
}

function GateSegment({ gateNumber, name, status, similarity, isCurrent }: GateSegmentProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'passed':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 0.5)',
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
          color: '#22C55E',
        };
      case 'active':
        return {
          backgroundColor: 'rgba(234, 179, 8, 0.2)',
          borderColor: 'rgba(234, 179, 8, 0.5)',
          boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)',
          color: '#EAB308',
        };
      case 'warning':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.5)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
          color: '#EF4444',
        };
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
          color: '#666',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <motion.div
      className="flex-1 flex flex-col items-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: gateNumber * 0.1 }}
    >
      {/* Gate Number Badge */}
      <motion.div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2"
        style={styles}
        animate={
          status === 'active'
            ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 20px rgba(234, 179, 8, 0.4)',
                  '0 0 30px rgba(234, 179, 8, 0.6)',
                  '0 0 20px rgba(234, 179, 8, 0.4)',
                ],
              }
            : status === 'warning'
            ? {
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.4)',
                  '0 0 25px rgba(239, 68, 68, 0.6)',
                  '0 0 20px rgba(239, 68, 68, 0.4)',
                ],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: status === 'active' || status === 'warning' ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {gateNumber}
      </motion.div>

      {/* Gate Name */}
      <div className="text-xs text-center mb-1" style={{ color: styles.color }}>
        {name}
      </div>

      {/* Similarity Score */}
      {similarity > 0 && (
        <div className="text-xs text-gray-500">
          {Math.round(similarity * 100)}%
        </div>
      )}

      {/* Progress Indicator Line */}
      <div className="w-full h-1 mt-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${similarity * 100}%` }}
          transition={{ duration: 0.5 }}
          style={{
            height: '100%',
            backgroundColor: styles.color,
            boxShadow: `0 0 10px ${styles.color}`,
          }}
        />
      </div>
    </motion.div>
  );
}
