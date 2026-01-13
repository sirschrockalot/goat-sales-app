/**
 * Contract Walkthrough Service
 * Provides simplified explanations for walking sellers through the Purchase Agreement
 * Based on PA Summary.pdf document
 */

import logger from './logger';

export interface WalkthroughSection {
  paragraph: number;
  title: string;
  explanation: string;
  confirmationQuestion?: string;
  warning?: string;
}

export interface WalkthroughState {
  currentSection: number;
  completedSections: number[];
  priceAgreed: boolean;
  documentDelivered: boolean;
  documentViewed: boolean;
  signatureCompleted: boolean;
}

/**
 * Get all walkthrough sections in order
 */
export function getWalkthroughSections(): WalkthroughSection[] {
  return [
    {
      paragraph: 4,
      title: 'Names and Property Address',
      explanation: 'Let me confirm the names and property address are correct. This is just to make sure everything matches up.',
    },
    {
      paragraph: 7,
      title: 'AS IS Status and Fixtures',
      explanation: 'Paragraph 7 confirms you\'re selling the property "AS IS" - meaning exactly as it sits today. This includes all fixtures like appliances, light fixtures, and even the outdoor plants. Everything stays with the property.',
      confirmationQuestion: 'Does that make sense so far?',
    },
    {
      paragraph: 8,
      title: 'Purchase Price Breakdown',
      explanation: 'Paragraph 8 is the price breakdown. The total purchase price is $82,700. Here\'s how it works: You\'ll receive $100 as earnest money when we sign today, and then the remaining $82,600 in cash at closing. So you get $100 today, and $82,600 when we close at the title company.',
      confirmationQuestion: 'Does that make sense so far?',
    },
    {
      paragraph: 13,
      title: 'Closing Costs - We Cover Everything',
      explanation: 'Paragraph 13 is important - we cover ALL closing costs. Title fees, recording fees, transfer taxes - all of it. You don\'t pay a penny in closing costs. The only thing you\'re responsible for is any existing liens or mortgages, and only until the day we close. After that, we take over everything.',
      confirmationQuestion: 'Does that make sense so far?',
    },
    {
      paragraph: 15,
      title: 'Seller Responsibilities',
      explanation: 'Paragraph 15 confirms what I just said - you\'re only responsible for your existing liens or mortgages until closing day. We handle everything else.',
    },
    {
      paragraph: 38,
      title: 'Title Delays - We Work With You',
      explanation: 'Paragraph 38 is about title issues. If there are any delays with the title, it doesn\'t mean we\'re backing out. We will work with you on obtaining a clear title. We\'re committed to making this happen.',
      confirmationQuestion: 'Does that make sense so far?',
    },
    {
      paragraph: 47,
      title: 'Personal Property Warning',
      explanation: 'Paragraphs 47 and 48 are important - any personal property you leave behind after closing becomes our property. So make sure you take everything you want to keep. Furniture, decorations, anything that\'s not permanently attached to the house needs to go with you.',
      warning: 'Remember: Anything left behind becomes the buyer\'s property.',
    },
    {
      paragraph: 50,
      title: 'Direct Buyer-Seller Transaction',
      explanation: 'Paragraph 50 is straightforward - we are not a realtor in this transaction. This is a direct buyer to seller transaction. No middleman, no realtor fees, just you and us.',
    },
    {
      paragraph: 56,
      title: 'Clause 17 - Memorandum',
      explanation: 'Paragraph 56, also called Clause 17, is the Memorandum. This is simply notifying the county that we are working together to purchase this property. It\'s a public record that protects both of us and shows we have a valid agreement. It\'s standard practice and nothing to worry about.',
      confirmationQuestion: 'Does that make sense so far?',
    },
  ];
}

/**
 * Get walkthrough explanation for a specific paragraph
 */
export function getParagraphExplanation(paragraphNumber: number): WalkthroughSection | null {
  const sections = getWalkthroughSections();
  return sections.find((s) => s.paragraph === paragraphNumber) || null;
}

/**
 * Generate the full walkthrough script
 * Returns an array of dialogue segments to be delivered sequentially
 * ONLY call this AFTER price agreement (verbal_yes_to_price = true)
 */
