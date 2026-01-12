'use client';

/**
 * Live Call Screen
 * Matches the mockup exactly with AI dialogue, waveform, and gauges
 * Uses exact colors and spacing from UI_SPEC.md
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVapi } from '@/contexts/VapiContext';
import AudioWaveform from '@/components/AudioWaveform';
import LiveCallHUD from '@/components/LiveCallHUD';
import TranscriptionDisplay from '@/components/call/TranscriptionDisplay';
import GoatHint from '@/components/call/GoatHint';
import LearningModeHUD from '@/components/hud/LearningModeHUD';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { PersonaMode } from '@/lib/vapi-client';
import { useAmbientNoise } from '@/hooks/useAmbientNoise';

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
  const roleReversal = searchParams.get('roleReversal') === 'true' || searchParams.get('learningMode') === 'true';
  const learningMode = searchParams.get('learningMode') === 'true';
  const personaName = PERSONA_NAMES[personaId] || 'AI Partner';
  const exitStrategy = (searchParams.get('exitStrategy') || 'fix_and_flip') as 'fix_and_flip' | 'buy_and_hold' | 'creative_finance';
  const gauntletLevelParam = searchParams.get('gauntletLevel');
  const gauntletLevel = gauntletLevelParam ? parseInt(gauntletLevelParam, 10) : undefined;

  const { 
    callStatus, 
    transcript, 
    transcriptionHistory, 
    isActive,
    initialize, 
    startCall, 
    endCall 
  } = useVapi();

  // Play ambient noise during active calls
  useAmbientNoise(isActive);

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
  // Analysis phase disabled - redirect to home screen
  useEffect(() => {
    if (callStatus.status === 'ended') {
      // Navigate back to home screen after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  }, [callStatus.status, router]);

  // Request microphone permission when page loads (before starting call)
  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        if (typeof window !== 'undefined' && navigator.mediaDevices) {
          // Request microphone permission early
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately - we just needed permission
          stream.getTracks().forEach(track => track.stop());
          console.log('✅ Microphone permission granted');
        }
      } catch (error) {
        console.error('❌ Microphone permission denied:', error);
        // Show user-friendly error message
        alert('Microphone access is required for voice calls. Please allow microphone access and refresh the page.');
        // Navigate back to persona select
        router.push(`/persona-select?mode=${mode}`);
      }
    };

    requestMicrophonePermission();
  }, [router, mode]);

  // Auto-initialize and start call when component mounts
  // Use a ref to prevent multiple initializations
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Prevent multiple initializations (React StrictMode runs effects twice in dev)
    if (hasInitialized.current) {
      return;
    }

    const initAndStart = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        const assistantId = searchParams.get('assistantId');
        
        if (apiKey) {
          // Mark as initialized immediately to prevent duplicate calls
          hasInitialized.current = true;
          
          // Determine which assistant ID to use
          let finalAssistantId = assistantId;
          
          // If no assistantId in URL, try to use environment variable for acquisitions
          // Note: ACQUISITIONS_ASSISTANT_ID is server-side only, so we need to fetch it via API
          // For now, we'll rely on the create-assistant API to handle this
          
          // If still no assistantId, we need to create one or get it from API
          if (!finalAssistantId) {
            // Try to create or get assistant via API
            try {
              // Get session token for authentication
              const { createSupabaseClient } = await import('@/lib/supabase');
              const supabase = createSupabaseClient();
              const { data: { session } } = await supabase.auth.getSession();
              const accessToken = session?.access_token;

              const headers: HeadersInit = {
                'Content-Type': 'application/json',
              };

              // Include access token in Authorization header if available
              if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
              }

              // Get propertyLocation from URL params if provided
              const propertyLocationParam = searchParams.get('propertyLocation');
              
              const response = await fetch('/api/vapi/create-assistant', {
                method: 'POST',
                headers,
                credentials: 'include', // Also send cookies
                body: JSON.stringify({
                  personaMode: mode,
                  gauntletLevel: gauntletLevel,
                  // If no gauntletLevel, provide a default difficulty (medium)
                  difficulty: gauntletLevel ? undefined : 5,
                  roleReversal: roleReversal,
                  exitStrategy: exitStrategy,
                  ...(propertyLocationParam && { propertyLocation: propertyLocationParam }),
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                finalAssistantId = data.assistantId;
              } else if (response.status === 401) {
                console.error('Unauthorized: Please log in to create assistants');
                hasInitialized.current = false; // Reset on auth error
                throw new Error('Authentication required to create assistant');
              } else {
                // Try to parse error response
                let errorData: any;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  try {
                    errorData = await response.json();
                  } catch (e) {
                    errorData = { error: 'Failed to parse error response' };
                  }
                } else {
                  const errorText = await response.text();
                  errorData = { 
                    error: errorText || 'Unknown error',
                    status: response.status,
                    statusText: response.statusText
                  };
                }
                console.error('Failed to create assistant - Full error data:', JSON.stringify(errorData, null, 2));
                // Build a more descriptive error message
                // Priority: message > error > details > full object > status
                let errorMessage: string;
                if (errorData.message) {
                  errorMessage = errorData.message;
                } else if (errorData.error) {
                  errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
                } else if (errorData.details) {
                  errorMessage = typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details);
                } else if (typeof errorData === 'string') {
                  errorMessage = errorData;
                } else if (Object.keys(errorData).length > 0) {
                  errorMessage = JSON.stringify(errorData);
                } else {
                  errorMessage = `HTTP ${response.status} ${response.statusText || 'Unknown error'}`;
                }
                hasInitialized.current = false; // Reset on error
                throw new Error(`Failed to create assistant: ${errorMessage}`);
              }
            } catch (error) {
              console.error('Failed to get/create assistant:', error);
              hasInitialized.current = false; // Reset on error
              throw error;
            }
          }
          
          if (!finalAssistantId) {
            hasInitialized.current = false; // Reset on error
            throw new Error('Assistant ID is required. Please provide assistantId in URL or configure ACQUISITIONS_ASSISTANT_ID.');
          }
          
          // Verify assistant exists and is ready before starting
          try {
            const verifyResponse = await fetch(`/api/vapi/verify-assistant?assistantId=${finalAssistantId}`, {
              method: 'GET',
              credentials: 'include',
            });
            
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('Assistant verification:', verifyData);
              
              if (!verifyData.exists) {
                throw new Error('Assistant not found. Please try creating a new call.');
              }
              
              if (!verifyData.published && verifyData.error) {
                console.warn('⚠️ Assistant exists but may have issues:', verifyData.error);
                // Still try to start - sometimes assistants work even if not marked as published
              }
            }
          } catch (verifyError) {
            console.warn('Could not verify assistant (will still attempt to start):', verifyError);
            // Continue anyway - verification is optional
          }
          
          // Initialize with the assistant ID
          await initialize(apiKey, mode, finalAssistantId);
          
          // Wait longer for the assistant to be fully ready
          // Newly created assistants need time to be published and available
          console.log('Waiting for assistant to be ready...', { assistantId: finalAssistantId });
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds
          
          try {
            console.log('Starting call with assistant:', finalAssistantId);
            await startCall();
            console.log('✅ Call started successfully');
          } catch (error: any) {
            // Handle specific errors with detailed logging
            const errorMessage = error?.message || String(error) || '';
            const errorDetails = {
              error,
              message: errorMessage,
              assistantId: finalAssistantId,
              timestamp: new Date().toISOString(),
            };
            
            console.error('❌ Call start failed:', errorDetails);
            
            if (errorMessage.includes('ejection') || errorMessage.includes('Meeting has ended')) {
              console.error('🚨 Call ejection detected - possible causes:', {
                '1. Assistant not published': 'The assistant may not be published yet',
                '2. Voice configuration issue': 'The voice ID may not be accessible',
                '3. Timing issue': 'The assistant was just created and needs more time',
                '4. Network issue': 'Connection problem with Vapi',
                assistantId: finalAssistantId,
                suggestion: 'Wait 5-10 seconds after assistant creation before starting call',
              });
              
              // Show user-friendly error and allow retry
              alert('Call failed to start. The assistant may need more time to be ready. Please wait a few seconds and try again.');
              hasInitialized.current = false; // Allow retry
              return; // Don't throw - allow user to retry
            } else {
              // Re-throw other errors to be handled by ErrorBoundary
              throw error;
            }
          }
        }
      } catch (error) {
        // Error handled by ErrorBoundary
        hasInitialized.current = false; // Reset on error to allow retry
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to initialize/start call:', error);
        }
      }
    };

    initAndStart();
    // Only depend on values that should trigger re-initialization, not functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, searchParams]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white pb-24">
        <div className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-3">
          {/* AI Dialogue Bubble */}
          <div>
            <div 
              className="rounded-xl p-3 border border-white/10"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <div className="text-xs text-gray-400 mb-1">AI</div>
              <div className="text-sm leading-relaxed">{aiMessage}</div>
            </div>
          </div>

          {/* Call Title */}
          <div className="text-center">
            <h2 className="text-lg font-semibold">Live Call: {personaName}</h2>
          </div>

          {/* Audio Waveform - Center of screen */}
          <div className="flex items-center justify-center min-h-[80px] py-2">
            <AudioWaveform isActive={isActive} intensity={0.7} />
          </div>

          {/* Transcription Display - Shows what AI is hearing */}
          <ErrorBoundary>
            <TranscriptionDisplay />
          </ErrorBoundary>

          {/* Learning Mode HUD - Shows AI script tracking when in learning mode */}
          {learningMode ? (
            <ErrorBoundary>
              <LearningModeHUD mode={mode} />
            </ErrorBoundary>
          ) : (
            /* Live Call HUD with animated gauges - Normal practice mode */
            <ErrorBoundary>
              <LiveCallHUD 
                gauntletLevel={gauntletLevel}
                exitStrategy={exitStrategy}
              />
            </ErrorBoundary>
          )}

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="w-full py-3 rounded-xl font-bold text-base bg-red-500 text-white active:scale-[0.98] transition-all duration-200"
          >
            END CALL
          </button>

          {/* GOAT Hint Component */}
          <ErrorBoundary>
            <GoatHint />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
