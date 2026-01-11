/**
 * Financial Framework for Technical Negotiation
 * Provides knowledge base for ARV, repairs, ROI, and exit strategies
 */

export type ExitStrategy = 'fix_and_flip' | 'buy_and_hold' | 'creative_finance';

export interface MockCompData {
  neighborhood: string;
  averageARV: number;
  pricePerSqft: number;
  recentSales: Array<{
    address: string;
    salePrice: number;
    sqft: number;
    saleDate: string;
  }>;
}

export interface RepairCosts {
  lightRehab: number; // $10-20/sqft
  mediumRehab: number; // $20-40/sqft
  heavyRehab: number; // $40-80/sqft
}

export const STANDARD_REPAIR_COSTS: RepairCosts = {
  lightRehab: 15, // $15/sqft average
  mediumRehab: 30, // $30/sqft average
  heavyRehab: 60, // $60/sqft average
};

/**
 * Get financial framework prompt section for assistant
 */
export function getFinancialFrameworkPrompt(
  exitStrategy: ExitStrategy = 'fix_and_flip',
  mockComps?: MockCompData
): string {
  const compSection = mockComps
    ? `COMP ANALYSIS KNOWLEDGE:
- You have access to "Mock Comps" for this neighborhood: ${mockComps.neighborhood}
- Average ARV in this area: ${formatCurrency(mockComps.averageARV)}
- Average price per square foot: ${formatCurrency(mockComps.pricePerSqft)}/sqft
- Recent sales in the area:
${mockComps.recentSales.map(s => `  * ${s.address}: ${formatCurrency(s.salePrice)} (${s.sqft} sqft) - Sold ${s.saleDate}`).join('\n')}
- If the rep suggests an ARV that is higher than ${formatCurrency(mockComps.averageARV)}, you MUST push back and ask for their justification
- Challenge them: "I've lived here 20 years, and I've seen similar houses sell for around ${formatCurrency(mockComps.averageARV)}. What makes you think this one is worth more?"
- If they can't justify the higher ARV with specific comps, become more skeptical`
    : `COMP ANALYSIS KNOWLEDGE:
- You understand local market values based on your experience living in the area
- If the rep suggests an ARV that seems too high, challenge them: "I've lived here 20 years, and I've seen similar houses sell for around [reasonable amount]. What makes you think this one is worth more?"
- Ask for their comps and justification`;

  const repairSection = `REPAIR LOGIC - STANDARD SQUARE FOOT COSTS:
- You understand "Standard Square Foot" repair costs based on property condition:
  * Light Rehab (cosmetic): $${STANDARD_REPAIR_COSTS.lightRehab}/sqft average
  * Medium Rehab (some systems): $${STANDARD_REPAIR_COSTS.mediumRehab}/sqft average
  * Heavy Rehab (major systems): $${STANDARD_REPAIR_COSTS.heavyRehab}/sqft average
- If the rep underestimates repairs for a "Heavy Rehab" scenario, call them out:
  * Example: "I've lived here 20 years, a new roof and foundation work is going to cost way more than $10k. I've had contractors quote me $30k just for the roof alone."
  * Example: "You said $25k in cosmetics? This is a 1970s build. I'm seeing cast-iron pipes and an original panel. My contractor won't touch this for less than $45k."
- Challenge low repair estimates: "That seems low for what you're describing. Have you actually walked similar properties in this condition?"
- If they mention specific repairs (roof, HVAC, foundation), you know the real costs:
  * New roof: $8,000-$15,000 (depending on size)
  * HVAC replacement: $5,000-$12,000
  * Foundation work: $10,000-$30,000+
  * Electrical panel upgrade: $2,000-$5,000
  * Plumbing (cast iron to PVC): $5,000-$15,000`;

  const exitStrategySection = getExitStrategyPrompt(exitStrategy);

  return `${compSection}

${repairSection}

${exitStrategySection}`;
}

/**
 * Get exit strategy specific prompt
 */
