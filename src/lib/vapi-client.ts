/**
 * Vapi.ai Client Integration
 * Handles real-time voice conversations for sales training
 */

import Vapi from '@vapi-ai/web';
import { getAmbientNoiseConfig } from '@/lib/vapiConfig';

// Logger - use conditional import to avoid winston in client bundles
const getLogger = () => {
  // Base logger object with all required methods
  const baseLogger = {
    error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta),
    info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
    warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta),
    debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta),
    setContext: (_context: { callId?: string | null; assistantId?: string | null; userId?: string | null }) => {
      // No-op for client-side logger (context is mainly for server-side logging)
    },
    clearContext: () => {
      // No-op for client-side logger
    },
    getContext: () => ({} as { callId?: string; assistantId?: string; userId?: string }),
  };

  if (typeof window === 'undefined') {
    // Server-side: use winston logger (dynamic import to avoid bundling in client)
    try {
      const winstonLogger = require('./logger').default;
      // Ensure all methods exist, fallback to baseLogger if missing
      return {
        error: winstonLogger.error || baseLogger.error,
        info: winstonLogger.info || baseLogger.info,
        warn: winstonLogger.warn || baseLogger.warn,
        debug: winstonLogger.debug || baseLogger.debug,
        setContext: winstonLogger.setContext || baseLogger.setContext,
        clearContext: winstonLogger.clearContext || baseLogger.clearContext,
        getContext: winstonLogger.getContext || baseLogger.getContext,
      };
    } catch {
      // Fallback to console if logger fails to load
      return baseLogger;
    }
  }
  // Client-side: use console
  return baseLogger;
};
const logger = getLogger();

export type PersonaMode = 'acquisition' | 'disposition';

export interface VapiConfig {
  apiKey: string;
  assistantId?: string;
  personaMode: PersonaMode;
}

export interface TranscriptionEvent {
  type: 'transcript';
  transcript: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface CallStatus {
  isActive: boolean;
  isMuted: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'ended' | 'error';
}

export class VapiClient {
  private vapi: Vapi | null = null;
  private config: VapiConfig | null = null;
  private transcriptionCallbacks: ((event: TranscriptionEvent) => void)[] = [];
  private statusCallbacks: ((status: CallStatus) => void)[] = [];
  private callInfoCallbacks: ((data: { callId: string; controlUrl: string }) => void)[] = [];
  private currentStatus: CallStatus = {
    isActive: false,
    isMuted: false,
    status: 'idle',
  };

  constructor() {
    // Initialize will be called with config
  }

  /**
   * Initialize Vapi client with configuration
   */
  async initialize(config: VapiConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Vapi API key is required');
    }

    this.config = config;

    // Note: Microphone permission is now requested earlier in the flow
    // (in PersonaSelector or live-call page) before this initialize() is called
    // This ensures users grant permission before the call starts

    // Initialize Vapi SDK with Daily call config to ensure microphone prompt
    // Constructor: apiToken, apiBaseUrl?, dailyCallConfig?, dailyCallObject?
    // Use alwaysIncludeMicInPermissionPrompt to ensure microphone is requested
    const ambientNoiseConfig = getAmbientNoiseConfig();
    const dailyCallConfig: any = {
      alwaysIncludeMicInPermissionPrompt: true,
    };
    
    // Add ambient noise configuration if enabled
    // Note: Vapi SDK may support ambient noise via dailyCallConfig or dailyCallObject
    // Check Vapi SDK documentation for the correct property name
    if (ambientNoiseConfig.enabled) {
      // Try adding ambient noise to dailyCallConfig
      // The property name may vary - check Vapi SDK docs
      dailyCallConfig.ambientNoise = {
        type: ambientNoiseConfig.type,
        volume: ambientNoiseConfig.volume,
      };
    }
    
