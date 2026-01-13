/**
 * Pillar Audit Service
 * Monitors live transcript for four specific "Pillar Flags"
 * Ensures AI follows discovery process before making offers
 */

import logger from './logger';

export interface PillarFlags {
  motivation: boolean; // Hidden Why identified (Paragraph 15/38 issues like liens or title delays)
  condition: boolean; // Paragraph 6 "AS IS" items verified (fixtures, appliances, plants)
  timeline: boolean; // Discussion of 30-day default and Paragraph 24 "Close of Escrow"
  priceAnchor: boolean; // Seller named their number first before AI reveals $82,700
}

export interface PillarAuditResult {
  allPillarsMet: boolean;
  flags: PillarFlags;
  missingPillars: Array<keyof PillarFlags>;
  transcript: string;
  lastUpdated: Date;
}

class PillarAuditor {
  private flags: PillarFlags = {
    motivation: false,
    condition: false,
    timeline: false,
    priceAnchor: false,
  };

  private transcript: string = '';

  /**
   * Update transcript and audit for pillar flags
   */
  auditTranscript(transcript: string): PillarAuditResult {
    this.transcript = transcript;
    const lowerTranscript = transcript.toLowerCase();

    // Check for Motivation pillar (Hidden Why)
    // Look for: foreclosure, debt, inheritance, relocation, divorce, liens, title issues, Paragraph 15/38
    this.flags.motivation = this.checkMotivationPillar(lowerTranscript);

    // Check for Condition pillar (AS IS items)
    // Look for: fixtures, appliances, plants, "as is", Paragraph 6, condition discussions
    this.flags.condition = this.checkConditionPillar(lowerTranscript);

    // Check for Timeline pillar
    // Look for: 30-day, close of escrow, Paragraph 24, timeline, closing date
    this.flags.timeline = this.checkTimelinePillar(lowerTranscript);

    // Check for Price Anchor pillar
    // Look for: seller mentioning price first, "what are you thinking", "how much do you want"
    this.flags.priceAnchor = this.checkPriceAnchorPillar(lowerTranscript);

    const missingPillars = this.getMissingPillars();
    const allPillarsMet = missingPillars.length === 0;

    return {
      allPillarsMet,
      flags: { ...this.flags },
      missingPillars,
      transcript: this.transcript,
      lastUpdated: new Date(),
    };
  }

  /**
   * Check Motivation pillar
   * Looks for Hidden Why: foreclosure, debt, inheritance, liens, title delays, Paragraph 15/38
   */
  private checkMotivationPillar(transcript: string): boolean {
    const motivationKeywords = [
      'foreclosure',
      'foreclosing',
      'debt',
      'owe',
      'inheritance',
      'inherited',
      'relocation',
      'relocating',
      'moving',
      'divorce',
      'divorcing',
      'lien',
      'liens',
      'title issue',
      'title problem',
      'title delay',
      'paragraph 15',
      'paragraph 38',
      'why are you selling',
      'what\'s got you',
      'motivation',
      'reason for selling',
      'need to sell',
      'have to sell',
      'urgent',
      'quick sale',
      'probate',
      'estate',
    ];

    // Check for explicit mentions of motivation keywords
    const hasMotivationKeyword = motivationKeywords.some(keyword => 
      transcript.includes(keyword)
    );

    // Check for questions about "why" selling
    const hasWhyQuestion = /why.*sell|what.*got.*you|reason.*sell|motivation/i.test(transcript);

    // Check for pain point indicators
    const hasPainPoint = /owe|debt|behind|late|struggling|difficult|problem|issue/i.test(transcript) &&
      (transcript.includes('payment') || transcript.includes('mortgage') || transcript.includes('bill'));

    return hasMotivationKeyword || hasWhyQuestion || hasPainPoint;
  }

