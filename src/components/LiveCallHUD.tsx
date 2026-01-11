'use client';

/**
 * LiveCallHUD Component
 * Shows real-time call metrics with radial gauges using Framer Motion
 * Matches the mockup design with animated gauges
 */

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';
import { getCurrentStep, checkApprovalDenialGate, getPersonaConfig } from '@/lib/personas';
import ConfidenceGauge from '@/components/call/ConfidenceGauge';
import ScriptProgress from '@/components/call/ScriptProgress';
import VoiceCoach from '@/components/call/VoiceCoach';
import { useVoiceHints } from '@/hooks/useVoiceHints';
import { useScriptTracker } from '@/hooks/useScriptTracker';
import { useHeatStreak } from '@/hooks/useHeatStreak';
import { useTonalityCoach } from '@/hooks/useTonalityCoach';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import GoatModeLayer from '@/components/effects/GoatModeLayer';
import { Volume2, VolumeX, Zap, Radio, Eye, EyeOff, Heart, BookOpen, DollarSign, AlertTriangle, Users, Shield } from 'lucide-react';
import type { PersonaConfig } from '@/lib/personas';
import { getGauntletLevel } from '@/lib/gauntletLevels';
import DealCalculator from '@/components/call/DealCalculator';
import type { ExitStrategy } from '@/lib/financialFramework';
import { useAdvocacyTracker } from '@/hooks/useAdvocacyTracker';

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

interface LiveCallHUDProps {
  gauntletLevel?: number;
  exitStrategy?: ExitStrategy;
}

