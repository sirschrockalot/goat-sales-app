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
import { Vapi } from '@vapi-ai/web';

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

    // Initialize Vapi SDK
    // Note: Adjust based on actual @vapi-ai/web SDK API
    this.vapi = new Vapi({
      apiKey: config.apiKey,
      assistantId: config.assistantId,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up Vapi event listeners
   */
  private setupEventListeners(): void {
    if (!this.vapi) return;

    // Listen for transcriptions
    this.vapi.on('transcript', (data: any) => {
      const event: TranscriptionEvent = {
        type: 'transcript',
        transcript: data.transcript || '',
        role: data.role || 'assistant',
        timestamp: Date.now(),
      };

      this.transcriptionCallbacks.forEach((callback) => callback(event));
    });

    // Listen for call status changes
    this.vapi.on('status', (status: string) => {
      this.currentStatus = {
        ...this.currentStatus,
        status: status as CallStatus['status'],
        isActive: status === 'connected',
      };

      this.statusCallbacks.forEach((callback) => callback(this.currentStatus));
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
      await this.vapi.start();
      this.currentStatus = {
        ...this.currentStatus,
        isActive: true,
        status: 'connecting',
      };
      this.notifyStatusChange();
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
      await this.vapi.toggleMute();
      this.currentStatus = {
        ...this.currentStatus,
        isMuted: !this.currentStatus.isMuted,
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
