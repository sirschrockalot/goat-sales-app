'use client';

/**
 * Level-Up Cinematic Overlay
 * Full-screen celebration with glitch-glow animation and confetti
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, Zap } from 'lucide-react';

interface LevelUpOverlayProps {
  isVisible: boolean;
  newLevel: number;
  levelName: string;
  masteredGate?: string;
  onClose: () => void;
}

export default function LevelUpOverlay({
  isVisible,
  newLevel,
  levelName,
  masteredGate,
  onClose,
}: LevelUpOverlayProps) {
  const [confettiFired, setConfettiFired] = useState(false);

  useEffect(() => {
    if (isVisible && !confettiFired) {
      // Fire confetti burst
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Emerald green confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#10b981', '#22c55e', '#34d399'],
        });

        // Amber confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
        });
      }, 250);

      // Fireworks burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#ffffff'],
        });
      }, 500);

      setConfettiFired(true);
    }
  }, [isVisible, confettiFired]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        {/* Glitch-Glow Background Effect */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Main Content Card */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            rotate: [180, 0],
            opacity: 1,
          }}
          exit={{ scale: 0, rotate: 180, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
          className="relative z-10 max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Screen Shake Effect */}
          <motion.div
            animate={{
              x: [0, -10, 10, -10, 10, 0],
              y: [0, -10, 10, -10, 10, 0],
            }}
            transition={{
              duration: 0.5,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            }}
            className="rounded-2xl p-8 border-2 border-emerald-400"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              boxShadow: '0 0 60px rgba(16, 185, 129, 0.8), 0 0 120px rgba(245, 158, 11, 0.4)',
            }}
          >
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -360 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <Trophy className="w-24 h-24 text-amber-400" />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  className="absolute inset-0"
                >
                  <Sparkles className="w-24 h-24 text-emerald-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Level Text */}
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-6xl font-bold text-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(16, 185, 129, 0.5)',
              }}
            >
              LEVEL {newLevel}
            </motion.h1>

            {/* Level Name */}
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-2xl font-semibold text-center text-white mb-6"
            >
              {levelName}
            </motion.h2>

            {/* Mastered Gate */}
            {masteredGate && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: 'spring' }}
                className="rounded-lg p-4 mb-6 border border-emerald-400/50"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-semibold">MASTERED: {masteredGate.toUpperCase()}</span>
                </div>
              </motion.div>
            )}

            {/* Continue Button */}
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1 }}
              onClick={onClose}
              className="w-full py-4 rounded-lg font-bold text-lg text-white transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)',
              }}
            >
              CONTINUE
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
