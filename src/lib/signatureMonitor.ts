/**
 * Live Signature Monitor Service
 * Monitors DocuSign envelope status and injects AI responses in real-time
 * Handles "comfortable silence" with soft textures
 */

import logger from './logger';
import {
  getWalkthroughSections,
  getDocumentDeliveredMessage,
  getDocumentViewedMessage,
  generateWalkthroughScript,
  shouldProceedToNextSection,
  getClarificationQuestion,
  type WalkthroughSection,
} from './contractWalkthrough';

export interface SignatureStatus {
  envelopeId: string;
  status: 'sent' | 'delivered' | 'viewed' | 'completed';
  callId: string;
  recipientEmail?: string;
  deliveredAt?: Date;
  viewedAt?: Date;
  completedAt?: Date;
  signedPdfUrl?: string;
}

export interface SignatureMonitorConfig {
  callId: string;
  envelopeId: string;
  recipientEmail: string;
  vapiCallId?: string; // For real-time AI injection
  onStatusChange?: (status: SignatureStatus) => void;
}

class SignatureMonitor {
  private config: SignatureMonitorConfig;
  private pollingInterval?: NodeJS.Timeout;
  private silenceTimer?: NodeJS.Timeout;
  private lastStatus: SignatureStatus['status'] = 'sent';
  private lastActivityTime: Date = new Date();
  private isMonitoring: boolean = false;
  private walkthroughState: {
    currentSectionIndex: number;
    sections: WalkthroughSection[];
    sellerName?: string;
    propertyAddress?: string;
    purchasePrice?: number;
    earnestMoney?: number;
  } = {
    currentSectionIndex: 0,
    sections: getWalkthroughSections(),
  };

  constructor(config: SignatureMonitorConfig) {
    this.config = config;
  }

  /**
   * Start monitoring signature status
   * Can use polling or webhook-based updates
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Signature monitor already running', { callId: this.config.callId });
      return;
    }

    this.isMonitoring = true;
    this.lastActivityTime = new Date();

    logger.info('Starting signature monitor', {
      callId: this.config.callId,
      envelopeId: this.config.envelopeId,
    });

    // Start polling DocuSign API every 10 seconds
    this.pollingInterval = setInterval(async () => {
      await this.checkEnvelopeStatus();
    }, 10000); // Poll every 10 seconds

    // Start silence detection timer
    this.startSilenceDetection();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = undefined;
    }

    this.isMonitoring = false;
    logger.info('Stopped signature monitor', { callId: this.config.callId });
  }

  /**
   * Check envelope status from DocuSign API
   */
  private async checkEnvelopeStatus(): Promise<void> {
    try {
      const status = await this.fetchEnvelopeStatus();
      
      if (status && status.status !== this.lastStatus) {
        await this.handleStatusChange(status);
        this.lastStatus = status.status;
        this.lastActivityTime = new Date();
        
        // Reset silence timer on activity
        this.resetSilenceTimer();
      }
    } catch (error) {
      logger.error('Error checking envelope status', {
        error,
        callId: this.config.callId,
        envelopeId: this.config.envelopeId,
      });
    }
  }

  /**
   * Fetch envelope status from DocuSign API
   */
  private async fetchEnvelopeStatus(): Promise<SignatureStatus | null> {
    // TODO: Implement actual DocuSign API call
    // For now, this would query the database or DocuSign API
    // Example:
    // const response = await fetch(`https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`, {
    //   headers: { 'Authorization': `Bearer ${accessToken}` }
    // });
    
    // For now, return null (webhook will update status)
    return null;
  }

