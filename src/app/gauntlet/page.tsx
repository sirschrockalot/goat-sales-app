'use client';

/**
 * The Gauntlet Page
 * Gamified progression system with 5 difficulty levels
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Play, Trophy, Star, TrendingUp, Home, Handshake } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGauntletLevels, isLevelUnlocked, type GauntletLevel } from '@/lib/gauntletLevels';
import ErrorBoundary from '@/components/ErrorBoundary';

type TrainingPath = 'acquisition' | 'disposition';

interface GauntletProgress {
  gauntlet_level: number;
  gauntlet_progress: Record<string, number>;
}

export default function GauntletPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<GauntletProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [selectedPath, setSelectedPath] = useState<TrainingPath>('acquisition');
  const [learningMode, setLearningMode] = useState<boolean>(false);

  const levels = getAllGauntletLevels();
  const userLevel = progress?.gauntlet_level || 1;
  const userProgress = progress?.gauntlet_progress || {};

  useEffect(() => {
    if (!loading && user) {
      fetchProgress();
    }
  }, [user, loading]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProgress({
          gauntlet_level: data.gauntlet_level || 1,
          gauntlet_progress: data.gauntlet_progress || {},
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching gauntlet progress:', error);
      }
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleStartChallenge = async (level: GauntletLevel) => {
    try {
      // Request microphone permission before starting challenge
      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Microphone permission granted');
      }

      // Create assistant for this gauntlet level
      const response = await fetch('/api/vapi/create-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gauntletLevel: level, // Pass gauntlet level instead of difficulty
          personaMode: selectedPath, // Use selected path (acquisition or disposition)
          voiceHintsEnabled: false, // No hints in gauntlet mode
          roleReversal: learningMode, // Enable role reversal in learning mode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assistant');
      }

      const { assistantId } = await response.json();

      // Navigate to live call with gauntlet level, path, and learning mode
      router.push(`/live-call?mode=${selectedPath}&persona=gauntlet-${level}&assistantId=${assistantId}&gauntletLevel=${level}&path=${selectedPath}&learningMode=${learningMode}`);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error starting gauntlet challenge:', error);
      }
      
      // Check if it's a microphone permission error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
      } else {
        alert('Failed to start challenge. Please try again.');
      }
    }
  };

  if (loading || loadingProgress) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-gray-400 active:text-white transition-colors flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl font-bold">The Gauntlet</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Complete challenges with 90+ scores to unlock the next level
          </p>
        </div>

        {/* Path Selection */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setSelectedPath('acquisition')}
            className={`flex-1 rounded-xl p-4 border-2 transition-all ${
              selectedPath === 'acquisition'
                ? 'border-[#22C55E] bg-[#22C55E]/10'
                : 'border-white/10 bg-white/5'
            }`}
            style={{
              boxShadow: selectedPath === 'acquisition' ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Home className={`w-5 h-5 ${selectedPath === 'acquisition' ? 'text-[#22C55E]' : 'text-gray-400'}`} />
              <span className={`font-semibold ${selectedPath === 'acquisition' ? 'text-[#22C55E]' : 'text-gray-400'}`}>
                Acquisitions
              </span>
            </div>
          </button>
          <button
            onClick={() => setSelectedPath('disposition')}
            className={`flex-1 rounded-xl p-4 border-2 transition-all ${
              selectedPath === 'disposition'
                ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                : 'border-white/10 bg-white/5'
            }`}
            style={{
              boxShadow: selectedPath === 'disposition' ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Handshake className={`w-5 h-5 ${selectedPath === 'disposition' ? 'text-[#3B82F6]' : 'text-gray-400'}`} />
              <span className={`font-semibold ${selectedPath === 'disposition' ? 'text-[#3B82F6]' : 'text-gray-400'}`}>
                Dispositions
              </span>
            </div>
          </button>
        </div>

        {/* Learning Mode Toggle */}
        <div className="mb-6 rounded-xl p-4 border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Training Mode</h3>
              <p className="text-xs text-gray-400">
                {learningMode 
                  ? 'Learning Mode: Watch the AI demonstrate perfect script adherence'
                  : 'Practice Mode: You are the acquisition agent'}
              </p>
            </div>
            <button
              onClick={() => setLearningMode(!learningMode)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                learningMode ? 'bg-[#22C55E]' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  learningMode ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <span className={`text-xs px-3 py-1 rounded-full ${
              !learningMode 
                ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50' 
                : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>
              Practice Mode
            </span>
            <span className={`text-xs px-3 py-1 rounded-full ${
              learningMode 
                ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50' 
                : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>
              Learning Mode
            </span>
          </div>
        </div>

        {/* Current Level Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl p-4 mb-6 border border-amber-400/30"
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-400 mb-1">Current Level</div>
              <div className="text-2xl font-bold text-amber-400">Level {userLevel}/5</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Best Scores</div>
              <div className="text-sm font-semibold text-white">
                {Object.keys(userProgress).length > 0
                  ? `${Object.keys(userProgress).length}/5 Completed`
                  : '0/5 Completed'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Level Tower */}
        <div className="flex-1 space-y-4 mb-6">
          {levels.map((level, index) => {
            const unlocked = isLevelUnlocked(
              level.level,
              userLevel,
              userProgress
            );
            const bestScore = userProgress[level.level.toString()] || 0;
            const isCompleted = bestScore >= 90;
            const isCurrent = level.level === userLevel;

            return (
              <motion.div
                key={level.level}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl p-6 border transition-all ${
                  unlocked
                    ? isCurrent
                      ? 'border-[#22C55E]/50 bg-[#22C55E]/10'
                      : isCompleted
                      ? 'border-amber-400/50 bg-amber-400/10'
                      : 'border-white/20 bg-white/5'
                    : 'border-gray-700/50 bg-gray-900/30 opacity-60'
                }`}
                style={{
                  boxShadow: unlocked
                    ? isCurrent
                      ? '0 0 20px rgba(34, 197, 94, 0.3)'
                      : isCompleted
                      ? '0 0 20px rgba(251, 191, 36, 0.3)'
                      : 'none'
                    : 'none',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {unlocked ? (
                        isCompleted ? (
                          <Trophy className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Star className="w-6 h-6 text-[#22C55E]" />
                        )
                      ) : (
                        <Lock className="w-6 h-6 text-gray-500" />
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Level {level.level}: {level.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {level.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Info */}
                {unlocked && bestScore > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Best Score</span>
                      <span
                        className={`font-bold ${
                          bestScore >= 90 ? 'text-[#22C55E]' : 'text-amber-400'
                        }`}
                      >
                        {bestScore}/100
                      </span>
                    </div>
                    {bestScore >= 90 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-[#22C55E]">
                        <TrendingUp className="w-4 h-4" />
                        <span>Level Completed!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {unlocked ? (
                  <button
                    onClick={() => handleStartChallenge(level.level)}
                    className="w-full py-3 rounded-lg font-semibold text-white transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: isCurrent
                        ? '#22C55E'
                        : isCompleted
                        ? 'rgba(251, 191, 36, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                      border: `2px solid ${
                        isCurrent
                          ? '#22C55E'
                          : isCompleted
                          ? 'rgba(251, 191, 36, 0.5)'
                          : 'rgba(34, 197, 94, 0.5)'
                      }`,
                      boxShadow: isCurrent
                        ? '0 0 20px rgba(34, 197, 94, 0.5)'
                        : 'none',
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Play className="w-5 h-5" />
                      <span>
                        {isCompleted ? 'Replay Challenge' : 'Start Challenge'}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center gap-2 text-gray-500">
                    <Lock className="w-5 h-5" />
                    <span>90+ Score Required</span>
                  </div>
                )}

                {/* Difficulty Indicators */}
                <div className="mt-4 flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < level.level
                          ? 'bg-[#22C55E]'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-2">How The Gauntlet Works</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Complete each level with a 90+ Goat Score to unlock the next</li>
            <li>• Each level increases in difficulty and resistance</li>
            <li>• Level 5 (The Goat) is the ultimate challenge</li>
            <li>• Your best score for each level is saved</li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  );
}