  /**
   * Check Condition pillar
   * Looks for AS IS items: fixtures, appliances, plants, Paragraph 6, condition discussions
   */
  private checkConditionPillar(transcript: string): boolean {
    const conditionKeywords = [
      'as is',
      'as-is',
      'fixture',
      'fixtures',
      'appliance',
      'appliances',
      'refrigerator',
      'stove',
      'dishwasher',
      'washer',
      'dryer',
      'plant',
      'plants',
      'outdoor',
      'condition',
      'roof',
      'hvac',
      'foundation',
      'kitchen',
      'bathroom',
      'paragraph 6',
      'what condition',
      'how\'s the',
      'what about the',
      'needs repair',
      'repairs needed',
    ];

    // Check for explicit condition keywords
    const hasConditionKeyword = conditionKeywords.some(keyword => 
      transcript.includes(keyword)
    );

    // Check for condition questions
    const hasConditionQuestion = /what.*condition|how.*condition|what.*see|what.*look/i.test(transcript);

    // Check for AS IS explicit mention
    const hasAsIs = /as.?is|exactly as|as it sits/i.test(transcript);

    // Check for fixture/appliance discussions
    const hasFixtureDiscussion = /fixture|appliance|stays|staying|included/i.test(transcript);

    return hasConditionKeyword || hasConditionQuestion || hasAsIs || hasFixtureDiscussion;
  }

  /**
   * Check Timeline pillar
   * Looks for: 30-day, close of escrow, Paragraph 24, timeline, closing date
   */
  private checkTimelinePillar(transcript: string): boolean {
    const timelineKeywords = [
      '30 day',
      'thirty day',
      '30-day',
      'close of escrow',
      'closing date',
      'when do you need',
      'timeline',
      'time frame',
      'how soon',
      'when can you',
      'paragraph 24',
      'closing timeline',
      'escrow',
      'close by',
      'need to close',
      'by when',
      'deadline',
      'urgent',
      'quick close',
    ];

    // Check for explicit timeline keywords
    const hasTimelineKeyword = timelineKeywords.some(keyword => 
      transcript.includes(keyword)
    );

    // Check for timeline questions
    const hasTimelineQuestion = /when.*close|how.*soon|timeline|time frame|deadline/i.test(transcript);

    // Check for date mentions (30 days, specific dates)
    const hasDateMention = /\d+\s*day|by\s+\w+\s+\d+|closing|escrow/i.test(transcript);

    return hasTimelineKeyword || hasTimelineQuestion || hasDateMention;
  }

  /**
   * Check Price Anchor pillar
   * Looks for: seller mentioning price first, "what are you thinking", "how much do you want"
   * This pillar is met when SELLER mentions a price BEFORE AI reveals $82,700
   */
  private checkPriceAnchorPillar(transcript: string): boolean {
    // Split transcript by speaker (AI vs SELLER)
    // For simplicity, we'll look for price mentions that come before AI's offer reveal
    
    const pricePattern = /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
    const priceMentions = transcript.match(pricePattern) || [];
    
    // Check if seller mentioned a price
    // Look for phrases like "I want", "I'm thinking", "looking for", "hoping to get"
    const sellerPriceIndicators = [
      'i want',
      'i\'m thinking',
      'looking for',
      'hoping to get',
      'need to get',
      'want to get',
      'asking',
      'listed at',
      'listed for',
      'what i want',
      'my price',
      'i need',
    ];

    const hasSellerPriceMention = sellerPriceIndicators.some(indicator => 
      transcript.includes(indicator)
    ) && priceMentions.length > 0;

    // Check if AI has revealed the offer price ($82,700 or calculated price)
    // If AI has already revealed, we can't verify if seller mentioned first
    // But if seller mentioned a price AND AI hasn't revealed yet, pillar is met
    const aiOfferRevealed = /i can offer|my partners.*offer|we can offer|based on.*offer|here.*offer/i.test(transcript) &&
      priceMentions.length > 0;

    // Pillar is met if seller mentioned price before AI revealed
    // OR if we can't determine order but seller has mentioned price
    return hasSellerPriceMention && !aiOfferRevealed;
  }