  /**
   * Handle status change and inject AI response
   */
  private async handleStatusChange(status: SignatureStatus): Promise<void> {
    logger.info('Signature status changed', {
      callId: this.config.callId,
      oldStatus: this.lastStatus,
      newStatus: status.status,
    });

    // Notify callback
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status);
    }

    // Inject AI response based on status
    switch (status.status) {
      case 'delivered':
        // Start the walkthrough when document is delivered
        await this.startWalkthrough();
        break;

      case 'viewed':
        // Document was opened - provide guidance
        await this.injectAIResponse(getDocumentViewedMessage());
        this.resetSilenceTimer();
        break;

      case 'completed':
        await this.injectAIResponse(
          "Perfect, I see the signature just came through! My partners are going to start the title search immediately. Expect a call from the title company in 24 hours. We're going to make this happen for you."
        );
        // Stop monitoring once completed
        this.stopMonitoring();
        break;
    }
  }

  /**
   * Inject AI response into Vapi call
   */
  private async injectAIResponse(message: string): Promise<void> {
    if (!this.config.vapiCallId) {
      logger.warn('No Vapi call ID - cannot inject AI response', {
        callId: this.config.callId,
      });
      return;
    }

    try {
      // TODO: Implement Vapi API call to inject message
      // This would use Vapi's real-time message injection API
      // Example:
      // await fetch(`https://api.vapi.ai/call/${vapiCallId}/message`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
      //   body: JSON.stringify({ message })
      // });

      logger.info('AI response injected', {
        callId: this.config.callId,
        message: message.substring(0, 50) + '...',
      });
    } catch (error) {
      logger.error('Error injecting AI response', {
        error,
        callId: this.config.callId,
      });
    }
  }

  /**
   * Start silence detection timer
   * If seller is silent for 45 seconds, inject "comfortable silence" texture
   */
  private startSilenceDetection(): void {
    this.resetSilenceTimer();
  }

  /**
   * Reset silence timer
   */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // Set timer for 45 seconds
    this.silenceTimer = setTimeout(async () => {
      if (this.lastStatus === 'delivered' || this.lastStatus === 'viewed') {
        // Seller is reading - inject comfortable silence texture
        const textures = [
          '[soft chuckle]',
          '[clears throat]',
        ];
        const randomTexture = textures[Math.floor(Math.random() * textures.length)];
        
        await this.injectAIResponse(
          `${randomTexture} No rush at all, just making sure you're doing okay in there.`
        );

        // Reset timer for next check
        this.resetSilenceTimer();
      }
    }, 45000); // 45 seconds
  }

  /**
   * Start the contract walkthrough
   */
  private async startWalkthrough(): Promise<void> {
    const message = getDocumentDeliveredMessage();
    await this.injectAIResponse(message);

    // Wait a moment, then start the first section
    setTimeout(async () => {
      await this.deliverNextSection();
    }, 2000); // 2 second pause
  }

  /**
   * Deliver the next section of the walkthrough
   */
  private async deliverNextSection(): Promise<void> {
    const { sections, currentSectionIndex } = this.walkthroughState;

    if (currentSectionIndex >= sections.length) {
      // Walkthrough complete
      await this.injectAIResponse(
        "Great! Those are the main points. Everything else is standard legal language. Do you have any questions before you sign?"
      );
      return;
    }

    const section = sections[currentSectionIndex];
    let message = section.explanation;

    // Add confirmation question if this is a major section
    if (section.confirmationQuestion) {
      message += ` ${section.confirmationQuestion}`;
    }

    // Add warning if applicable
    if (section.warning) {
      message += ` ${section.warning}`;
    }

    await this.injectAIResponse(message);
  }

  /**
   * Process seller response and advance walkthrough
   */
  async processSellerResponse(response: string): Promise<void> {
    const { sections, currentSectionIndex } = this.walkthroughState;

    if (currentSectionIndex >= sections.length) {
      // Walkthrough already complete
      return;
    }

    const currentSection = sections[currentSectionIndex];
    const shouldProceed = shouldProceedToNextSection(response, currentSection);

    if (shouldProceed) {
      // Move to next section
      this.walkthroughState.currentSectionIndex++;
      this.resetSilenceTimer();

      // Deliver next section after a brief pause
      setTimeout(async () => {
        await this.deliverNextSection();
      }, 1000);
    } else {
      // Seller needs clarification
      const clarification = getClarificationQuestion(currentSection);
      await this.injectAIResponse(clarification);
      this.resetSilenceTimer();
    }
  }

  /**
   * Initialize walkthrough with deal details
   */
  initializeWalkthrough(
    sellerName: string,
    propertyAddress: string,
    purchasePrice: number,
    earnestMoney: number = 100
  ): void {
    this.walkthroughState.sellerName = sellerName;
    this.walkthroughState.propertyAddress = propertyAddress;
    this.walkthroughState.purchasePrice = purchasePrice;
    this.walkthroughState.earnestMoney = earnestMoney;
  }

  /**
   * Update status from webhook (called by webhook handler)
   */
  async updateStatusFromWebhook(status: SignatureStatus): Promise<void> {
    if (status.status !== this.lastStatus) {
      await this.handleStatusChange(status);
      this.lastStatus = status.status;
      this.lastActivityTime = new Date();
      this.resetSilenceTimer();
    }
  }

  /**
   * Get current walkthrough state
   */
  getWalkthroughState() {
    return {
      currentSection: this.walkthroughState.currentSectionIndex,
      totalSections: this.walkthroughState.sections.length,
      isComplete: this.walkthroughState.currentSectionIndex >= this.walkthroughState.sections.length,
    };
  }
}

/**
 * Create and start a signature monitor for a call
 */
export async function startSignatureMonitoring(
  config: SignatureMonitorConfig
): Promise<SignatureMonitor> {
  const monitor = new SignatureMonitor(config);
  await monitor.startMonitoring();
  return monitor;
}

/**
 * Get active monitors (for cleanup on call end)
 */
const activeMonitors = new Map<string, SignatureMonitor>();

export function getActiveMonitor(callId: string): SignatureMonitor | undefined {
  return activeMonitors.get(callId);
}

export function registerMonitor(callId: string, monitor: SignatureMonitor): void {
  activeMonitors.set(callId, monitor);
}

export function unregisterMonitor(callId: string): void {
  const monitor = activeMonitors.get(callId);
  if (monitor) {
    monitor.stopMonitoring();
    activeMonitors.delete(callId);
  }
}
