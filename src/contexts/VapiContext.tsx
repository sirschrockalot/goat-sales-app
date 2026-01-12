'use client';

/**
 * VapiContext Provider
 * Manages call state (Connecting, Active, Ended) across the entire app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getVapiClient, type PersonaMode, type TranscriptionEvent, type CallStatus } from '@/lib/vapi-client';

interface VapiContextType {
  // Call State
  callStatus: CallStatus;
  isConnecting: boolean;
  isActive: boolean;
  isEnded: boolean;
  isMuted: boolean;
  
  // Transcript
  transcript: string;
  transcriptionHistory: TranscriptionEvent[];
  
  // Persona
  personaMode: PersonaMode | null;
  
  // Call Info
  callId: string | null;
  controlUrl: string | null;
  
  // Training Session Data (for webhook)
  scriptHiddenDuration?: number; // Seconds with script hidden
  
  // Hold State
  isOnHold: boolean;
  holdDuration: number;
  
  // Actions
  initialize: (apiKey: string, mode: PersonaMode, assistantId?: string) => Promise<void>;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  setPersonaMode: (mode: PersonaMode) => Promise<void>;
  sendMessage: (message: string) => void; // Send control message (e.g., voice hints)
  placeOnHold: () => void;
  resumeFromHold: () => void;
  
  // Reset
  reset: () => void;
}

const VapiContext = createContext<VapiContextType | undefined>(undefined);

interface VapiProviderProps {
  children: ReactNode;
}

export function VapiProvider({ children }: VapiProviderProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isActive: false,
    isMuted: false,
    status: 'idle',
  });
  
  const [transcript, setTranscript] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEvent[]>([]);
  const [personaMode, setPersonaModeState] = useState<PersonaMode | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState<string | null>(null);
  const [scriptHiddenDuration, setScriptHiddenDuration] = useState<number>(0);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);
  const [holdDuration, setHoldDuration] = useState<number>(0);
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null);
  const [holdCount, setHoldCount] = useState<number>(0);

  // Derived state
  const isConnecting = callStatus.status === 'connecting';
  const isActive = callStatus.status === 'connected' || callStatus.isActive;
  const isEnded = callStatus.status === 'ended';
  const isMuted = callStatus.isMuted;

  // Handle transcription updates
  const handleTranscription = useCallback((event: TranscriptionEvent) => {
    setTranscriptionHistory((prev) => {
      const updated = [...prev, event];
      
      // Build full transcript
      const fullTranscript = updated.map((e) => e.transcript).join(' ');
      setTranscript(fullTranscript);
      
      return updated;
    });
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback((status: CallStatus) => {
    setCallStatus(status);
    
    // Reset transcript when call ends
    if (status.status === 'ended') {
      // Keep transcript for debrief, but mark as ended
      setTimeout(() => {
        // Optionally clear after debrief
      }, 1000);
    }
  }, []);

  // Initialize Vapi client
  const initialize = useCallback(async (apiKey: string, mode: PersonaMode, assistantId?: string) => {
    try {
      const client = getVapiClient();
      
      await client.initialize({
        apiKey,
        assistantId,
        personaMode: mode,
      });

      setPersonaModeState(mode);

      // Subscribe to events
      client.onTranscription(handleTranscription);
      client.onStatusChange(handleStatusChange);
      client.onCallInfo((data) => {
        setCallId(data.callId);
        setControlUrl(data.controlUrl);
      });
    } catch (error) {
      console.error('Failed to initialize Vapi:', error);
      throw error;
    }
  }, [handleTranscription, handleStatusChange]);

  // Start call
  const startCall = useCallback(async () => {
    try {
      const client = getVapiClient();
      await client.startCall();
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }, []);

  // End call
  const endCall = useCallback(async () => {
    try {
      const client = getVapiClient();
      
      // Get transcript before ending call
      const currentTranscript = transcript;
      const currentCallId = callId;
      const currentPersonaMode = personaMode;
      
      // End the call via Vapi SDK
      await client.endCall();
      
      // If we have a transcript, manually trigger webhook processing
      // This ensures analysis happens even if Vapi webhook is delayed or fails
      if (currentTranscript && currentCallId) {
        try {
          // Get user session for authentication
          const { createSupabaseClient } = await import('@/lib/supabase');
          const supabase = createSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }

          // Get script hidden duration from window (set by LiveCallHUD) or context
          const currentScriptHiddenDuration = typeof window !== 'undefined' 
            ? ((window as any).__scriptHiddenDuration || scriptHiddenDuration || 0)
            : (scriptHiddenDuration || 0);

          // Manually trigger webhook processing with collected transcript
          await fetch('/api/vapi-webhook', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              type: 'end-of-call-report',
              call: {
                id: currentCallId,
                status: 'ended',
                transcript: currentTranscript,
                metadata: {
                  userId: session?.user?.id,
                  personaMode: currentPersonaMode || 'acquisition',
                  source: 'vapi',
                  manuallyTriggered: true, // Flag to indicate manual trigger
                  scriptHiddenDuration: currentScriptHiddenDuration, // Include Pro Mode duration
                  holdDuration: holdDuration,
                  holdCount: holdCount,
                },
              },
            }),
          });
        } catch (webhookError) {
          // Log but don't throw - webhook might still come from Vapi
          console.warn('Failed to manually trigger webhook, Vapi may send it automatically:', webhookError);
        }
      }
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }, [transcript, callId, personaMode]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    try {
      const client = getVapiClient();
      await client.toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      throw error;
    }
  }, []);

  // Set persona mode
  const setPersonaMode = useCallback(async (mode: PersonaMode) => {
    try {
      const client = getVapiClient();
      await client.updatePersonaMode(mode);
      setPersonaModeState(mode);
    } catch (error) {
      console.error('Failed to update persona mode:', error);
      throw error;
    }
  }, []);

  // Send control message (e.g., voice hints)
  const sendMessage = useCallback((message: string) => {
    try {
      const client = getVapiClient();
      client.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setCallStatus({
      isActive: false,
      isMuted: false,
      status: 'idle',
    });
    setTranscript('');
    setTranscriptionHistory([]);
    setPersonaModeState(null);
    setCallId(null);
    setControlUrl(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const client = getVapiClient();
      client.destroy();
    };
  }, []);

  const value: VapiContextType = {
    callStatus,
    isConnecting,
    isActive,
    isEnded,
    isMuted,
    transcript,
    transcriptionHistory,
    personaMode,
    callId,
    controlUrl,
    scriptHiddenDuration,
    placeOnHold: () => {
      const client = getVapiClient();
      if (client) {
        // VapiClient doesn't have placeOnHold method, use sendMessage to simulate
        client.sendMessage("Hold on one moment, let me check with my underwriters on this.");
        setIsOnHold(true);
        setHoldStartTime(Date.now());
        setHoldCount(prev => prev + 1);
      }
    },
    resumeFromHold: () => {
      const client = getVapiClient();
      if (client) {
        // VapiClient doesn't have resumeFromHold method, just update state
        if (holdStartTime) {
          const duration = Math.floor((Date.now() - holdStartTime) / 1000);
          setHoldDuration(duration);
          setHoldStartTime(null);
        }
        setIsOnHold(false);
      }
    },
    isOnHold,
    holdDuration,
    initialize,
    startCall,
    endCall,
    toggleMute,
    setPersonaMode,
    sendMessage,
    reset,
  };

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>;
}

/**
 * Hook to use Vapi context
 */
export function useVapi() {
  const context = useContext(VapiContext);
  if (context === undefined) {
    throw new Error('useVapi must be used within a VapiProvider');
  }
  return context;
}