function getExitStrategyPrompt(exitStrategy: ExitStrategy): string {
  switch (exitStrategy) {
    case 'fix_and_flip':
      return `EXIT STRATEGY: FIX & FLIP BUYER MINDSET
- You are buying this property to fix and flip it
- Your focus is on the 70% Rule: Maximum Allowable Offer (MAO) = (ARV × 0.7) - Repairs
- Example calculation: If ARV is $200k and repairs are $30k, your MAO is ($200k × 0.7) - $30k = $110k
- You need a minimum profit margin of 20-30% after all costs (purchase, repairs, holding, selling)
- If the rep's offer exceeds your MAO, you must push back:
  * "That doesn't work for me. Based on the comps, I'm looking at an ARV of around $[X], and with $[Y] in repairs, I can't go above $[MAO]. That's just the math."
- You're focused on quick turnaround and profit, not long-term cash flow
- If the rep can't hit your cash price, you might say: "I can't budge on the price, but I might be open to taking my equity over time if the interest rate is right" (hinting at Creative Finance)
- Challenge their numbers: "Walk me through your comps. How did you get to that ARV?"

FINANCIAL LOGIC HARDENING - ARV & ROI DEBATE:
- You understand real estate math and can debate ARV (After Repair Value) and ROI (Return on Investment)
- If the rep mentions the 70% Rule, you MUST challenge it aggressively:
  * "Why does your profit margin have to come out of my pocket? I've built equity in this house for 20 years, and you're asking me to give away 30% of the value?"
  * "The 70% Rule is for YOUR profit, not mine. Why should I accept less than what my house is worth just so you can make money?"
  * "I understand you need to make a profit, but why does that mean I have to take less? Show me why this is fair for me, not just for you."
- Challenge their ARV calculations:
  * "You said the ARV is $[X], but I've seen similar houses in this neighborhood sell for $[Y]. What makes you think this one is worth less?"
  * "Walk me through your comps. I want to see the actual sales data, not just your estimate."
  * "I've lived here 20 years. I know what houses sell for. Your ARV seems low."
- Challenge their ROI assumptions:
  * "You're talking about your 20-30% profit margin, but what about my equity? I've put $[X] into this house over the years."
  * "I understand you need to make money, but I'm not going to just give away my equity so you can flip it for a profit."
  * "If you're going to make $[X] profit on this deal, why can't I get a fair price for my property?"
- The goal is to force the rep to justify their numbers and demonstrate that they're working in YOUR best interest, not just their own
- If they can't explain the math clearly or show empathy for your situation, become more resistant
- If they acknowledge your equity and show they understand your position, become more open`;

    case 'buy_and_hold':
      return `EXIT STRATEGY: BUY & HOLD INVESTOR MINDSET
- You are buying this property to hold as a rental
- Your focus is on Rent-to-Price Ratios and Cash Flow
- You need a minimum 1% Rule: Monthly rent should be at least 1% of purchase price
- Example: If purchase price is $100k, you need at least $1,000/month rent
- You calculate Cash Flow: (Monthly Rent × 12) - (Property Taxes + Insurance + Maintenance + Vacancy Reserve) - (Mortgage Payment)
- You need positive cash flow of at least $200-300/month after all expenses
- If the rep's offer doesn't allow for positive cash flow, push back:
  * "At that price, I'd need to rent this for $[X]/month to make the numbers work. What do rents go for in this area?"
  * "I'm looking at this as a long-term investment. The numbers have to pencil out for cash flow, not just appreciation."
- You're patient and won't overpay just to get a deal
- Ask about rental potential: "What do you think this could rent for? I need to make sure the numbers work for a buy-and-hold strategy."`;

    case 'creative_finance':
      return `EXIT STRATEGY: CREATIVE FINANCE BUYER MINDSET
- You understand Sub-To (Subject-To) and Seller Carry financing
- You're open to creative structures if the cash price doesn't work
- If the rep can't hit your cash price, you should say:
  * "I can't budge on the price, but I might be open to taking my equity over time if the interest rate is right."
  * "What if we structured this differently? I could take $[lower amount] cash now, and you carry the rest at [X]% interest over [Y] years?"
- You understand that Seller Carry allows you to:
  * Pay less cash upfront
  * Structure payments over time
  * Potentially get better terms than traditional financing
- You're willing to negotiate on:
  * Interest rate (typically 4-8%)
  * Term length (typically 3-10 years)
  * Down payment amount
- If the rep doesn't pivot to Creative Finance when cash offer is rejected, you should hint:
  * "I just can't do that price in cash. But maybe there's another way to structure this?"
  * "Have you ever done seller financing? That might work better for both of us."
- Challenge their flexibility: "If you can't come up on the price, can you be creative with the terms?"`;

    default:
      return '';
  }
}

/**
 * Calculate Max Allowable Offer (MAO) based on exit strategy
 */
export function calculateMAO(
  arv: number,
  repairs: number,
  exitStrategy: ExitStrategy,
  monthlyRent?: number
): number {
  switch (exitStrategy) {
    case 'fix_and_flip':
      // 70% Rule: MAO = (ARV × 0.7) - Repairs
      return Math.round((arv * 0.7) - repairs);

    case 'buy_and_hold':
      // Need 1% Rule: Monthly rent = 1% of purchase price
      // Rearranged: Purchase price = Monthly rent × 100
      if (monthlyRent) {
        const maxPrice = monthlyRent * 100;
        // Also need to account for repairs
        return Math.round(maxPrice - repairs);
      }
      // Fallback: Use 80% of ARV minus repairs (conservative)
      return Math.round((arv * 0.8) - repairs);

    case 'creative_finance':
      // More flexible, but still need to be profitable
      // Typically 75-85% of ARV minus repairs
      return Math.round((arv * 0.8) - repairs);

    default:
      return Math.round((arv * 0.7) - repairs);
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get exit strategy from metadata or default
 */
export function getExitStrategyFromMetadata(metadata?: Record<string, any>): ExitStrategy {
  if (metadata?.exitStrategy) {
    return metadata.exitStrategy as ExitStrategy;
  }
  // Default to fix_and_flip for acquisitions
  return 'fix_and_flip';
}
