'use client';

/**
 * Voice Coach Component
 * Toggle for dual-mode AI coaching (Seller + Voice Hints)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';
import { useVoiceHints } from '@/hooks/useVoiceHints';

interface VoiceCoachProps {
  difficulty?: number;
  className?: string;
}

export default function VoiceCoach({ difficulty = 5, className = '' }: VoiceCoachProps) {
  const { isActive, callId } = useVapi();
  const { voiceHintsEnabled, setVoiceHintsEnabled, sendVoiceHint } = useVoiceHints(isActive || false);
  
  const [coachMode, setCoachMode] = useState<'seller-only' | 'dual-mode'>('seller-only');
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    
    if (coachMode === 'seller-only') {
      // Switching to dual mode
      setCoachMode('dual-mode');
      setVoiceHintsEnabled(true);
      
      // Send welcome message
      if (callId) {
        await sendVoiceHint(
          "Voice Coach activated. I'll continue as the seller, but I'll give you hints if you miss a script gate."
        );
      }
    } else {
      // Switching back to seller-only
      setCoachMode('seller-only');
      setVoiceHintsEnabled(false);
    }
    
    setTimeout(() => setIsToggling(false), 500);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-4 border border-white/10"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-sm font-semibold text-white">AI Voice Coach</h3>
          </div>
          <div className="text-xs text-gray-400">
            Difficulty: {difficulty}/10
          </div>
        </div>

        <div className="space-y-3">
          {/* Mode Toggle */}
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
              coachMode === 'dual-mode'
                ? 'bg-[#22C55E]/20 border-[#22C55E]/50'
                : 'bg-white/5 border-white/10'
            }`}
            style={{
              boxShadow: coachMode === 'dual-mode' ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              {coachMode === 'dual-mode' ? (
                <Mic className="w-5 h-5 text-[#22C55E]" />
              ) : (
                <MicOff className="w-5 h-5 text-gray-400" />
              )}
              <div className="text-left">
                <div className="text-sm font-semibold text-white">
                  {coachMode === 'dual-mode' ? 'Dual Mode ON' : 'Seller Only'}
                </div>
                <div className="text-xs text-gray-400">
                  {coachMode === 'dual-mode'
                    ? 'AI gives voice hints when gates are missed'
                    : 'AI acts only as seller'}
                </div>
              </div>
            </div>
            <motion.div
              animate={{
                scale: isToggling ? 0.9 : 1,
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                coachMode === 'dual-mode' ? 'bg-[#22C55E]' : 'bg-gray-600'
              }`}
            >
              <motion.div
                animate={{
                  x: coachMode === 'dual-mode' ? 24 : 0,
                }}
                className="w-4 h-4 bg-white rounded-full"
              />
            </motion.div>
          </button>

          {/* Status Indicator */}
          {coachMode === 'dual-mode' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30">
                <div className="text-xs text-[#22C55E] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>Voice hints will trigger if you miss script gates</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info Text */}
          <div className="text-xs text-gray-500 leading-relaxed">
            {coachMode === 'dual-mode' ? (
              <>
                The AI will continue playing the seller role, but will break character to give you
                voice coaching hints if you skip critical script gates or get stuck.
              </>
            ) : (
              <>
                The AI acts only as the seller persona. No coaching hints will be provided.
                Switch to Dual Mode to enable voice hints.
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
