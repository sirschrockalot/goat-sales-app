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
  
  // Actions
  initialize: (apiKey: string, mode: PersonaMode, assistantId?: string) => Promise<void>;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  setPersonaMode: (mode: PersonaMode) => Promise<void>;
  
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
      await client.endCall();
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }, []);

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
    initialize,
    startCall,
    endCall,
    toggleMute,
    setPersonaMode,
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
