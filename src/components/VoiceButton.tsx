'use client';

/**
 * AI Voice Button Component
 * Controls voice call interactions with Vapi
 */

import { useState, useEffect } from 'react';
import type { PersonaMode } from '@/lib/vapi-client';
import { getVapiClient } from '@/lib/vapi-client';
import type { TranscriptionEvent, CallStatus } from '@/lib/vapi-client';

interface VoiceButtonProps {
  personaMode: PersonaMode;
  onTranscription?: (event: TranscriptionEvent) => void;
  onStatusChange?: (status: CallStatus) => void;
}

export default function VoiceButton({
  personaMode,
  onTranscription,
  onStatusChange,
}: VoiceButtonProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isActive: false,
    isMuted: false,
    status: 'idle',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getVapiClient();
    
    // Initialize client
    const initClient = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        if (!apiKey) {
          setError('Vapi API key not configured');
          return;
        }

        await client.initialize({
          apiKey,
          personaMode,
        });

        // Subscribe to status changes
        const unsubscribeStatus = client.onStatusChange((status) => {
          setCallStatus(status);
          setIsCallActive(status.isActive);
          setIsMuted(status.isMuted);
          onStatusChange?.(status);
        });

        // Subscribe to transcriptions
        const unsubscribeTranscript = client.onTranscription((event) => {
          onTranscription?.(event);
        });

        return () => {
          unsubscribeStatus();
          unsubscribeTranscript();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Vapi');
        console.error('Vapi initialization error:', err);
      }
    };

    initClient();
  }, [personaMode, onTranscription, onStatusChange]);

  const handleStartCall = async () => {
    try {
      setError(null);
      const client = getVapiClient();
      await client.startCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
      console.error('Call start error:', err);
    }
  };

  const handleEndCall = async () => {
    try {
      const client = getVapiClient();
      await client.endCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
      console.error('Call end error:', err);
    }
  };

  const handleToggleMute = async () => {
    try {
      const client = getVapiClient();
      await client.toggleMute();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle mute');
      console.error('Mute toggle error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Call Button */}
      <button
        onClick={isCallActive ? handleEndCall : handleStartCall}
        disabled={callStatus.status === 'connecting'}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg
          ${
            isCallActive
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${
            callStatus.status === 'connecting'
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:scale-105'
          }
        `}
        aria-label={isCallActive ? 'End call' : 'Start call'}
      >
        {callStatus.status === 'connecting' ? (
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
        ) : isCallActive ? (
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12a9 9 0 1018 0 9 9 0 00-18 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        )}
      </button>

      {/* Mute Button (only show when call is active) */}
      {isCallActive && (
        <button
          onClick={handleToggleMute}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              isMuted
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇 Unmute' : '🎤 Mute'}
        </button>
      )}

      {/* Status Indicator */}
      <div className="text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCallActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="capitalize">{callStatus.status}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