    this.vapi = new Vapi(
      config.apiKey,
      undefined, // apiBaseUrl - use default
      dailyCallConfig,
      { startAudioOff: false } // dailyCallObject - start with audio on
    );

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up Vapi event listeners
   */
  private setupEventListeners(): void {
    if (!this.vapi) return;

    // Listen for messages (transcripts come via message events)
    this.vapi.on('message', (message: any) => {
      logger.debug('Vapi message event', { messageType: message.type });
      
      // Check if this is a transcript message
      if (message.type === 'transcript' || message.transcript || message.content) {
        // Determine role: user messages typically have role='user' or type='user-message'
        // Assistant messages have role='assistant' or type='assistant-message'
        let role: 'user' | 'assistant' = 'assistant';
        
        if (message.role === 'user' || message.type === 'user-message' || message.type === 'user-transcript') {
          role = 'user';
        } else if (message.role === 'assistant' || message.type === 'assistant-message' || message.type === 'assistant-transcript') {
          role = 'assistant';
        }
        
        const event: TranscriptionEvent = {
          type: 'transcript',
          transcript: message.transcript || message.content || message.text || '',
          role: role,
          timestamp: Date.now(),
        };

        logger.debug('Transcription event created', { 
          role, 
          transcriptPreview: event.transcript.substring(0, 50) + '...' 
        });
        this.transcriptionCallbacks.forEach((callback) => callback(event));
      }
    });

    // Listen for transcript events specifically (Vapi SDK may emit these separately)
    this.vapi.on('transcript' as any, (transcript: any) => {
      logger.debug('Vapi transcript event', { transcript });
      
      if (transcript) {
        const event: TranscriptionEvent = {
          type: 'transcript',
          transcript: transcript.transcript || transcript.text || transcript.content || '',
          role: transcript.role === 'user' ? 'user' : 'assistant',
          timestamp: Date.now(),
        };

        logger.debug('Transcription event from transcript event', { 
          role: event.role, 
          transcriptPreview: event.transcript.substring(0, 50) + '...' 
        });
        this.transcriptionCallbacks.forEach((callback) => callback(event));
      }
    });

    // Listen for user speech events (if available)
    this.vapi.on('user-speech-start' as any, (data: any) => {
      logger.debug('User speech started', { data });
    });

    this.vapi.on('user-speech-end' as any, (data: any) => {
      logger.debug('User speech ended', { data });
    });

    // Listen for assistant speech events
    this.vapi.on('assistant-speech-start' as any, (data: any) => {
      logger.debug('Assistant speech started', { data });
    });

    this.vapi.on('assistant-speech-end' as any, (data: any) => {
      logger.debug('Assistant speech ended', { data });
    });

    // Debug: Log all events to help identify transcription events
    // This will help us see what events Vapi actually emits
    const allEvents = [
      'message',
      'transcript',
      'user-transcript',
      'assistant-transcript',
      'user-speech-start',
      'user-speech-end',
      'assistant-speech-start',
      'assistant-speech-end',
      'call-start',
      'call-end',
      'status',
      'error',
      'function-call',
      'function-call-result',
      'tool-calls',
      'tool-calls-result',
    ];

    // Add a debug listener for any event we might be missing
    // Note: This is for debugging - we'll remove or make conditional in production
    if (process.env.NODE_ENV === 'development') {
      allEvents.forEach((eventName) => {
        try {
          this.vapi?.on(eventName as any, (data: any) => {
            if (eventName.includes('transcript') || eventName.includes('message') || eventName.includes('speech')) {
              logger.debug(`Vapi event: ${eventName}`, { data });
            }
          });
        } catch (e) {
          // Event might not exist, that's okay
        }
      });
    }

    // Listen for call start
    this.vapi.on('call-start' as any, () => {
      this.currentStatus = {
        ...this.currentStatus,
        isActive: true,
        status: 'connected',
      };
      this.notifyStatusChange();
    });

    // Listen for call end
    this.vapi.on('call-end' as any, (data?: any) => {
      logger.info('Call ended', { data });
      this.currentStatus = {
        ...this.currentStatus,
        isActive: false,
        status: 'ended',
      };
      this.notifyStatusChange();
    });

    // Listen for status updates (includes ejection errors)
    this.vapi.on('status' as any, (status: any) => {
      logger.debug('Vapi status update', { status });
      // Handle "ejection" or "meeting ended" errors
      if (status?.message?.includes('ejection') || status?.message?.includes('Meeting has ended')) {
        logger.error('Call was ejected/ended', { status });
        this.currentStatus = {
          ...this.currentStatus,
          isActive: false,
          status: 'error',
        };
        this.notifyStatusChange();
      }
    });

    // Listen for errors
    this.vapi.on('error' as any, (error: any) => {
      // Log full error details for debugging - capture everything
      const errorDetails = {
        rawError: error,
        message: error?.message,
        error: error?.error,
        code: error?.code,
        type: error?.type,
        status: error?.status,
        statusCode: error?.statusCode,
        details: error?.details,
        // Try to stringify the entire error object
        fullErrorString: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        // Also try to get stack trace if available
        stack: error?.stack,
      };
      
      logger.error('Vapi error event triggered', { errorDetails });
      
      // Check for specific error messages in multiple places
      const errorMessage = 
        error?.message || 
        error?.error || 
        error?.details ||
        error?.fullErrorString ||
        JSON.stringify(error);
        
      const lowerMessage = errorMessage.toLowerCase();
      
      if (lowerMessage.includes('ejection') || 
          lowerMessage.includes('meeting has ended') ||
          lowerMessage.includes('meeting ended')) {
        logger.error('CALL EJECTION DETECTED', {
          errorDetails,
          possibleCauses: [
            'Assistant not published/available - Check Vapi Dashboard',
            'Voice configuration issue - Voice ID may not be accessible',
            'Timing issue - Assistant was just created and needs more time',
            'Network/connection issue - Check internet connection',
            'Vapi service issue - Check Vapi status page',
          ],
          troubleshooting: [
            'Wait 5-10 seconds after assistant creation',
            'Check Vapi Dashboard → Assistants → Verify assistant exists and is published',
            'Verify ElevenLabs integration is configured correctly',
            'Check browser console for additional errors',
          ],
        });
      }
      
      this.currentStatus = {
        ...this.currentStatus,
        status: 'error',
      };
      this.notifyStatusChange();
    });
  }

