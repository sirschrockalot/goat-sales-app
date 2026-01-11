'use client';

/**
 * Transcription Display Component
 * Shows real-time transcription of what the AI is hearing and saying
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';
import { Mic, MicOff, Loader2, User, Bot } from 'lucide-react';

interface TranscriptionDisplayProps {
  className?: string;
}

export default function TranscriptionDisplay({ className = '' }: TranscriptionDisplayProps) {
  const { transcriptionHistory, isActive, callStatus } = useVapi();
  const [isListening, setIsListening] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the latest user and assistant messages
  const userMessages = transcriptionHistory.filter((e) => e.role === 'user');
  const assistantMessages = transcriptionHistory.filter((e) => e.role === 'assistant');
  const latestUserMessage = userMessages[userMessages.length - 1];
  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];

  // Detect if AI is "thinking" (no recent assistant messages but call is active)
  const isAIThinking = isActive && 
    callStatus.status === 'connected' && 
    (!latestAssistantMessage || Date.now() - latestAssistantMessage.timestamp > 3000);

  // Track listening state (user is speaking)
  useEffect(() => {
    if (!isActive) {
      setIsListening(false);
      return;
    }

    // Check if there's a recent user message (within last 2 seconds)
    if (latestUserMessage && Date.now() - latestUserMessage.timestamp < 2000) {
      setIsListening(true);
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set listening to false after 2 seconds of no new messages
      timeoutRef.current = setTimeout(() => {
        setIsListening(false);
      }, 2000);
    } else {
      setIsListening(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latestUserMessage, isActive]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptionHistory]);

  // Update last update time when transcription changes
  useEffect(() => {
    if (transcriptionHistory.length > 0) {
      setLastUpdateTime(Date.now());
    }
  }, [transcriptionHistory]);

  if (!isActive || callStatus.status === 'idle') {
    return null;
  }

  return (
    <div className={`rounded-xl p-4 border backdrop-blur-sm ${className}`} style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Live Transcription</h3>
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic className="w-4 h-4 text-green-400" />
            </motion.div>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {transcriptionHistory.length} messages
        </div>
      </div>

      {/* Transcription Messages */}
      <div 
        ref={scrollRef}
        className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar"
        style={{ maxHeight: '16rem' }}
      >
        <AnimatePresence>
          {transcriptionHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <MicOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>Waiting for conversation to start...</div>
            </div>
          ) : (
            transcriptionHistory.map((event, index) => {
              const isUser = event.role === 'user';
              const isLatest = index === transcriptionHistory.length - 1;
              
              return (
                <motion.div
                  key={`${event.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    isUser 
                      ? 'bg-blue-500/10 border border-blue-500/20' 
                      : 'bg-purple-500/10 border border-purple-500/20'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isUser ? 'bg-blue-500/20' : 'bg-purple-500/20'
                  }`}>
                    {isUser ? (
                      <User className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{
                        color: isUser ? '#60A5FA' : '#A78BFA'
                      }}>
                        {isUser ? 'You' : 'AI'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`text-sm leading-relaxed ${
                      isLatest ? 'text-white font-medium' : 'text-gray-300'
                    }`}>
                      {event.transcript}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* AI Thinking Indicator */}
        {isAIThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-purple-400 mb-1">AI</div>
              <div className="text-sm text-gray-400 italic">
                Processing... (AI is thinking or didn't hear you clearly)
              </div>
            </div>
          </motion.div>
        )}

        {/* Listening Indicator */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <Mic className="w-3.5 h-3.5 text-green-400" />
            </motion.div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-green-400 mb-1">Listening...</div>
              <div className="text-sm text-gray-400">
                AI is hearing you speak
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Footer */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            callStatus.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span className="text-gray-400 capitalize">{callStatus.status}</span>
        </div>
        {lastUpdateTime && (
          <span className="text-gray-500">
            Last update: {new Date(lastUpdateTime).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
