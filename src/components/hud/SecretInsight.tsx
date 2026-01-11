'use client';

/**
 * SecretInsight Component
 * Displays "eavesdropped" private dialogue from the seller during hold
 * Shows a whisper icon with transcription and warning label
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ear, AlertTriangle, Eye } from 'lucide-react';

interface SecretInsightProps {
  transcript: string;
  isOnHold: boolean;
}

interface SecretInsight {
  type: 'spouse' | 'debt' | 'anchor';
  text: string;
  detectedAt: number;
}

const SECRET_INSIGHT_PATTERNS = [
  {
    type: 'spouse' as const,
    keywords: ['spouse', 'wife', 'husband', 'partner', 'honey', 'we need the cash', 'move', 'kids'],
    phrases: [
      'I think we should just take it',
      'we need the cash',
      'should we just accept',
      'kids need to start',
    ],
  },
  {
    type: 'debt' as const,
    keywords: ['foreclosure', 'bank', 'mortgage', 'close by', 'running out of time', 'payment is due'],
    phrases: [
      'bank is going to start',
      'foreclosure',
      'running out of time',
      'don\'t have it',
    ],
  },
  {
    type: 'anchor' as const,
    keywords: ['I told them', 'but I\'d honestly take', 'maybe I was asking too much', 'should actually accept'],
    phrases: [
      'I told them $',
      'but I\'d honestly take',
      'maybe I was asking',
      'should actually accept',
    ],
  },
];

export default function SecretInsight({ transcript, isOnHold }: SecretInsightProps) {
  const [detectedInsight, setDetectedInsight] = useState<SecretInsight | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOnHold || !transcript) {
      // Reset when not on hold
      setIsVisible(false);
      return;
    }

    // Wait 3 seconds after hold starts before detecting private dialogue
    const checkTimer = setTimeout(() => {
      // Check for secret insight patterns in transcript
      const lowerTranscript = transcript.toLowerCase();
      
      for (const pattern of SECRET_INSIGHT_PATTERNS) {
        // Check for keywords
        const hasKeyword = pattern.keywords.some(keyword => 
          lowerTranscript.includes(keyword.toLowerCase())
        );
        
        // Check for phrases
        const hasPhrase = pattern.phrases.some(phrase => 
          lowerTranscript.includes(phrase.toLowerCase())
        );

        if (hasKeyword || hasPhrase) {
          // Extract the relevant sentence containing the insight
          const sentences = transcript.split(/[.!?]+/);
          const relevantSentence = sentences.find(sentence => {
            const lower = sentence.toLowerCase();
            return pattern.keywords.some(kw => lower.includes(kw.toLowerCase())) ||
                   pattern.phrases.some(p => lower.includes(p.toLowerCase()));
          });

          if (relevantSentence) {
            setDetectedInsight({
              type: pattern.type,
              text: relevantSentence.trim(),
              detectedAt: Date.now(),
            });
            setIsVisible(true);
            break;
          }
        }
      }
    }, 3000); // Wait 3 seconds after hold

    return () => clearTimeout(checkTimer);
  }, [transcript, isOnHold]);

  if (!isVisible || !detectedInsight) return null;

  const getInsightLabel = (type: string) => {
    switch (type) {
      case 'spouse':
        return 'The Spouse';
      case 'debt':
        return 'The Debt';
      case 'anchor':
        return 'The Anchor';
      default:
        return 'Secret Insight';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'spouse':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'debt':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30';
      case 'anchor':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`rounded-xl border-2 bg-gradient-to-br ${getInsightColor(detectedInsight.type)} p-4 shadow-lg backdrop-blur-sm`}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full bg-yellow-500/20 p-2"
              >
                <Ear className="w-4 h-4 text-yellow-400" />
              </motion.div>
              <div>
                <h4 className="text-sm font-bold text-white">{getInsightLabel(detectedInsight.type)}</h4>
                <p className="text-xs text-gray-400">Private Dialogue Detected</p>
              </div>
            </div>
            <Eye className="w-4 h-4 text-yellow-400" />
          </div>

          {/* Warning Label */}
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">
              EAVESDROPPING: USE THIS INFO DISCREETLY
            </span>
          </div>

          {/* Secret Insight Text */}
          <div className="rounded-lg bg-black/30 p-3">
            <p className="text-sm italic text-gray-200 leading-relaxed">
              "{detectedInsight.text}"
            </p>
          </div>

          {/* Hint */}
          <div className="mt-3 text-xs text-gray-400">
            💡 Use this information subtly in your negotiation without revealing you heard it
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