  /**
   * Start a voice call
   */
  async startCall(): Promise<void> {
    if (!this.vapi || !this.config) {
      throw new Error('Vapi client not initialized');
    }

    try {
      // Verify microphone access before starting call
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        logger.debug('Microphone access confirmed');
        // Stop the test stream - we just needed to verify access
        stream.getTracks().forEach(track => track.stop());
      } catch (micError) {
        logger.error('Microphone access denied or unavailable', { error: micError });
        throw new Error('Microphone access is required. Please allow microphone access and try again.');
      }

      // Update status to connecting
      this.currentStatus = {
        ...this.currentStatus,
        status: 'connecting',
      };
      this.notifyStatusChange();

      // Start call with assistantId - it's required by the SDK
      if (!this.config.assistantId) {
        throw new Error('Assistant ID is required to start a call. Please provide an assistantId when initializing the Vapi client.');
      }
      
      logger.info('Starting call with assistant', { assistantId: this.config.assistantId });
      const call = await this.vapi.start(this.config.assistantId);
      
      // Call started successfully - status will be updated by call-start event
      if (call) {
        const callId = (call as any).id || (call as any).callId;
        const controlUrl = (call as any).controlUrl;
        
        // Set context for logging
        if (callId) {
          logger.setContext({ callId });
        }
        
        logger.info('Call started successfully', { callId, controlUrl });
        
        // Extract callId and controlUrl from the call object if available
        if (callId || controlUrl) {
          this.callInfoCallbacks.forEach((callback) => 
            callback({ callId: callId || '', controlUrl: controlUrl || '' })
          );
        }

        // Check if microphone is muted (this could prevent transcription)
        if (this.vapi && typeof (this.vapi as any).isMuted === 'function') {
          const isMuted = (this.vapi as any).isMuted();
          if (isMuted) {
            logger.warn('Microphone appears to be muted - user speech may not be transcribed');
            // Try to unmute
            if (typeof (this.vapi as any).setMuted === 'function') {
              (this.vapi as any).setMuted(false);
              logger.debug('Attempted to unmute microphone');
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error starting call', { error });
      this.currentStatus = {
        ...this.currentStatus,
        status: 'error',
      };
      this.notifyStatusChange();
      throw error;
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    if (!this.vapi) return;

    try {
      await this.vapi.stop();
      this.currentStatus = {
        ...this.currentStatus,
        isActive: false,
        status: 'ended',
      };
      this.notifyStatusChange();
    } catch (error) {
      logger.error('Error ending call', { error });
    }
  }

  /**
   * Toggle mute state
   */
  async toggleMute(): Promise<void> {
    if (!this.vapi) return;

    try {
      const newMutedState = !this.currentStatus.isMuted;
      this.vapi.setMuted(newMutedState);
      this.currentStatus = {
        ...this.currentStatus,
        isMuted: newMutedState,
      };
      this.notifyStatusChange();
    } catch (error) {
      logger.error('Error toggling mute', { error });
    }
  }

  /**
   * Subscribe to transcription events
   */
  onTranscription(callback: (event: TranscriptionEvent) => void): () => void {
    this.transcriptionCallbacks.push(callback);
    return () => {
      this.transcriptionCallbacks = this.transcriptionCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: CallStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Subscribe to call info (callId and controlUrl)
   */
  onCallInfo(callback: (data: { callId: string; controlUrl: string }) => void): () => void {
    this.callInfoCallbacks.push(callback);
    return () => {
      this.callInfoCallbacks = this.callInfoCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Get current call status
   */
  getStatus(): CallStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get current persona mode
   */
  getPersonaMode(): PersonaMode | null {
    return this.config?.personaMode || null;
  }

  /**
   * Update persona mode
   */
  async updatePersonaMode(mode: PersonaMode): Promise<void> {
    if (!this.config) return;

    this.config.personaMode = mode;
    // Update assistant configuration if needed
    // This would depend on Vapi's API for updating assistant settings
  }

  /**
   * Send a control message (e.g., voice hints)
   * Uses Vapi SDK's send() method to send "say" messages
   */
  sendMessage(message: string): void {
    if (!this.vapi) {
      logger.warn('Vapi client not initialized - cannot send message');
      return;
    }

    try {
      // Use Vapi SDK's send() method to send a "say" message
      // This is the correct way to send voice hints/control messages
      this.vapi.say(message, false, true, true); // message, endCallAfterSpoken, interruptionsEnabled, interruptAssistantEnabled
    } catch (error) {
      logger.error('Error sending message', { error });
      throw error;
    }
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach((callback) => callback(this.currentStatus));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.vapi) {
      this.vapi.stop().catch((error) => {
        logger.error('Error stopping Vapi stream', { error });
      });
    }
    this.transcriptionCallbacks = [];
    this.statusCallbacks = [];
    this.vapi = null;
    this.config = null;
  }
}

// Singleton instance
let vapiClientInstance: VapiClient | null = null;

export function getVapiClient(): VapiClient {
  if (!vapiClientInstance) {
    vapiClientInstance = new VapiClient();
  }
  return vapiClientInstance;
}
