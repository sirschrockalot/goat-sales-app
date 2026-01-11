'use client';

/**
 * Script Progress Component
 * Displays horizontal progress bar with 5 script gates
 * Shows adherence status with visual feedback
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useScriptTracker, LOW_SIMILARITY_THRESHOLD, SIMILARITY_THRESHOLD } from '@/hooks/useScriptTracker';
import { useVapi } from '@/contexts/VapiContext';
import { getSoundboard } from '@/lib/soundboard';

interface ScriptProgressProps {
  className?: string;
  isActive?: boolean;
  voiceHintEnabled?: boolean;
  isScriptVisible?: boolean; // Training mode: hide script text when false
}

const ACQUISITION_GATE_NAMES = [
  'Intro',
  'Motivation',
  'Condition',
  'Numbers',
  'Hold',
  'Offer',
  'Expectations',
  'Commitment',
];

const ACQUISITION_GATE_FULL_NAMES = [
  'Intro (Contact/Credibility)',
  'Fact Find - Motivation',
  'Fact Find - Condition',
  'Transition to Numbers',
  'Running Comps / Hold',
  'The Offer',
  'The Close - Expectations',
  'Final Commitment',
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

export default function ScriptProgress({ className = '', isActive: propIsActive, voiceHintEnabled = false, isScriptVisible = true }: ScriptProgressProps) {
  const { isActive: contextIsActive, personaMode } = useVapi();
  const isActive = propIsActive ?? contextIsActive;
  const mode = personaMode || 'acquisition';
  const scriptTracker = useScriptTracker(isActive || false, voiceHintEnabled, mode);
  const { currentGate, adherenceScore, gateSimilarities, isChecking, isGoatModeActive } = scriptTracker;
  const previousPassedGatesRef = useRef<Set<number>>(new Set());
  const soundboard = getSoundboard();
  
  // State for current gate script text
  const [currentScriptText, setCurrentScriptText] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);

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
        
        // If Gate 8 (Final Commitment) completes in Goat Mode, trigger lightning
        if (gate === 8 && isGoatModeActive) {
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

  // Fetch script text for current gate
  useEffect(() => {
    if (!isActive || currentGate < 1 || currentGate > 8) {
      return;
    }

    const fetchScriptText = async () => {
      setLoadingScript(true);
      try {
        const response = await fetch(`/api/script/text?gate=${currentGate}&mode=${mode}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentScriptText(data.script_text || '');
        }
      } catch (error) {
        console.error('Error fetching script text:', error);
      } finally {
        setLoadingScript(false);
      }
    };

    fetchScriptText();
  }, [currentGate, mode, isActive]);

  return (
    <div className={`rounded-xl p-3 border border-white/10 ${className}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white mb-0.5">Script Adherence</h3>
          <div className="text-xs text-gray-400">
            Score: <span className="font-semibold" style={{ color: '#22C55E' }}>{adherenceScore}%</span>
            {isChecking && (
              <span className="ml-2 text-xs text-gray-500">Checking...</span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Gate {currentGate}/8
        </div>
      </div>

      {/* Horizontal Progress Bar */}
      <div className="flex gap-1.5 mb-3">
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
      {currentGate <= 8 && (
        <div className="mt-2 p-2 rounded-lg border" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: getGateStatus(currentGate) === 'warning' 
            ? 'rgba(239, 68, 68, 0.3)' 
            : 'rgba(234, 179, 8, 0.3)',
        }}>
          <div className="text-xs text-gray-400 mb-0.5">Current Focus</div>
          <div className="text-xs font-semibold text-white">
            {GATE_FULL_NAMES[currentGate - 1]}
          </div>
          
          {/* Script Text Display */}
          <AnimatePresence mode="wait">
            {isScriptVisible ? (
              <motion.div
                key="script-text"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 overflow-hidden"
              >
                <div className="text-xs text-gray-400 mb-1.5 font-semibold">Script:</div>
                {loadingScript ? (
                  <div className="text-xs text-gray-500 italic">Loading script...</div>
                ) : currentScriptText ? (
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 p-2 rounded border border-white/10">
                    {currentScriptText}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Script text not available</div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="script-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500 italic mt-2 text-center py-2"
              >
                Script Hidden: Trust Your Training
              </motion.div>
            )}
          </AnimatePresence>
          
          {getGateStatus(currentGate) === 'warning' && (
            <div className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
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
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 border-2"
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
      <div className="text-[10px] text-center mb-0.5" style={{ color: styles.color }}>
        {name}
      </div>

      {/* Similarity Score */}
      {similarity > 0 && (
        <div className="text-[10px] text-gray-500">
          {Math.round(similarity * 100)}%
        </div>
      )}

      {/* Progress Indicator Line */}
      <div className="w-full h-0.5 mt-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
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
