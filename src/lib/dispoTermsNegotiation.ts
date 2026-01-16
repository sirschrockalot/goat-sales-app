/**
 * Disposition Terms Negotiation Module
 * EMD and closing terms configuration for dispo training
 *
 * EMD Flexibility Rules:
 * - Standard ask: $5,000 non-refundable
 * - Minimum acceptable: $3,000 (only in justified cases)
 * - Grading: Full points for holding at $5k, partial credit for $3k-$5k with justification
 * - Fail: Accepting below $3k or making EMD refundable
 */

export interface TermsConfig {
  standardEMD: number;
  minimumAcceptableEMD: number;
  standardCloseDays: number;
  maxCloseDays: number;
  titleCompany: string;
}

export interface TermsNegotiationScenario {
  id: string;
  name: string;
  category: 'emd_amount' | 'emd_refundable' | 'timeline' | 'title_company' | 'general_terms';
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  buyerDemand: string;
  correctResponse: string;
  holdFirmRequired: boolean;
  flexibilityAllowed: boolean;
  minimumAcceptable?: string;
  coachingTip: string;
  failureIndicators: string[];
  successIndicators: string[];
}

/**
 * Standard Terms Configuration
 */
export const STANDARD_TERMS: TermsConfig = {
  standardEMD: 5000,
  minimumAcceptableEMD: 3000,
  standardCloseDays: 7,
  maxCloseDays: 14,
  titleCompany: 'Our preferred title company',
};

/**
 * EMD Flexibility Tiers
 * Used for grading and coaching
 */
export const EMD_TIERS = {
  excellent: {
    min: 5000,
    max: Infinity,
    score: 100,
    feedback: 'Held firm at standard EMD. Excellent negotiation.',
  },
  acceptable: {
    min: 4000,
    max: 4999,
    score: 85,
    feedback: 'Slight discount from standard, but still strong commitment.',
  },
  minimum: {
    min: 3000,
    max: 3999,
    score: 70,
    feedback: 'At the floor. Acceptable only if buyer had valid justification.',
  },
  fail: {
    min: 0,
    max: 2999,
    score: 0,
    feedback: 'Below minimum acceptable. Lost leverage and credibility.',
  },
};

/**
 * Terms Negotiation Scenarios
 * 15 scenarios covering EMD, timeline, and terms objections
 */
