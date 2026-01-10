'use client';

/**
 * Goat Hint Component
 * AI-powered rebuttal hints based on the AI customer's current objection
 * Uses embeddings and similarity search to find relevant Eric Cline responses
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Copy, Check, Sparkles } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';
import { useSearchParams } from 'next/navigation';

interface RebuttalResult {
  id: string;
  rebuttal_text: string;
  context?: string;
  similarity?: number;
}

interface SearchResponse {
  results: RebuttalResult[];
  query?: string;
}

export default function GoatHint() {
  const { transcriptionHistory, isActive, personaMode } = useVapi();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || personaMode || 'acquisition';

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RebuttalResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastSearchedMessage, setLastSearchedMessage] = useState<string>('');

  // Get the latest AI message from transcript
  const getLatestAIMessage = (): string => {
    if (!transcriptionHistory || transcriptionHistory.length === 0) {
      return '';
    }

    // Find the most recent assistant message
    const aiMessages = transcriptionHistory
      .filter((event) => event.role === 'assistant')
      .reverse();

    if (aiMessages.length > 0) {
      return aiMessages[0].transcript;
    }

    return '';
  };

  // Search for rebuttals
  const searchRebuttals = async () => {
    const latestMessage = getLatestAIMessage();

    if (!latestMessage || latestMessage.trim().length < 10) {
      // Not enough context yet
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    setLastSearchedMessage(latestMessage);

    try {
      const response = await fetch('/api/rebuttals/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: latestMessage,
          limit: 3,
        }),
      });

      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data.results || []);
      } else {
        console.error('Failed to search rebuttals');
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching rebuttals:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy rebuttal to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Determine accent color based on mode
  const accentColor = mode === 'acquisition' ? '#22C55E' : '#3B82F6';
  const accentColorRgba = mode === 'acquisition' 
    ? 'rgba(34, 197, 94, 0.5)' 
    : 'rgba(59, 130, 246, 0.5)';
  const accentColorRgbaLight = mode === 'acquisition'
    ? 'rgba(34, 197, 94, 0.1)'
    : 'rgba(59, 130, 246, 0.1)';
  const accentColorRgbaBorder = mode === 'acquisition'
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(59, 130, 246, 0.3)';

  if (!isActive) {
    return null;
  }

  const latestMessage = getLatestAIMessage();
  const hasContext = latestMessage && latestMessage.trim().length >= 10;

  return (
    <>
      {/* Hint Button */}
      <motion.button
        onClick={searchRebuttals}
        disabled={isLoading || !hasContext}
        className={`
          fixed bottom-24 right-6 z-50
          w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-200
          active:scale-95
          ${isLoading || !hasContext
            ? 'bg-gray-600 opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
          }
        `}
        style={{
          backgroundColor: isLoading || !hasContext ? undefined : accentColor,
          boxShadow: isLoading || !hasContext ? 'none' : `0 0 20px ${accentColorRgba}`,
        }}
        whileHover={!isLoading && hasContext ? { scale: 1.05 } : {}}
        whileTap={!isLoading && hasContext ? { scale: 0.95 } : {}}
        aria-label="Get GOAT hint"
        title={!hasContext ? 'Need more conversation context' : 'Get AI-powered rebuttal hints'}
      >
        {isLoading ? (
          <div 
            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
        ) : (
          <Lightbulb className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Hint Card Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Hint Card */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
            >
              <div
                className="rounded-t-2xl border-t border-l border-r backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(11, 14, 20, 0.95)',
                  borderColor: accentColorRgbaBorder,
                  boxShadow: `0 -10px 40px ${accentColorRgba}`,
                }}
              >
                {/* Header */}
                <div className="p-6 border-b" style={{ borderColor: accentColorRgbaBorder }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: accentColorRgbaLight }}
                      >
                        <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">GOAT Hint</h3>
                        <p className="text-xs text-gray-400">Eric Cline's best responses</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Close hint"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {lastSearchedMessage && (
                    <div className="mt-3 p-2 rounded-lg text-xs text-gray-300 italic bg-white/5">
                      "{lastSearchedMessage.substring(0, 100)}
                      {lastSearchedMessage.length > 100 ? '...' : ''}"
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div
                        className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: accentColor }}
                      />
                      <div className="text-sm text-gray-400">
                        Finding the perfect Eric Cline response...
                      </div>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl border"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderColor: accentColorRgbaBorder,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="text-xs font-semibold px-2 py-1 rounded"
                                  style={{
                                    backgroundColor: accentColorRgbaLight,
                                    color: accentColor,
                                  }}
                                >
                                  Hint #{index + 1}
                                </span>
                                {result.similarity && (
                                  <span className="text-xs text-gray-500">
                                    {Math.round(result.similarity * 100)}% match
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-200 leading-relaxed">
                                {result.rebuttal_text}
                              </p>
                              {result.context && (
                                <p className="text-xs text-gray-500 italic mt-2">
                                  Context: {result.context}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => copyToClipboard(result.rebuttal_text, result.id)}
                              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                              style={{ color: accentColor }}
                              aria-label="Copy to clipboard"
                            >
                              {copiedId === result.id ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Copy className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">No hints found</div>
                      <div className="text-xs text-gray-500">
                        Try continuing the conversation to get better context
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="p-4 border-t text-center"
                  style={{ borderColor: accentColorRgbaBorder }}
                >
                  <p className="text-xs text-gray-500">
                    Based on Eric Cline's Sales Goat Framework
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Copy Toast */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-32 right-6 z-50 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: accentColor,
              color: 'white',
              boxShadow: `0 0 20px ${accentColorRgba}`,
            }}
          >
            Copied to clipboard! ✓
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