export default function LiveCallHUD({ gauntletLevel, exitStrategy = 'fix_and_flip' }: LiveCallHUDProps = {}) {
  const { callStatus, transcript, transcriptionHistory, personaMode, isActive } = useVapi();
  const [currentStep, setCurrentStep] = useState(0);
  const [gateStatus, setGateStatus] = useState<'approval' | 'denial' | 'pending'>('pending');
  const [persona, setPersona] = useState<PersonaConfig | null>(null);
  const [pacing, setPacing] = useState(65);
  const [certainty, setCertainty] = useState(88);
  const [isRapportMode, setIsRapportMode] = useState(false);
  const [storySummary, setStorySummary] = useState<string | null>(null);
  const [suggestedMaxOffer, setSuggestedMaxOffer] = useState<number | null>(null);
  const [detectedPrice, setDetectedPrice] = useState<number | null>(null);
  const [priceVariance, setPriceVariance] = useState<number | null>(null);
  
  // Voice hints hook
  const { voiceHintsEnabled, setVoiceHintsEnabled } = useVoiceHints(isActive || false);
  
  // Training session hook (script visibility toggle)
  const trainingSession = useTrainingSession();
  
  // Script tracker and heat streak
  const scriptTracker = useScriptTracker(isActive || false, voiceHintsEnabled, personaMode || 'acquisition');
  const heatStreak = useHeatStreak(isActive || false, scriptTracker);
  const tonalityCoach = useTonalityCoach(isActive || false);
  const advocacyMetrics = useAdvocacyTracker(transcript, isActive || false);
  
  // Calculate audio intensity for Goat Mode (based on certainty/pacing)
  const audioIntensity = Math.min(1, (certainty / 100) * 0.7 + (pacing / 100) * 0.3);

  useEffect(() => {
    if (!personaMode) return;
    const personaConfig = getPersonaConfig(personaMode);
    setPersona(personaConfig);
  }, [personaMode]);

  // Get suggested max offer from gauntlet level
  useEffect(() => {
    if (gauntletLevel) {
      const levelConfig = getGauntletLevel(gauntletLevel as any);
      if (levelConfig.suggestedBuyPrice) {
        setSuggestedMaxOffer(levelConfig.suggestedBuyPrice);
      }
    }
  }, [gauntletLevel]);

  // Real-time price detection and variance calculation
  useEffect(() => {
    if (!transcript || !suggestedMaxOffer) return;

    // Extract price mentions from transcript (user's speech)
    const pricePattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand)?/gi;
    const matches = transcript.match(pricePattern);
    
    if (matches && matches.length > 0) {
      // Get the last mentioned price (most recent offer)
      const lastMatch = matches[matches.length - 1];
      const priceStr = lastMatch.replace(/[$,]/g, '').toLowerCase();
      let price = parseFloat(priceStr);
      
      // Handle "k" suffix (thousands)
      if (priceStr.includes('k') || priceStr.includes('thousand')) {
        price = price * 1000;
      }
      
      if (price > 0 && price !== detectedPrice) {
        setDetectedPrice(price);
        
        // Calculate variance
        const variance = ((price - suggestedMaxOffer) / suggestedMaxOffer) * 100;
        setPriceVariance(variance);
      }
    }
  }, [transcript, suggestedMaxOffer, detectedPrice]);

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

      <div className="w-full space-y-3">
      {/* Script Progress Tracker with Training Mode Toggle */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
        className="relative"
      >
        {/* Training Mode Toggle - Top Right */}
        <motion.button
          onClick={trainingSession.toggleScriptVisibility}
          className="absolute top-3 right-3 z-10 flex items-center gap-2 px-2 py-1 rounded-lg border transition-all"
          style={{
            backgroundColor: trainingSession.isScriptVisible 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            borderColor: trainingSession.isScriptVisible 
              ? 'rgba(16, 185, 129, 0.5)' 
              : 'rgba(239, 68, 68, 0.5)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={trainingSession.isScriptVisible ? 'Switch to Pro Mode (Hide Script)' : 'Switch to Practice Mode (Show Script)'}
        >
          {trainingSession.isScriptVisible ? (
            <>
              <Eye className="w-4 h-4" style={{ color: '#10b981' }} />
              <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                Practice
              </span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" style={{ color: '#ef4444' }} />
              <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                Pro
              </span>
            </>
          )}
        </motion.button>
        
        <ScriptProgress 
          isActive={isActive || false} 
          voiceHintEnabled={voiceHintsEnabled}
          isScriptVisible={trainingSession.isScriptVisible}
        />
      </motion.div>

          {/* Main HUD with Gauges */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="rounded-xl p-4 border backdrop-blur-sm pointer-events-auto transition-all duration-300"
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
        <div className="flex justify-center gap-4 mb-3">
          <RadialGauge
            label="Pacing"
            value={pacing}
            color="#22C55E"
            size={100}
          />
          <ConfidenceGauge
            isActive={callStatus.status === 'connected' || isActive}
            size={100}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-1">
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
              <span>Step {currentStep}/8</span>
            </>
          )}
        </div>

        {/* Suggested Max Offer & Price Variance (Negotiation Phase) */}
        {suggestedMaxOffer && currentStep >= 6 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-4 mb-2"
          >
            {/* Suggested Max Offer */}
            <div className="px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">
                Max: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(suggestedMaxOffer)}
              </span>
            </div>

            {/* Real-time Variance Warning */}
            {detectedPrice && priceVariance !== null && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                  priceVariance <= 0
                    ? 'border-[#22C55E]/50 bg-[#22C55E]/10'
                    : priceVariance <= 5
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-red-500/50 bg-red-500/10'
                }`}
              >
                {priceVariance > 5 && (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs font-semibold ${
                  priceVariance <= 0
                    ? 'text-[#22C55E]'
                    : priceVariance <= 5
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {priceVariance > 0 ? '+' : ''}{priceVariance.toFixed(1)}% Variance
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Heat Streak Indicator */}
        {heatStreak.isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-1 px-2 py-1 rounded-lg"
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
            className="flex items-center justify-center gap-2 mb-1 px-2 py-1 rounded-lg"
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
          className={`flex items-center justify-center gap-2 mb-1 px-2 py-1 rounded-lg ${
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

        {/* Deal Calculator - Show during negotiation phase (Step 6+) */}
        {currentStep >= 6 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            <DealCalculator
              transcript={transcript}
              exitStrategy={exitStrategy}
              suggestedMaxOffer={suggestedMaxOffer || undefined}
            />
          </motion.div>
        )}

        {/* Gate Status */}
        {gateStatus !== 'pending' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`mt-2 p-1.5 rounded-lg text-center text-xs font-semibold ${
              gateStatus === 'approval'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {gateStatus === 'approval' ? '✓ APPROVAL GATE MET' : '✗ DENIAL GATE MET'}
          </motion.div>
        )}

      </motion.div>

      {/* Rapport Mode Indicator */}
      <AnimatePresence>
        {isRapportMode && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="rounded-xl p-4 border backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.15)', // Purple tint for emotional/rapport
              borderColor: 'rgba(139, 92, 246, 0.4)',
            }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="flex-shrink-0"
              >
                <Heart className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-white">
                    EMOTIONAL CUE DETECTED
                  </span>
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#8B5CF6' }}
                  />
                </div>
                {storySummary && (
                  <div className="mt-2 p-2 rounded-lg border" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                  }}>
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                      <div className="text-xs text-gray-300 leading-relaxed">
                        <div className="font-semibold mb-1" style={{ color: '#A78BFA' }}>
                          Story Flashcard:
                        </div>
                        <div>{storySummary}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2 italic">
                  Listen and learn how to use this story in real calls
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Coach Component */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <VoiceCoach difficulty={5} />
      </motion.div>
      </div>
    </>
  );
}
