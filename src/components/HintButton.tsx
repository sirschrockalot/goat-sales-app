'use client';

/**
 * Hint Button Component
 * Shows a hint button that searches for relevant Eric Cline responses
 */

import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';

interface Hint {
  id: string;
  content: string;
  context?: string;
  source?: string;
}

export default function HintButton() {
  const { transcript, isActive } = useVapi();
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [showHint, setShowHint] = useState(false);

  const fetchHint = async () => {
    if (!transcript || transcript.trim().length < 10) {
      // Need some context to search
      return;
    }

    setIsLoading(true);
    setShowHint(true);

    try {
      // Use the last 200 characters of transcript as context
      const query = transcript.slice(-200);
      
      const response = await fetch('/api/hints/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hints && data.hints.length > 0) {
          // Handle different response formats
          const hint = data.hints[0];
          setHint({
            id: hint.id || 'hint-1',
            content: hint.content || hint.response || hint.text || hint.rebuttal || 'No content available',
            context: hint.context || hint.situation,
            source: hint.source || 'Eric Cline',
          });
        } else {
          setHint({
            id: 'no-hint',
            content: 'No relevant hint found. Keep practicing!',
          });
        }
      } else {
        setHint({
          id: 'error',
          content: 'Unable to fetch hint. Try again later.',
        });
      }
    } catch (error) {
      console.error('Error fetching hint:', error);
      setHint({
        id: 'error',
        content: 'Error loading hint. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeHint = () => {
    setShowHint(false);
    setHint(null);
  };

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Hint Button */}
      <button
        onClick={fetchHint}
        disabled={isLoading || !transcript || transcript.trim().length < 10}
        className={`
          fixed bottom-24 right-6 z-50
          w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-200
          active:scale-95
          ${isLoading || !transcript || transcript.trim().length < 10
            ? 'bg-gray-600 opacity-50 cursor-not-allowed'
            : 'bg-[#22C55E] hover:bg-[#16a34a] cursor-pointer'
          }
        `}
        style={{
          boxShadow: isLoading || !transcript || transcript.trim().length < 10
            ? 'none'
            : '0 0 20px rgba(34, 197, 94, 0.5)'
        }}
        aria-label="Get hint"
        title={!transcript || transcript.trim().length < 10 ? 'Need more conversation context' : 'Get a hint'}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Lightbulb className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Hint Modal */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 right-6 z-50 w-80 max-w-[calc(100vw-3rem)]"
          >
            <div
              className="rounded-2xl p-6 border border-[#22C55E]/30 backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(11, 14, 20, 0.95)',
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#22C55E]" />
                  <h3 className="text-lg font-semibold text-white">💡 Hint</h3>
                </div>
                <button
                  onClick={closeHint}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close hint"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hint Content */}
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Finding the perfect response...</div>
                </div>
              ) : hint ? (
                <div>
                  <div className="text-sm text-gray-300 leading-relaxed mb-3">
                    {hint.content}
                  </div>
                  {hint.context && (
                    <div className="text-xs text-gray-500 italic mt-2">
                      Context: {hint.context}
                    </div>
                  )}
                  {hint.source && (
                    <div className="text-xs text-gray-500 mt-1">
                      Source: {hint.source}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Click the hint button to get help
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