  /**
   * Get missing pillars
   */
  getMissingPillars(): Array<keyof PillarFlags> {
    const missing: Array<keyof PillarFlags> = [];
    if (!this.flags.motivation) missing.push('motivation');
    if (!this.flags.condition) missing.push('condition');
    if (!this.flags.timeline) missing.push('timeline');
    if (!this.flags.priceAnchor) missing.push('priceAnchor');
    return missing;
  }

  /**
   * Get current flags
   */
  getFlags(): PillarFlags {
    return { ...this.flags };
  }

  /**
   * Check if all pillars are met
   */
  allPillarsMet(): boolean {
    return this.getMissingPillars().length === 0;
  }

  /**
   * Reset audit (for new call)
   */
  reset(): void {
    this.flags = {
      motivation: false,
      condition: false,
      timeline: false,
      priceAnchor: false,
    };
    this.transcript = '';
  }

  /**
   * Get deflect message for missing pillars
   */
  getDeflectMessage(missingPillars: Array<keyof PillarFlags>): string {
    if (missingPillars.length === 0) {
      return "I have everything I need. I'm going to run this by my underwriting team/partners real quick...";
    }

    // Prioritize condition and timeline as most common missing
    if (missingPillars.includes('condition') && missingPillars.includes('timeline')) {
      return "I need to understand the condition and timeline a bit better before I can give you an accurate 'As-Is' price. Can we talk about the property's condition first?";
    }

    if (missingPillars.includes('condition')) {
      return "I need to understand the property's condition a bit better before I can give you an accurate 'As-Is' price. Can we talk about what I'd be seeing when I walk through the front door?";
    }

    if (missingPillars.includes('timeline')) {
      return "I need to understand your timeline a bit better before I can give you an accurate 'As-Is' price. When do you need to close by?";
    }

    if (missingPillars.includes('motivation')) {
      return "I'd love to give you a number right now, but I'd be doing you a disservice. My partners need me to understand the property's story first - what's got you thinking about selling?";
    }

    if (missingPillars.includes('priceAnchor')) {
      return "Before I give you a number, I'm curious - what price range are you thinking? What would make this work for you?";
    }

    // Default deflect
    const firstMissing = missingPillars[0];
    const pillarNames = {
      motivation: "property's story and your motivation",
      condition: "property's condition",
      timeline: "timeline you're working with",
      priceAnchor: "price range you're thinking",
    };

    return `I'd love to give you a number right now, but I'd be doing you a disservice. My partners need me to understand the ${pillarNames[firstMissing]} first so we can give you the best possible 'As-Is' price. Can we talk about that for a second?`;
  }
}

// Global registry for active auditors
const activeAuditors = new Map<string, PillarAuditor>();

/**
 * Get or create pillar auditor for a call
 */
export function getPillarAuditor(callId: string): PillarAuditor {
  if (!activeAuditors.has(callId)) {
    activeAuditors.set(callId, new PillarAuditor());
  }
  return activeAuditors.get(callId)!;
}

/**
 * Remove pillar auditor (call ended)
 */
export function removePillarAuditor(callId: string): void {
  activeAuditors.delete(callId);
}

/**
 * Audit transcript for pillar compliance
 */
export function auditPillars(callId: string, transcript: string): PillarAuditResult {
  const auditor = getPillarAuditor(callId);
  return auditor.auditTranscript(transcript);
}

/**
 * Check if offer can be triggered (all pillars met)
 */
export function canTriggerOffer(callId: string): boolean {
  const auditor = activeAuditors.get(callId);
  if (!auditor) {
    return false; // No auditor = not ready
  }
  return auditor.allPillarsMet();
}

/**
 * Get deflect message for premature offer
 */
export function getDeflectMessage(callId: string): string {
  const auditor = getPillarAuditor(callId);
  const missingPillars = auditor.getMissingPillars();
  return auditor.getDeflectMessage(missingPillars);
}