export const TERMS_SCENARIOS: TermsNegotiationScenario[] = [
  // ============================================
  // EMD AMOUNT SCENARIOS
  // ============================================
  {
    id: 'emd-amount-001',
    name: 'Standard EMD Pushback',
    category: 'emd_amount',
    difficulty: 'medium',
    buyerDemand: "I'll do $2k EMD, not $5k. That's my limit.",
    correctResponse:
      "I understand $5k feels like a lot. The non-refundable EMD protects both of us - it shows you're serious and lets me confidently take this off market. I can work with $3k if that helps, but that's my floor. Can you make that work?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    minimumAcceptable: '$3,000',
    coachingTip:
      "When they push back on EMD, acknowledge their concern, explain the value (mutual protection), and offer your floor. Never go below $3k.",
    failureIndicators: [
      'Accepting $2k or below',
      'Making EMD refundable',
      "Saying 'I'll check with my team'",
    ],
    successIndicators: [
      'Held at $5k',
      'Negotiated to $3k-$4k with justification',
      'Explained value of non-refundable EMD',
    ],
  },
  {
    id: 'emd-amount-002',
    name: 'Cash Flow Constraint',
    category: 'emd_amount',
    difficulty: 'medium',
    buyerDemand:
      "I've got capital tied up in three other deals. Can we do $1,500 EMD?",
    correctResponse:
      "I hear you on cash flow - that's the investor life. $1,500 is too light for me to take this off market though. Here's what I can do: $3,000 EMD, and you have 48 hours to wire it. That gives you time to move funds around. Does that work?",
    holdFirmRequired: true,
    flexibilityAllowed: true,
    minimumAcceptable: '$3,000',
    coachingTip:
      "Cash flow constraints are sometimes real, sometimes excuses. Offer TIME flexibility (48 hours to wire) instead of AMOUNT flexibility. $1,500 is a red flag for buyer commitment.",
    failureIndicators: [
      'Accepting $1,500 or below',
      'Offering payment plan for EMD',
      "Saying 'Let me see what I can do'",
    ],
    successIndicators: [
      'Offered time flexibility instead of amount',
      'Maintained $3k minimum',
      'Created soft deadline (48 hours)',
    ],
  },
  {
    id: 'emd-amount-003',
    name: 'Comparison to Other Deals',
    category: 'emd_amount',
    difficulty: 'hard',
    buyerDemand:
      "$5k EMD? I bought my last five properties with $500 EMD each. Your number is ridiculous.",
    correctResponse:
      "Different deals, different terms. Those might have been direct-to-seller or different market conditions. For the spread you're getting here - you're looking at [X] profit potential - $5k EMD is standard and less than 5% of your upside. The question is: does this deal make sense for you?",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "Don't let them anchor to past deals. Reframe around THIS deal's profit potential. $5k is nothing compared to a $30k+ spread.",
    failureIndicators: [
      'Matching their past terms',
      'Apologizing for the EMD amount',
      'Offering to reduce without justification',
    ],
    successIndicators: [
      'Reframed to profit potential',
      'Stood firm on $5k',
      "Pivoted to 'does this deal work for you?'",
    ],
  },
  {
    id: 'emd-amount-004',
    name: 'Smaller Deal Justification',
    category: 'emd_amount',
    difficulty: 'easy',
    buyerDemand:
      "This is a smaller deal - only $80k buy-in. $5k EMD is 6% of purchase price. Can we scale it down?",
    correctResponse:
      "Fair point on the percentage. For deals under $100k, I can work with $3,500. It's still non-refundable and shows commitment. But I want to be clear - the EMD isn't about the deal size, it's about holding it off market for you. Sound fair?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    minimumAcceptable: '$3,500',
    coachingTip:
      "Scaling EMD to deal size is a reasonable request. You can flex slightly for smaller deals, but never below $3k and always maintain the non-refundable requirement.",
    failureIndicators: [
      'Going below $3k',
      'Making EMD a percentage formula',
      "Agreeing to 'see what works'",
    ],
    successIndicators: [
      'Acknowledged their logic',
      'Offered modest reduction with explanation',
      'Maintained non-refundable stance',
    ],
  },

  // ============================================
  // EMD REFUNDABLE SCENARIOS
  // ============================================
  {
    id: 'emd-refund-001',
    name: 'Refundable EMD Request',
    category: 'emd_refundable',
    difficulty: 'hard',
    buyerDemand:
      "Make the EMD refundable for 72 hours while I do my due diligence, and I'll move forward.",
    correctResponse:
      "I can't do refundable EMD - here's why: once you're under contract, I'm turning away other buyers and taking this off market. If you back out, I've lost time and other opportunities. What specific due diligence do you need? Let's see if we can address that before you commit.",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "NEVER agree to refundable EMD. It invites tire-kickers and eliminates your leverage. Instead, ask WHAT due diligence they need and try to solve that before the commitment.",
    failureIndicators: [
      'Agreeing to any refundable period',
      'Offering partial refund scenarios',
      "Saying 'Let me check if we can do that'",
    ],
    successIndicators: [
      'Firmly declined refundable',
      'Explained business reason (opportunity cost)',
      'Offered to help with due diligence concerns',
    ],
  },
  {
    id: 'emd-refund-002',
    name: 'Contingency Request',
    category: 'emd_refundable',
    difficulty: 'hard',
    buyerDemand:
      "I want a financing contingency. If my lender doesn't approve, I get my EMD back.",
    correctResponse:
      "Financing contingencies don't work with our timeline. We're closing in 7 days, which is too fast for traditional lending. Is this a deal you can do cash, or do you have a hard money source that's already pre-approved? If you need financing, you might not be the right buyer for this one.",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "Financing contingencies are deal-killers for wholesale assignments. If they need bank financing, they're not a cash buyer. Be direct about timeline incompatibility.",
    failureIndicators: [
      'Agreeing to financing contingency',
      'Extending timeline to accommodate lender',
      'Offering to wait for pre-approval',
    ],
    successIndicators: [
      'Clearly declined contingency',
      'Asked about cash/hard money alternatives',
      'Qualified them out if needed',
    ],
  },
  {
    id: 'emd-refund-003',
    name: 'Inspection Contingency',
    category: 'emd_refundable',
    difficulty: 'medium',
    buyerDemand:
      "What if the inspection reveals something major? I need EMD back if there are hidden issues.",
    correctResponse:
      "I understand the concern. Here's how we handle it: you can walk the property before you put up EMD. Bring your contractor if you want. Once you've seen it and you're comfortable, the EMD is non-refundable. But if something was misrepresented on our end - title issues, seller backs out - you're protected. Fair?",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "Address inspection concerns with a PRE-COMMITMENT walkthrough, not a post-commitment contingency. Let them inspect BEFORE the EMD, not after.",
    failureIndicators: [
      'Offering inspection contingency period',
      'Making EMD partially refundable for issues',
      'Delaying EMD until after inspection',
    ],
    successIndicators: [
      'Offered pre-EMD walkthrough',
      'Clarified protection for seller/title issues',
      'Maintained non-refundable after walkthrough',
    ],
  },

  // ============================================
  // TIMELINE SCENARIOS
  // ============================================
  {
    id: 'timeline-001',
    name: 'Extended Close Request',
    category: 'timeline',
    difficulty: 'medium',
    buyerDemand: "7 days is impossible. I need 30 days to close.",
    correctResponse:
      "30 days doesn't work for this deal - our seller needs to move fast, which is why the price is where it is. I can stretch to 14 days max. What's driving the 30-day need? Is it funding, title work, or something else? Let's see if we can solve it.",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    minimumAcceptable: '14 days',
    coachingTip:
      "Don't immediately reject timeline requests - PROBE for the reason. Often you can solve the underlying issue without extending to 30 days.",
    failureIndicators: [
      'Agreeing to 30 days without pushback',
      'Saying "I\'ll check with the seller"',
      'Offering unlimited flexibility',
    ],
    successIndicators: [
      'Offered 14-day maximum',
      'Asked about the underlying need',
      'Tied timeline to deal value',
    ],
  },
  {
    id: 'timeline-002',
    name: 'Contractor Walkthrough Delay',
    category: 'timeline',
    difficulty: 'hard',
    buyerDemand:
      "My contractor can't get there until next week. Can we push close to 21 days?",
    correctResponse:
      "I've got other buyers ready to move this week. Here's what I can do: I'll hold it for you until Friday. If your contractor can get eyes on it by then, you're in. If not, I have to move to my next buyer. Can you make that work?",
    holdFirmRequired: true,
    flexibilityAllowed: true,
    minimumAcceptable: '3-5 day hold',
    coachingTip:
      "Contractor delays are often negotiation tactics. Create a SHORT hold window (3-5 days) and use competing buyer pressure. Don't let them stall indefinitely.",
    failureIndicators: [
      'Agreeing to wait until next week',
      'Not mentioning other buyers',
      'Offering open-ended hold',
    ],
    successIndicators: [
      'Created deadline (Friday)',
      'Mentioned competing buyers',
      'Limited hold to days, not weeks',
    ],
  },
  {
    id: 'timeline-003',
    name: 'Lender Timeline',
    category: 'timeline',
    difficulty: 'medium',
    buyerDemand: "My hard money lender needs 10 business days minimum.",
    correctResponse:
      "10 business days puts us at about 14 calendar days - that's workable. I need your EMD today to hold it, and you need to have your lender's commitment letter by day 3. If they can't commit by then, we'll need to release the deal. Sound fair?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    minimumAcceptable: '14 calendar days',
    coachingTip:
      "Hard money timelines are often real. You can flex to 14 days, but get EMD upfront and create a commitment checkpoint (day 3 lender letter).",
    failureIndicators: [
      'Waiting for lender approval before EMD',
      'No commitment checkpoint',
      'Extending beyond 14 days',
    ],
    successIndicators: [
      'Converted business to calendar days',
      'Required EMD upfront',
      'Created lender commitment checkpoint',
    ],
  },

  // ============================================
  // TITLE COMPANY SCENARIOS
  // ============================================
  {
    id: 'title-001',
    name: 'Own Title Company Request',
    category: 'title_company',
    difficulty: 'easy',
    buyerDemand: "I want to use my own title company. I've worked with them for years.",
    correctResponse:
      "I understand the preference. Our standard is to use [title company] because they're fast and investor-friendly. If your title company can turn around a closing in 7 days and they're comfortable with assignments, I can consider it. Who do you use?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    coachingTip:
      "Title company requests are usually reasonable. The key requirements are: fast turnaround and assignment-friendly. Ask about their company before agreeing.",
    failureIndicators: [
      'Agreeing without asking about their title company',
      'Extending timeline for their title company',
      'Offering to use any company they want',
    ],
    successIndicators: [
      'Stated speed requirement',
      'Asked about assignment experience',
      'Maintained timeline expectation',
    ],
  },
  {
    id: 'title-002',
    name: 'Title Company Trust Issue',
    category: 'title_company',
    difficulty: 'medium',
    buyerDemand: "I don't trust title companies I haven't used before. How do I know you're not scamming me?",
    correctResponse:
      "Fair concern. [Title company] is licensed and bonded in [state]. You can verify them through the state bar. Your EMD goes into their escrow account, not mine. You'll get a settlement statement showing exactly where every dollar goes. Want me to send you their contact info so you can verify directly?",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "Title company trust issues are really about overall deal trust. Address with verifiable facts: licensing, escrow accounts, settlement statements. Offer direct verification.",
    failureIndicators: [
      'Getting defensive',
      'Offering to skip title company',
      'Not providing verification options',
    ],
    successIndicators: [
      'Provided licensing info',
      'Explained escrow protection',
      'Offered direct verification',
    ],
  },

  // ============================================
  // GENERAL TERMS SCENARIOS
  // ============================================
  {
    id: 'general-001',
    name: 'Assignment Fee Transparency',
    category: 'general_terms',
    difficulty: 'easy',
    buyerDemand: "What's your assignment fee? I want full transparency on the numbers.",
    correctResponse:
      "Happy to be transparent. My assignment fee is [X]. Here's the full breakdown: you're buying at [price], the original contract is at [price], my fee is the difference. The ARV is [X] and repairs are estimated at [X]. That leaves you with [profit] spread. Any questions on the numbers?",
    holdFirmRequired: true,
    flexibilityAllowed: false,
    coachingTip:
      "Always be transparent about assignment fees. Sophisticated buyers expect it. Walk through the full stack: buy price, original contract, your fee, ARV, repairs, their profit.",
    failureIndicators: [
      'Hiding the assignment fee',
      'Being vague about numbers',
      'Getting defensive about fee',
    ],
    successIndicators: [
      'Disclosed fee clearly',
      'Walked through full deal stack',
      'Showed their profit potential',
    ],
  },
  {
    id: 'general-002',
    name: 'Double Close Request',
    category: 'general_terms',
    difficulty: 'medium',
    buyerDemand: "Can we do a double close instead of an assignment? I don't want the seller to see your fee.",
    correctResponse:
      "We can do a double close if you prefer - some buyers like that structure. It adds about [X] in closing costs and extends the timeline by a day or two for the back-to-back transactions. EMD and terms stay the same. Is that worth it to you?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    coachingTip:
      "Double closes are a valid structure. Know the cost difference (extra closing costs) and timeline impact. Some buyers prefer it for privacy or their own buyer relationships.",
    failureIndicators: [
      "Not knowing what double close means",
      'Refusing without explanation',
      'Adding excessive costs',
    ],
    successIndicators: [
      'Explained double close process',
      'Noted cost/timeline differences',
      'Left decision to buyer',
    ],
  },
  {
    id: 'general-003',
    name: 'Proof of Funds Request',
    category: 'general_terms',
    difficulty: 'easy',
    buyerDemand: "Before I send EMD, I need to see proof that you actually have this property under contract.",
    correctResponse:
      "Absolutely - that's smart due diligence. I can send you a redacted copy of our contract showing the property address and purchase price. The seller's info will be blacked out for their privacy. Once you verify, we move forward with EMD. Sound good?",
    holdFirmRequired: false,
    flexibilityAllowed: true,
    coachingTip:
      "Contract verification requests are reasonable. Send a REDACTED copy protecting seller info. This builds trust and filters out inexperienced buyers.",
    failureIndicators: [
      'Refusing to show contract',
      'Getting defensive',
      'Sending unredacted seller info',
    ],
    successIndicators: [
      'Agreed to share redacted contract',
      'Protected seller information',
      'Tied verification to EMD commitment',
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all scenarios for a category
 */
export function getScenariosByCategory(
  category: TermsNegotiationScenario['category']
): TermsNegotiationScenario[] {
  return TERMS_SCENARIOS.filter((s) => s.category === category);
}

/**
 * Get all scenarios for a difficulty level
 */
export function getScenariosByDifficulty(
  difficulty: TermsNegotiationScenario['difficulty']
): TermsNegotiationScenario[] {
  return TERMS_SCENARIOS.filter((s) => s.difficulty === difficulty);
}

/**
 * Get scenarios that require holding firm (non-negotiable)
 */
export function getHoldFirmScenarios(): TermsNegotiationScenario[] {
  return TERMS_SCENARIOS.filter((s) => s.holdFirmRequired && !s.flexibilityAllowed);
}

/**
 * Get a random scenario with optional filters
 */
export function getRandomTermsScenario(filters?: {
  category?: TermsNegotiationScenario['category'];
  difficulty?: TermsNegotiationScenario['difficulty'];
}): TermsNegotiationScenario | null {
  let filtered = TERMS_SCENARIOS;

  if (filters?.category) {
    filtered = filtered.filter((s) => s.category === filters.category);
  }
  if (filters?.difficulty) {
    filtered = filtered.filter((s) => s.difficulty === filters.difficulty);
  }

  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Evaluate EMD amount and return tier info
 */
export function evaluateEMDAmount(amount: number): {
  tier: keyof typeof EMD_TIERS;
  score: number;
  feedback: string;
  passed: boolean;
} {
  if (amount >= EMD_TIERS.excellent.min) {
    return { tier: 'excellent', ...EMD_TIERS.excellent, passed: true };
  }
  if (amount >= EMD_TIERS.acceptable.min) {
    return { tier: 'acceptable', ...EMD_TIERS.acceptable, passed: true };
  }
  if (amount >= EMD_TIERS.minimum.min) {
    return { tier: 'minimum', ...EMD_TIERS.minimum, passed: true };
  }
  return { tier: 'fail', ...EMD_TIERS.fail, passed: false };
}

/**
 * Evaluate timeline and return score
 */
export function evaluateTimeline(days: number): {
  score: number;
  feedback: string;
  passed: boolean;
} {
  if (days <= STANDARD_TERMS.standardCloseDays) {
    return {
      score: 100,
      feedback: 'Maintained standard 7-day close. Excellent.',
      passed: true,
    };
  }
  if (days <= 10) {
    return {
      score: 90,
      feedback: 'Slight extension to 10 days. Acceptable.',
      passed: true,
    };
  }
  if (days <= STANDARD_TERMS.maxCloseDays) {
    return {
      score: 75,
      feedback: 'Extended to maximum 14 days. Use sparingly.',
      passed: true,
    };
  }
  if (days <= 21) {
    return {
      score: 50,
      feedback: 'Beyond standard maximum. May indicate weak buyer.',
      passed: false,
    };
  }
  return {
    score: 0,
    feedback: 'Unacceptable timeline extension. Lost deal urgency.',
    passed: false,
  };
}

/**
 * Get terms summary for persona prompt injection
 */
export function getTermsPromptInjection(level: 1 | 2 | 3 | 4 | 5): string {
  const levelConfig = {
    1: { testEMD: false, testTimeline: false, testRefundable: false },
    2: { testEMD: true, testTimeline: false, testRefundable: false },
    3: { testEMD: true, testTimeline: true, testRefundable: false },
    4: { testEMD: true, testTimeline: true, testRefundable: true },
    5: { testEMD: true, testTimeline: true, testRefundable: true },
  };

  const config = levelConfig[level];
  let prompt = '\n\nTERMS NEGOTIATION TESTING:\n';

  if (config.testEMD) {
    prompt += `- Challenge the $5k EMD. Try to negotiate down to $2k-$3k.\n`;
    prompt += `- Say things like: "$5k is too much" or "I'll do $2k non-refundable"\n`;
  }

  if (config.testTimeline) {
    prompt += `- Push back on 7-day close. Ask for 14-21 days.\n`;
    prompt += `- Say things like: "7 days is too fast" or "I need at least 14 days"\n`;
  }

  if (config.testRefundable) {
    prompt += `- Request refundable EMD or contingencies.\n`;
    prompt += `- Say things like: "Make it refundable for 48 hours" or "I need an inspection contingency"\n`;
  }

  if (!config.testEMD && !config.testTimeline && !config.testRefundable) {
    prompt += `- Accept standard terms without much pushback.\n`;
    prompt += `- You are new to investing and trust the process.\n`;
  }

  return prompt;
}

/**
 * Get coaching feedback for terms negotiation
 */
export function getTermsCoachingFeedback(results: {
  emdAmount?: number;
  timelineDays?: number;
  acceptedRefundable?: boolean;
  acceptedContingency?: boolean;
}): string[] {
  const feedback: string[] = [];

  if (results.emdAmount !== undefined) {
    const emdEval = evaluateEMDAmount(results.emdAmount);
    feedback.push(`EMD: ${emdEval.feedback}`);
    if (!emdEval.passed) {
      feedback.push(
        'COACHING: Never accept below $3k EMD. It signals a buyer who may not close.'
      );
    }
  }

  if (results.timelineDays !== undefined) {
    const timelineEval = evaluateTimeline(results.timelineDays);
    feedback.push(`Timeline: ${timelineEval.feedback}`);
    if (!timelineEval.passed) {
      feedback.push(
        'COACHING: If they need more than 14 days, probe for the real reason. Often you can solve it without extending.'
      );
    }
  }

  if (results.acceptedRefundable) {
    feedback.push('CRITICAL FAIL: Never accept refundable EMD on assignments.');
    feedback.push(
      'COACHING: Refundable EMD invites tire-kickers. Offer pre-commitment walkthroughs instead.'
    );
  }

  if (results.acceptedContingency) {
    feedback.push('CRITICAL FAIL: Contingencies kill wholesale deals.');
    feedback.push(
      'COACHING: If they need financing contingency, they are not a cash buyer. Qualify them out.'
    );
  }

  return feedback;
}
