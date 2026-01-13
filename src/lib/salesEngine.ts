/**
 * Sales Engine - State Machine
 * Enforces strict sales process: Discovery → Pillars → Underwriting → Offer → Closing
 * Prevents premature offers by requiring full discovery first
 */

import logger from './logger';

export enum SalesState {
  DISCOVERY = 'DISCOVERY',
  PILLAR_VERIFICATION = 'PILLAR_VERIFICATION',
  UNDERWRITING_SYNC = 'UNDERWRITING_SYNC',
  OFFER_STAGE = 'OFFER_STAGE',
  CLOSING_WALKTHROUGH = 'CLOSING_WALKTHROUGH',
  COMPLETED = 'COMPLETED',
}

export interface SalesPillars {
  motivation: boolean; // Hidden Why identified
  timeline: boolean; // Seller's timeline understood
  condition: boolean; // Property condition assessed
  priceAnchor: boolean; // Seller's price expectation known
}

export interface SalesStateData {
  currentState: SalesState;
  pillars: SalesPillars;
  discoveryComplete: boolean;
  underwritingComplete: boolean;
  offerRevealed: boolean;
  priceAgreed: boolean;
  callId?: string;
  transcript: string[];
  missingPillar?: keyof SalesPillars;
}

class SalesEngine {
  private stateData: SalesStateData;

  constructor(callId?: string) {
    this.stateData = {
      currentState: SalesState.DISCOVERY,
      pillars: {
        motivation: false,
        timeline: false,
        condition: false,
        priceAnchor: false,
      },
      discoveryComplete: false,
      underwritingComplete: false,
      offerRevealed: false,
      priceAgreed: false,
      callId,
      transcript: [],
    };
  }

  /**
   * Get current state
   */
  getCurrentState(): SalesState {
    return this.stateData.currentState;
  }

  /**
   * Get pillar status
   */
  getPillars(): SalesPillars {
    return { ...this.stateData.pillars };
  }

  /**
   * Check if all pillars are complete
   */
  arePillarsComplete(): boolean {
    const { pillars } = this.stateData;
    return (
      pillars.motivation &&
      pillars.timeline &&
      pillars.condition &&
      pillars.priceAnchor
    );
  }

  /**
   * Check if discovery is complete
   */
  isDiscoveryComplete(): boolean {
    return this.stateData.discoveryComplete;
  }

  /**
   * Check if offer can be revealed
   */
  canRevealOffer(): boolean {
    return (
      this.stateData.discoveryComplete &&
      this.arePillarsComplete() &&
      this.stateData.underwritingComplete &&
      this.stateData.currentState === SalesState.OFFER_STAGE
    );
  }

  /**
   * Update pillar status
   */
  updatePillar(pillar: keyof SalesPillars, value: boolean): void {
    this.stateData.pillars[pillar] = value;
    this.checkPillarsComplete();
  }

  /**
   * Check if all pillars are met and advance state
   */
  private checkPillarsComplete(): void {
    if (this.arePillarsComplete() && !this.stateData.discoveryComplete) {
      this.stateData.discoveryComplete = true;
      this.stateData.currentState = SalesState.UNDERWRITING_SYNC;
      logger.info('✅ All pillars complete - moving to UNDERWRITING_SYNC', {
        callId: this.stateData.callId,
      });
    }
  }

  /**
   * Get missing pillar for deflect response
   */
  getMissingPillar(): keyof SalesPillars | null {
    const { pillars } = this.stateData;
    if (!pillars.motivation) return 'motivation';
    if (!pillars.timeline) return 'timeline';
    if (!pillars.condition) return 'condition';
    if (!pillars.priceAnchor) return 'priceAnchor';
    return null;
  }

  /**
   * Get human-readable pillar name
   */
  getPillarName(pillar: keyof SalesPillars): string {
    const names = {
      motivation: "property's story and your motivation",
      timeline: "timeline you're working with",
      condition: "property's condition",
      priceAnchor: "price range you're thinking",
    };
    return names[pillar];
  }

