'use client';

/**
 * LiveCallHUD Component
 * Shows real-time call metrics with radial gauges using Framer Motion
 * Matches the mockup design with animated gauges
 */

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';
import { getCurrentStep, checkApprovalDenialGate, getPersonaConfig } from '@/lib/personas';
import ConfidenceGauge from '@/components/call/ConfidenceGauge';
import ScriptProgress from '@/components/call/ScriptProgress';
import VoiceCoach from '@/components/call/VoiceCoach';
import { useVoiceHints } from '@/hooks/useVoiceHints';
import { useScriptTracker } from '@/hooks/useScriptTracker';
import { useHeatStreak } from '@/hooks/useHeatStreak';
import { useTonalityCoach } from '@/hooks/useTonalityCoach';
import GoatModeLayer from '@/components/effects/GoatModeLayer';
import { Volume2, VolumeX, Zap, Radio } from 'lucide-react';
import type { PersonaConfig } from '@/lib/personas';

interface RadialGaugeProps {
  label: string;
  value: number; // 0-100
  color: string;
  size?: number;
}

function RadialGauge({ label, value, color, size = 120 }: RadialGaugeProps) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, value));
  
  // Animate the value with spring physics
  const spring = useSpring(percentage, {
    stiffness: 100,
    damping: 20,
  });
  
  const offset = useTransform(spring, (val) => {
    return circumference - (val / 100) * circumference;
  });

  // Segment colors for background
  const segmentColors = {
    red: '#EF4444',
    yellow: '#EAB308',
    green: color === '#22C55E' ? '#22C55E' : '#3B82F6',
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background segments */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.red}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset="0"
            opacity="0.3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.yellow}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset={-(circumference / 3)}
            opacity="0.3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.green}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset={-(circumference * 2) / 3}
            opacity="0.3"
          />

          {/* Animated value arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </svg>

        {/* Center value with animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <motion.div
            className="text-center"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="text-2xl font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.4 }}
            >
              {Math.round(percentage)}%
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LiveCallHUD() {
  const { callStatus, transcript, personaMode, isActive } = useVapi();
  const [currentStep, setCurrentStep] = useState(0);
  const [gateStatus, setGateStatus] = useState<'approval' | 'denial' | 'pending'>('pending');
  const [persona, setPersona] = useState<PersonaConfig | null>(null);
  const [pacing, setPacing] = useState(65);
  const [certainty, setCertainty] = useState(88);
  
  // Voice hints hook
  const { voiceHintsEnabled, setVoiceHintsEnabled } = useVoiceHints(isActive || false);
  
  // Script tracker and heat streak
  const scriptTracker = useScriptTracker(isActive || false, voiceHintsEnabled, personaMode || 'acquisition');
  const heatStreak = useHeatStreak(isActive || false, scriptTracker);
  const tonalityCoach = useTonalityCoach(isActive || false);
  
  // Calculate audio intensity for Goat Mode (based on certainty/pacing)
  const audioIntensity = Math.min(1, (certainty / 100) * 0.7 + (pacing / 100) * 0.3);

  useEffect(() => {
    if (!personaMode) return;
    const personaConfig = getPersonaConfig(personaMode);
    setPersona(personaConfig);
  }, [personaMode]);

  useEffect(() => {
    if (!persona || !transcript) return;

    const step = getCurrentStep(persona, transcript);
    setCurrentStep(step);

    const gate = checkApprovalDenialGate(persona, transcript);
    setGateStatus(gate);

    // Simulate pacing and certainty based on conversation progress
    // In real implementation, these would be calculated from speech analysis
    const progress = step / persona.dialogueGates.length;
    setPacing(Math.min(100, 50 + progress * 30));
    setCertainty(Math.min(100, 70 + progress * 20));
  }, [transcript, persona]);

  if (!persona || callStatus.status === 'idle') {
    return null;
  }

  return (
    <>
      {/* Goat Mode Layer */}
      <GoatModeLayer
        isActive={scriptTracker.isGoatModeActive}
        adherenceScore={scriptTracker.adherenceScore}
        intensity={audioIntensity}
      />

      <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none z-50 max-w-md mx-auto space-y-4">
      {/* Script Progress Tracker */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
        className="pointer-events-auto"
      >
        <ScriptProgress isActive={isActive || false} voiceHintEnabled={voiceHintsEnabled} />
      </motion.div>

          {/* Main HUD with Gauges */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="rounded-2xl p-6 border backdrop-blur-sm pointer-events-auto transition-all duration-300"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: scriptTracker.isGoatModeActive
                ? `rgba(16, 185, 129, ${0.8 + audioIntensity * 0.2})`
                : heatStreak.isActive
                ? heatStreak.color
                : 'rgba(255, 255, 255, 0.1)',
              boxShadow: scriptTracker.isGoatModeActive
                ? `0 0 ${30 + audioIntensity * 40}px rgba(16, 185, 129, ${0.6 + audioIntensity * 0.4}), 0 0 ${60 + audioIntensity * 60}px rgba(16, 185, 129, ${0.3 + audioIntensity * 0.3})`
                : heatStreak.borderGlow,
            }}
            animate={
              scriptTracker.isGoatModeActive
                ? {
                    scale: [1, 1.02, 1],
                    boxShadow: [
                      `0 0 ${30 + audioIntensity * 40}px rgba(16, 185, 129, ${0.6 + audioIntensity * 0.4})`,
                      `0 0 ${50 + audioIntensity * 60}px rgba(16, 185, 129, ${0.8 + audioIntensity * 0.2})`,
                      `0 0 ${30 + audioIntensity * 40}px rgba(16, 185, 129, ${0.6 + audioIntensity * 0.4})`,
                    ],
                  }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: scriptTracker.isGoatModeActive ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
        {/* Gauges */}
        <div className="flex justify-center gap-8 mb-4">
          <RadialGauge
            label="Pacing"
            value={pacing}
            color="#22C55E"
            size={120}
          />
          <ConfidenceGauge
            isActive={callStatus.status === 'connected' || isActive}
            size={120}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: callStatus.status === 'connected' ? '#22C55E' : '#EF4444',
              scale: callStatus.status === 'connected' ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: callStatus.status === 'connected' ? Infinity : 0,
            }}
          />
          <span className="capitalize">{callStatus.status}</span>
          {currentStep > 0 && (
            <>
              <span className="mx-2">•</span>
              <span>Step {currentStep}/5</span>
            </>
          )}
        </div>

        {/* Heat Streak Indicator */}
        {heatStreak.isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-2 px-3 py-1 rounded-lg"
            style={{
              backgroundColor: `${heatStreak.color}20`,
              border: `1px solid ${heatStreak.color}50`,
              boxShadow: `0 0 10px ${heatStreak.color}40`,
            }}
          >
            <Zap className="w-4 h-4" style={{ color: heatStreak.color }} />
            <span className="text-xs font-semibold" style={{ color: heatStreak.color }}>
              HEAT STREAK: {heatStreak.streak}x • {heatStreak.multiplier.toFixed(1)}x MULTIPLIER
            </span>
          </motion.div>
        )}

        {/* Goat Mode Indicator */}
        {scriptTracker.isGoatModeActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid rgba(16, 185, 129, 0.6)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-xl"
            >
              🐐
            </motion.span>
            <span className="text-xs font-bold" style={{ color: '#10b981' }}>
              GOAT MODE ACTIVE • 2x XP
            </span>
          </motion.div>
        )}

        {/* Vibe Match Indicator */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center justify-center gap-2 mb-2 px-3 py-1 rounded-lg ${
            tonalityCoach.isInSync ? 'border-2' : 'border'
          }`}
          style={{
            backgroundColor: tonalityCoach.isInSync
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
            borderColor: tonalityCoach.isInSync
              ? 'rgba(34, 197, 94, 0.6)'
              : 'rgba(239, 68, 68, 0.6)',
            boxShadow: tonalityCoach.isInSync
              ? '0 0 15px rgba(34, 197, 94, 0.4)'
              : '0 0 10px rgba(239, 68, 68, 0.3)',
          }}
        >
          <Radio
            className="w-4 h-4"
            style={{
              color: tonalityCoach.isInSync ? '#22C55E' : '#EF4444',
            }}
          />
          <span
            className="text-xs font-semibold"
            style={{
              color: tonalityCoach.isInSync ? '#22C55E' : '#EF4444',
            }}
          >
            VIBE MATCH: {tonalityCoach.mirroringScore}% • {tonalityCoach.repPace} WPM
          </span>
        </motion.div>

        {/* Gate Status */}
        {gateStatus !== 'pending' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`mt-3 p-2 rounded-lg text-center text-xs font-semibold ${
              gateStatus === 'approval'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {gateStatus === 'approval' ? '✓ APPROVAL GATE MET' : '✗ DENIAL GATE MET'}
          </motion.div>
        )}

      </motion.div>

      {/* Voice Coach Component */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="pointer-events-auto"
      >
        <VoiceCoach difficulty={5} />
      </motion.div>
      </div>
    </>
  );
}