export function generateWalkthroughScript(
  sellerName: string,
  propertyAddress: string,
  purchasePrice: number,
  earnestMoney: number = 100
): string[] {
  const sections = getWalkthroughSections();
  const cashAtClose = purchasePrice - earnestMoney;
  
  const script: string[] = [];

  // Introduction
  script.push(
    `Perfect, ${sellerName}. I'm going to walk you through the key sections of the agreement. It's pretty straightforward, and I'll make sure you understand everything before you sign.`
  );

  // Section 1: Names and Address (Paragraph 4)
  const section4 = sections.find((s) => s.paragraph === 4);
  if (section4) {
    script.push(
      `First, let's confirm the basics. ${section4.explanation} Can you verify that your name and ${propertyAddress} are correct on page 1?`
    );
  }

  // Section 2: AS IS Status (Paragraph 7)
  const section7 = sections.find((s) => s.paragraph === 7);
  if (section7) {
    script.push(
      `Now, ${section7.explanation} ${section7.confirmationQuestion || ''}`
    );
  }

  // Section 3: Price Breakdown (Paragraph 8)
  const section8 = sections.find((s) => s.paragraph === 8);
  if (section8) {
    // Replace placeholders with actual values
    const priceExplanation = section8.explanation
      .replace('$82,700', `$${purchasePrice.toLocaleString()}`)
      .replace('$100', `$${earnestMoney.toLocaleString()}`)
      .replace('$82,600', `$${cashAtClose.toLocaleString()}`)
      .replace('$100 today', `$${earnestMoney.toLocaleString()} today`);
    
    script.push(
      `Moving to the price section. ${priceExplanation} ${section8.confirmationQuestion || ''}`
    );
  }

  // Section 4: Closing Costs (Paragraph 13) - EXPLICITLY MENTIONED
  const section13 = sections.find((s) => s.paragraph === 13);
  if (section13) {
    script.push(
      `Now, Paragraph 13 is important - we cover ALL closing costs. Title fees, recording fees, transfer taxes - all of it. You don't pay a penny in closing costs. The only thing you're responsible for is any existing liens or mortgages, and only until the day we close. After that, we take over everything. ${section13.confirmationQuestion || ''}`
    );
  }

  // Section 5: Title Delays (Paragraph 38)
  const section38 = sections.find((s) => s.paragraph === 38);
  if (section38) {
    script.push(
      `There's one more thing I want to make sure you understand. ${section38.explanation} ${section38.confirmationQuestion || ''}`
    );
  }

  // Section 6: Personal Property Warning (Paragraphs 47/48)
  const section47 = sections.find((s) => s.paragraph === 47);
  if (section47) {
    script.push(
      `One important reminder: ${section47.explanation} ${section47.warning || ''}`
    );
  }

  // Section 7: Direct Transaction (Paragraph 50)
  const section50 = sections.find((s) => s.paragraph === 50);
  if (section50) {
    script.push(
      `Just to be clear: ${section50.explanation}`
    );
  }

  // Section 8: Memorandum (Paragraph 56/Clause 17) - EXPLICITLY MENTIONED AS "RESERVED SIGN"
  const section56 = sections.find((s) => s.paragraph === 56);
  if (section56) {
    script.push(
      `Finally, Paragraph 56, also called Clause 17, is the Memorandum. This is simply notifying the county that we are working together to purchase this property. It's a "Reserved Sign" - just a public record that protects both of us and shows we have a valid agreement. It's standard practice and nothing to worry about. ${section56.confirmationQuestion || ''}`
    );
  }

  // Closing
  script.push(
    `Great! Those are the main points. Everything else is standard legal language. Do you have any questions before you sign?`
  );

  return script;
}

/**
 * Get the initial message when document is delivered
 */
export function getDocumentDeliveredMessage(): string {
  return "I see you've got it open! Perfect. Page 1 is the price we discussed. Page 3 is where you'll sign at the bottom. Let me walk you through the key sections.";
}

/**
 * Get the message when document is viewed
 */
export function getDocumentViewedMessage(): string {
  return "I see you've got it open! Perfect. Page 1 is just the price we discussed. Page 3 is the signature line. Let me know when you've hit 'Finish', or if you have any questions as you look that over.";
}

/**
 * Check if walkthrough should proceed to next section
 * Returns true if seller confirms understanding
 */
export function shouldProceedToNextSection(
  sellerResponse: string,
  currentSection: WalkthroughSection
): boolean {
  const response = sellerResponse.toLowerCase().trim();
  
  // Positive confirmations
  const positiveIndicators = [
    'yes',
    'yeah',
    'yep',
    'sure',
    'okay',
    'ok',
    'got it',
    'makes sense',
    'understood',
    'i understand',
    'sounds good',
    'that works',
    'correct',
    'right',
  ];

  // Negative indicators
  const negativeIndicators = [
    'no',
    'wait',
    'hold on',
    'stop',
    'question',
    'confused',
    "don't understand",
    "doesn't make sense",
  ];

  // Check for negative first
  for (const negative of negativeIndicators) {
    if (response.includes(negative)) {
      return false;
    }
  }

  // Check for positive
  for (const positive of positiveIndicators) {
    if (response.includes(positive)) {
      return true;
    }
  }

  // Default: if no clear indicator, assume they want to continue
  // (silence or non-committal responses)
  return true;
}

/**
 * Get follow-up question if seller doesn't understand
 */
export function getClarificationQuestion(section: WalkthroughSection): string {
  return `Let me explain ${section.title} a different way. ${section.explanation} Does that help?`;
}

/**
 * Validate success criteria
 * Success requires: verbal_yes_to_price === true AND signature_status === 'completed'
 */
export function validateSuccess(
  verbalYesToPrice: boolean,
  signatureStatus: string | null
): {
  isSuccessful: boolean;
  missingCriteria: string[];
} {
  const missingCriteria: string[] = [];

  if (!verbalYesToPrice) {
    missingCriteria.push('verbal_yes_to_price must be true');
  }

  if (signatureStatus !== 'completed') {
    missingCriteria.push("signature_status must be 'completed'");
  }

  return {
    isSuccessful: missingCriteria.length === 0,
    missingCriteria,
  };
}