  /**
   * Advance to underwriting sync
   */
  startUnderwritingSync(): void {
    if (!this.stateData.discoveryComplete) {
      throw new Error('Cannot start underwriting - discovery not complete');
    }
    this.stateData.currentState = SalesState.UNDERWRITING_SYNC;
    logger.info('Starting underwriting sync', { callId: this.stateData.callId });
  }

  /**
   * Complete underwriting and advance to offer stage
   */
  completeUnderwriting(): void {
    if (this.stateData.currentState !== SalesState.UNDERWRITING_SYNC) {
      throw new Error('Cannot complete underwriting - not in UNDERWRITING_SYNC state');
    }
    this.stateData.underwritingComplete = true;
    this.stateData.currentState = SalesState.OFFER_STAGE;
    logger.info('✅ Underwriting complete - ready for OFFER_STAGE', {
      callId: this.stateData.callId,
    });
  }

  /**
   * Reveal offer (transition to OFFER_STAGE)
   */
  revealOffer(): void {
    if (!this.canRevealOffer()) {
      throw new Error('Cannot reveal offer - prerequisites not met');
    }
    this.stateData.offerRevealed = true;
    logger.info('🎯 Offer revealed', { callId: this.stateData.callId });
  }

  /**
   * Get price agreement and advance to closing
   */
  agreeToPrice(): void {
    if (!this.stateData.offerRevealed) {
      throw new Error('Cannot agree to price - offer not revealed');
    }
    this.stateData.priceAgreed = true;
    this.stateData.currentState = SalesState.CLOSING_WALKTHROUGH;
    logger.info('✅ Price agreed - moving to CLOSING_WALKTHROUGH', {
      callId: this.stateData.callId,
    });
  }

  /**
   * Complete closing walkthrough
   */
  completeClosing(): void {
    this.stateData.currentState = SalesState.COMPLETED;
    logger.info('🎉 Closing walkthrough complete', {
      callId: this.stateData.callId,
    });
  }

  /**
   * Add transcript entry
   */
  addTranscript(speaker: 'AI' | 'SELLER', message: string): void {
    this.stateData.transcript.push(`${speaker}: ${message}`);
  }

  /**
   * Get deflect response for premature offer request
   */
  getDeflectResponse(): string {
    const missingPillar = this.getMissingPillar();
    if (!missingPillar) {
      // All pillars complete but not in offer stage yet
      return "I'd love to give you a number right now, but I'd be doing you a disservice. My partners need me to run this through our underwriting system first so we can give you the best possible 'As-Is' price. Can you hang on one sec while I do that?";
    }

    const pillarName = this.getPillarName(missingPillar);
    return `[chuckle] I'd love to give you a number right now, but I'd be doing you a disservice. My partners need me to understand the property's story first so we can give you the best possible 'As-Is' price. Can we talk about the ${pillarName} for a second?`;
  }

  /**
   * Get underwriting sync message
   */
  getUnderwritingSyncMessage(): string {
    return "I have everything I need. I'm going to run this by my underwriting team/partners real quick to see how close we can get to your goals. Hang on one sec...";
  }

  /**
   * Get state data for persistence
   */
  getStateData(): SalesStateData {
    return { ...this.stateData };
  }

  /**
   * Load state data (for persistence across calls)
   */
  loadStateData(data: SalesStateData): void {
    this.stateData = { ...data };
  }
}

// Global registry for active sales engines
const activeEngines = new Map<string, SalesEngine>();

/**
 * Get or create sales engine for a call
 */
export function getSalesEngine(callId: string): SalesEngine {
  if (!activeEngines.has(callId)) {
    activeEngines.set(callId, new SalesEngine(callId));
  }
  return activeEngines.get(callId)!;
}

/**
 * Remove sales engine (call ended)
 */
export function removeSalesEngine(callId: string): void {
  activeEngines.delete(callId);
}

/**
 * Check if offer can be triggered
 */
export function canTriggerOffer(callId: string): boolean {
  const engine = activeEngines.get(callId);
  if (!engine) {
    return false; // No engine = not ready
  }
  return engine.canRevealOffer();
}

/**
 * Get deflect response for premature offer
 */
export function getDeflectResponseForCall(callId: string): string {
  const engine = getSalesEngine(callId);
  return engine.getDeflectResponse();
}
