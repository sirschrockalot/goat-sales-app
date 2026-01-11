/**
 * Vapi.ai Client Integration
 * Handles real-time voice conversations for sales training
 * 
 * Note: This implementation uses a generic Vapi SDK interface.
 * You may need to adjust the API calls based on the actual @vapi-ai/web SDK.
 * Check Vapi.ai documentation for the latest SDK API.
 */

// TODO: Verify the actual @vapi-ai/web SDK API and adjust imports/usage accordingly
// The SDK might use different class names, methods, or event patterns
import Vapi from '@vapi-ai/web';

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
    this.vapi = new Vapi(
      config.apiKey,
      undefined, // apiBaseUrl - use default
      { alwaysIncludeMicInPermissionPrompt: true }, // dailyCallConfig - ensure mic prompt
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
      // Check if this is a transcript message
      if (message.type === 'transcript' || message.transcript) {
        const event: TranscriptionEvent = {
          type: 'transcript',
          transcript: message.transcript || message.content || '',
          role: message.role || 'assistant',
          timestamp: Date.now(),
        };

        this.transcriptionCallbacks.forEach((callback) => callback(event));
      }
    });

    // Listen for call start
    this.vapi.on('call-start', () => {
      this.currentStatus = {
        ...this.currentStatus,
        isActive: true,
        status: 'connected',
      };
      this.notifyStatusChange();
    });

    // Listen for call end
    this.vapi.on('call-end', () => {
      this.currentStatus = {
        ...this.currentStatus,
        isActive: false,
        status: 'ended',
      };
      this.notifyStatusChange();
    });

    // Listen for errors
    this.vapi.on('error', (error: any) => {
      console.error('Vapi error:', error);
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
      
      const call = await this.vapi.start(this.config.assistantId);
      
      // Call started successfully - status will be updated by call-start event
      if (call) {
        // Extract callId and controlUrl from the call object if available
        const callId = (call as any).id || (call as any).callId;
        const controlUrl = (call as any).controlUrl;
        
        if (callId || controlUrl) {
          this.callInfoCallbacks.forEach((callback) => 
            callback({ callId: callId || '', controlUrl: controlUrl || '' })
          );
        }
      }
    } catch (error) {
      console.error('Error starting call:', error);
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
      console.error('Error ending call:', error);
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
      console.error('Error toggling mute:', error);
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
      console.warn('Vapi client not initialized. Cannot send message.');
      return;
    }

    try {
      // Use Vapi SDK's send() method to send a "say" message
      // This is the correct way to send voice hints/control messages
      this.vapi.say(message, false, true, true); // message, endCallAfterSpoken, interruptionsEnabled, interruptAssistantEnabled
    } catch (error) {
      console.error('Error sending message:', error);
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
      this.vapi.stop().catch(console.error);
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
