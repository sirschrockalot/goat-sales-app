'use client';

/**
 * Post-Call Debrief Page
 * Comprehensive evaluation screen with grade, logic gates, coaching, and audio playback
 * Matches the 4th screen in the mockup
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Check, Trophy, Sparkles, Shield, ShieldOff } from 'lucide-react';
import AudioPlayer from '@/components/call/AudioPlayer';
import DeviationMap from '@/components/call/DeviationMap';
import ErrorBoundary from '@/components/ErrorBoundary';
import LevelUpOverlay from '@/components/effects/LevelUpOverlay';
import { getSoundboard } from '@/lib/soundboard';
import { getGauntletLevel } from '@/lib/gauntletLevels';
import { useAuth } from '@/contexts/AuthContext';
import type { DeviationAnalysis } from '@/lib/analyzeDeviation';

interface CallResult {
  id: string;
  goat_score: number | null;
  transcript: string;
  recording_url: string | null;
  rebuttal_of_the_day: string | null;
  logic_gates: Array<{
    name: string;
    passed: boolean;
    score?: number;
    timestamp?: number;
  }>;
  persona_mode: string;
  persona_id: string;
  created_at: string;
  user_id: string;
  feedback?: string;
  script_adherence?: DeviationAnalysis;
  ended_at?: string;
  is_permanent_knowledge?: boolean;
  metadata?: any;
}

const GOAT_STEPS = [
  { name: 'Approval/Denial Intro', key: 'intro' },
  { name: 'Fact-Finding (The Why)', key: 'why' },
  { name: 'Property Condition (The House)', key: 'propertyCondition' },
  { name: 'Tone', key: 'tone' },
  { name: 'The Clinch', key: 'clinch' },
];

export default function CallDebriefPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();
  const callId = params.id as string;
  const gauntletLevel = searchParams.get('gauntletLevel');

  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [masteredGate, setMasteredGate] = useState<string | null>(null);
  const [isPermanentKnowledge, setIsPermanentKnowledge] = useState(false);
  const [togglingPermanent, setTogglingPermanent] = useState(false);
  const maxRetries = 10; // Poll for up to 30 seconds (3s intervals)

  useEffect(() => {
    const fetchCallResult = async () => {
      try {
        const response = await fetch(`/api/calls/${callId}`);
        if (response.ok) {
          const data = await response.json();
          
          // If score is missing, webhook is still processing
          if (!data.goat_score && data.transcript) {
            setGrading(true);
            
            // Poll for results if webhook is still processing
            if (retryCount < maxRetries) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
                fetchCallResult();
              }, 3000); // Retry every 3 seconds
              return;
            }
          } else {
            setGrading(false);
          }
          
          setCallResult(data);
          setIsPermanentKnowledge(data.is_permanent_knowledge || false);
          setLoading(false);

          // If this is a gauntlet call and score is available, evaluate it
          if (gauntletLevel && data.goat_score !== null && data.goat_score >= 0) {
            evaluateGauntletCall(data.goat_score);
          }
        } else if (response.status === 404 && retryCount < maxRetries) {
          // Call might not exist yet (webhook still processing)
          setGrading(true);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchCallResult();
          }, 3000);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch call result');
          }
          setLoading(false);
        }
      } catch (error) {
        // If OpenAI is slow, show coaching message instead of error
        if (retryCount < maxRetries) {
          setGrading(true);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchCallResult();
          }, 3000);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching call result:', error);
          }
          setLoading(false);
        }
      }
    };

    if (callId) {
      fetchCallResult();
    }
  }, [callId, retryCount]);

  const handleShareRebuttal = async () => {
    if (!callResult || !callResult.rebuttal_of_the_day || callResult.rebuttal_of_the_day === 'None') {
      return;
    }

    setSharing(true);
    try {
      const response = await fetch('/api/rebuttals/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: callResult.id,
          rebuttalText: callResult.rebuttal_of_the_day,
        }),
      });

      if (response.ok) {
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sharing rebuttal:', error);
      }
    } finally {
      setSharing(false);
    }
  };

  const getGradeFromScore = (score: number): string => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return '#22C55E';
    if (score >= 80) return '#22C55E';
    if (score >= 70) return '#EAB308';
    return '#EF4444';
  };

  const getGradeGlow = (score: number) => {
    const color = getGradeColor(score);
    if (score >= 90) return `0 0 40px ${color}`;
    if (score >= 80) return `0 0 30px ${color}`;
    if (score >= 70) return `0 0 20px ${color}`;
    return `0 0 15px ${color}`;
  };

  if (loading || grading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-6"
            style={{ boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)' }}
          />
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-3"
            style={{ color: '#22C55E' }}
          >
            {grading ? 'Analyzing Your Call...' : 'Loading Results...'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-4"
          >
            {grading 
              ? 'Our AI coach is reviewing your performance against the GOAT Framework. This may take a moment...'
              : 'Fetching your call results...'
            }
          </motion.p>
          {grading && retryCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 rounded-xl border border-[#22C55E]/30"
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
              }}
            >
              <p className="text-sm text-[#22C55E]">
                💡 Coaching report is being generated... Please wait.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (!callResult) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="text-red-400 mb-4">Call not found</div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-2xl bg-[#22C55E] text-white"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const score = callResult.goat_score || 0;
  const grade = getGradeFromScore(score);
  const gradeColor = getGradeColor(score);
  const gradeGlow = getGradeGlow(score);
  const canShare = score > 85 && callResult.rebuttal_of_the_day && callResult.rebuttal_of_the_day !== 'None';

  // Evaluate gauntlet call
  const evaluateGauntletCall = async (goatScore: number) => {
    if (!gauntletLevel || !callId || !user?.id) return;

    try {
      const response = await fetch('/api/gauntlet/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.leveledUp) {
          setLeveledUp(true);
          setNewLevel(data.newLevel);
          
          // Get level info for overlay
          const levelConfig = getGauntletLevel(data.newLevel as any);
          setMasteredGate(levelConfig.name);
          
          setShowLevelUp(true);
          // Auto-hide after 8 seconds
          setTimeout(() => setShowLevelUp(false), 8000);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error evaluating gauntlet:', error);
      }
    }
  };

  // Play sounds based on score
  useEffect(() => {
    if (callResult?.goat_score !== null && callResult?.goat_score !== undefined) {
      const score = callResult.goat_score;
      const soundboard = getSoundboard();
      
      if (score >= 100) {
        // Perfect score - goat bleat
        soundboard.playBleat();
      } else if (score >= 95) {
        // Epic score - horn
        soundboard.playHorn();
      }
    }
  }, [callResult?.goat_score]);

  // Toggle permanent knowledge flag (admin only)
  const handleTogglePermanentKnowledge = async () => {
    if (!isAdmin || !callId) return;

    setTogglingPermanent(true);
    try {
      const response = await fetch(`/api/admin/calls/${callId}/permanent-knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_permanent_knowledge: !isPermanentKnowledge,
        }),
      });

      if (response.ok) {
        setIsPermanentKnowledge(!isPermanentKnowledge);
        if (callResult) {
          setCallResult({
            ...callResult,
            is_permanent_knowledge: !isPermanentKnowledge,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling permanent knowledge:', error);
    } finally {
      setTogglingPermanent(false);
    }
  };

  // Play chime when logic gates pass (only once when gates are first loaded)
  const previousPassedCountRef = useRef(0);
  useEffect(() => {
    if (callResult?.logic_gates) {
      const passedGates = callResult.logic_gates.filter((g) => g.passed).length;
      if (passedGates > previousPassedCountRef.current) {
        const soundboard = getSoundboard();
        soundboard.playChime();
        previousPassedCountRef.current = passedGates;
      }
    }
  }, [callResult?.logic_gates]);

  // Map logic gates to GOAT steps
  const getLogicGateForStep = (stepKey: string) => {
    if (!callResult.logic_gates) return null;
    return callResult.logic_gates.find((g) => 
      g.name.toLowerCase().includes(stepKey.toLowerCase())
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto pb-24">
      {/* Level Up Cinematic Overlay */}
      {showLevelUp && newLevel && (
        <LevelUpOverlay
          isVisible={showLevelUp}
          newLevel={newLevel}
          levelName={getGauntletLevel(newLevel as any).name}
          masteredGate={masteredGate || undefined}
          onClose={() => {
            setShowLevelUp(false);
            router.push('/gauntlet');
          }}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(gauntletLevel ? '/gauntlet' : '/')}
          className="mb-4 text-gray-400 active:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {gauntletLevel ? 'Back to Gauntlet' : 'Back to Home'}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Call Debrief</h1>
            {gauntletLevel && (
              <div className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50">
                <span className="text-xs font-semibold text-amber-400">
                  Level {gauntletLevel}
                </span>
              </div>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={handleTogglePermanentKnowledge}
              disabled={togglingPermanent}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                isPermanentKnowledge
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
              title={isPermanentKnowledge ? 'Protected from archiving' : 'Click to protect from archiving'}
            >
              {isPermanentKnowledge ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">Protected</span>
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4" />
                  <span className="text-sm">Protect</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Grade Display - "Slamming" animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="flex flex-col items-center justify-center mb-8"
      >
        <motion.div
          className="text-8xl font-bold mb-2"
          style={{
            color: gradeColor,
            textShadow: gradeGlow,
          }}
        >
          {grade}
        </motion.div>
        <div className="text-2xl text-gray-400">{score}/100</div>
      </motion.div>

      {/* Logic Gate Checklist */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6 border border-white/10 mb-6"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <h2 className="text-xl font-semibold mb-4">Logic Gates</h2>
        <div className="space-y-3">
          {GOAT_STEPS.map((step, index) => {
            const gate = getLogicGateForStep(step.key);
            const passed = gate?.passed || false;
            
            return (
              <motion.button
                key={step.key}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => {
                  // Jump to timestamp if available
                  if (gate?.timestamp && callResult.recording_url) {
                    // This would trigger audio jump via AudioPlayer
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span className="text-sm">{step.name}</span>
                {passed ? (
                  <span className="text-2xl text-green-400">✓</span>
                ) : (
                  <span className="text-2xl text-red-400">✗</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Eric's Blunt Coaching */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl p-6 border-2 mb-6"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderColor: gradeColor + '40',
          boxShadow: `0 0 20px ${gradeColor}30`,
        }}
      >
        <div className="text-sm font-semibold mb-3" style={{ color: gradeColor }}>
          Eric's Blunt Coaching
        </div>
        <div className="text-base leading-relaxed font-medium">
          {callResult.feedback || 'No feedback available.'}
        </div>
      </motion.div>

      {/* Rebuttal of the Day */}
      {callResult.rebuttal_of_the_day && callResult.rebuttal_of_the_day !== 'None' && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="rounded-2xl p-6 border border-[#22C55E]/30 mb-6"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#22C55E] font-semibold flex items-center gap-2">
              <span className="text-xl">🔥</span>
              Rebuttal of the Day
            </div>
            {canShare && (
              <button
                onClick={handleShareRebuttal}
                disabled={sharing || shared}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/30 transition-colors flex items-center gap-1"
              >
                {shared ? (
                  <>
                    <Check className="w-3 h-3" />
                    Shared
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" />
                    Share
                  </>
                )}
              </button>
            )}
          </div>
          <div className="text-base italic leading-relaxed">
            "{callResult.rebuttal_of_the_day}"
          </div>
        </motion.div>
      )}

      {/* Audio Player */}
      {/* Script Deviation Analysis */}
      {callResult.script_adherence && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mb-6"
        >
          <DeviationMap
            analysis={callResult.script_adherence}
            callDuration={
              callResult.ended_at && callResult.created_at
                ? Math.floor(
                    (new Date(callResult.ended_at).getTime() -
                      new Date(callResult.created_at).getTime()) /
                      1000
                  )
                : 0
            }
          />
        </motion.div>
      )}

      {callResult.recording_url && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mb-6"
        >
          <AudioPlayer
            recordingUrl={callResult.recording_url}
            transcript={callResult.transcript}
            logicGates={callResult.logic_gates}
          />
        </motion.div>
      )}

      {/* Call to Action Buttons */}
      <div className="space-y-3">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => {
            const mode = callResult.persona_mode || 'acquisition';
            router.push(`/persona-select?mode=${mode}&persona=${callResult.persona_id}`);
          }}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-[#22C55E] text-white active:scale-[0.98] transition-all duration-200 breathing-glow"
        >
          RETRY SCENARIO
        </motion.button>

        {canShare && !shared && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
            onClick={handleShareRebuttal}
            disabled={sharing}
            className="w-full py-4 rounded-2xl font-bold text-lg border-2 border-[#22C55E] text-[#22C55E] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
            }}
          >
            <Share2 className="w-5 h-5" />
            {sharing ? 'Sharing...' : 'Share Rebuttal to Community'}
          </motion.button>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}
