'use client';

/**
 * Live Call Screen
 * Matches the mockup exactly with AI dialogue, waveform, and gauges
 * Uses exact colors and spacing from UI_SPEC.md
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVapi } from '@/contexts/VapiContext';
import AudioWaveform from '@/components/AudioWaveform';
import LiveCallHUD from '@/components/LiveCallHUD';
import GoatHint from '@/components/call/GoatHint';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { PersonaMode } from '@/lib/vapi-client';

const PERSONA_NAMES: Record<string, string> = {
  skeptic: 'The Skeptic',
  'busy-professional': 'The Busy Professional',
  'savvy-shopper': 'The Savvy Shopper',
  analyst: 'The Analyst',
  'portfolio-manager': 'Portfolio Manager',
  'new-investor': 'New Investor',
};

export default function LiveCallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'acquisition') as PersonaMode;
  const personaId = searchParams.get('persona') || 'skeptic';
  const personaName = PERSONA_NAMES[personaId] || 'AI Partner';

  const { 
    callStatus, 
    transcript, 
    transcriptionHistory, 
    isActive,
    initialize, 
    startCall, 
    endCall 
  } = useVapi();

  const [aiMessage, setAiMessage] = useState("I don't know, your offer sounds too low...");

  // Update AI message from latest assistant transcription
  useEffect(() => {
    const lastAssistantMessage = [...transcriptionHistory]
      .reverse()
      .find((e) => e.role === 'assistant');
    if (lastAssistantMessage) {
      setAiMessage(lastAssistantMessage.transcript);
    }
  }, [transcriptionHistory]);

  // Handle call end navigation
  // Note: In production, the webhook will process the call and create the record
  // We'll navigate to the call result page once the webhook completes
  useEffect(() => {
    if (callStatus.status === 'ended') {
      // Check if this is a gauntlet call
      const gauntletLevel = searchParams.get('gauntletLevel');
      
      setTimeout(() => {
        if (gauntletLevel) {
          // For gauntlet calls, evaluate and show result
          router.push(`/debrief?mode=${mode}&persona=${personaId}&gauntletLevel=${gauntletLevel}`);
        } else {
          router.push(`/debrief?mode=${mode}&persona=${personaId}`);
        }
      }, 2000);
    }
  }, [callStatus.status, router, mode, personaId, searchParams]);

  // Auto-initialize and start call when component mounts
  useEffect(() => {
    const initAndStart = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        const assistantId = searchParams.get('assistantId');
        const gauntletLevel = searchParams.get('gauntletLevel');
        
        if (apiKey) {
          // If gauntlet level is provided, use the pre-created assistant
          if (gauntletLevel && assistantId) {
            await initialize(apiKey, mode, assistantId);
          } else {
            await initialize(apiKey, mode);
          }
          
          // Small delay before starting call
          setTimeout(() => {
            startCall().catch((error) => {
              // Error handled by ErrorBoundary
              if (process.env.NODE_ENV === 'development') {
                console.error('Failed to start call:', error);
              }
            });
          }, 500);
        }
      } catch (error) {
        // Error handled by ErrorBoundary
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to initialize/start call:', error);
        }
      }
    };

    initAndStart();
  }, [mode, initialize, startCall, searchParams]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto">
        {/* AI Dialogue Bubble */}
        <div className="mb-6">
          <div 
            className="rounded-2xl p-4 border border-white/10"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <div className="text-xs text-gray-400 mb-1">AI</div>
            <div className="text-sm leading-relaxed">{aiMessage}</div>
          </div>
        </div>

        {/* Call Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold">Live Call: {personaName}</h2>
        </div>

        {/* Audio Waveform - Center of screen */}
        <div className="flex-1 flex items-center justify-center mb-8 min-h-[120px]">
          <AudioWaveform isActive={isActive} intensity={0.7} />
        </div>

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-red-500 text-white active:scale-[0.98] transition-all duration-200 mb-6"
        >
          END CALL
        </button>

        {/* Live Call HUD with animated gauges */}
        <ErrorBoundary>
          <LiveCallHUD />
        </ErrorBoundary>

        {/* GOAT Hint Component */}
        <ErrorBoundary>
          <GoatHint />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
