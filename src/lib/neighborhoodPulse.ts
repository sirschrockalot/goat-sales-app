/**
 * Neighborhood Pulse Service
 * Fetches recent cash comps for neighborhood context injection
 * Prepends market intelligence to system prompt before calls
 */

import logger from './logger';
import { fetchMarketComps, MarketComps } from './marketAnalyst';

export interface NeighborhoodContext {
  address: string;
  zipCode: string;
  cashComps: MarketComps[];
  marketIntelligence: string; // Formatted string for system prompt injection
  lastUpdated: string;
}

/**
 * Fetch last 3-5 cash comps for a given address
 * Returns formatted market intelligence for system prompt injection
 */
export async function getNeighborhoodPulse(
  address: string,
  zipCode: string,
  city?: string,
  state?: string
): Promise<NeighborhoodContext> {
  logger.info('Fetching neighborhood pulse', { address, zipCode });

  // Fetch market comps (last 6 months, filtered to cash sales)
  const allComps = await fetchMarketComps(
    {
      address,
      zipCode,
      city: city || '',
      state: state || '',
    },
    6
  );

  // Filter to cash sales only and take last 3-5
  const cashComps = allComps
    .filter((comp) => comp.saleType === 'cash')
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
    .slice(0, 5); // Take up to 5 most recent

  // Format as market intelligence string
  const marketIntelligence = formatMarketIntelligence(cashComps, zipCode);

  return {
    address,
    zipCode,
    cashComps,
    marketIntelligence,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Format cash comps into market intelligence string for system prompt
 */
function formatMarketIntelligence(comps: MarketComps[], zipCode: string): string {
  if (comps.length === 0) {
    return `CURRENT MARKET INTELLIGENCE (${zipCode}):\nNo recent cash comps available for this area. Use conservative 70% rule.`;
  }

  const compsList = comps
    .map((comp, index) => {
      const saleDate = new Date(comp.saleDate);
      const daysAgo = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      const cashToARV = comp.arv ? ((comp.salePrice / comp.arv) * 100).toFixed(0) : 'N/A';

      return `${index + 1}. ${comp.address}: $${comp.salePrice.toLocaleString()} cash (${cashToARV}% of ARV $${comp.arv?.toLocaleString() || 'N/A'}), ${daysAgo} days ago, ${comp.daysOnMarket} DOM`;
    })
    .join('\n');

  // Calculate average cash-to-ARV percentage
  const validComps = comps.filter((c) => c.arv && c.arv > 0);
  const avgCashToARV =
    validComps.length > 0
      ? (validComps.reduce((sum, c) => sum + (c.salePrice / (c.arv || 1)) * 100, 0) / validComps.length).toFixed(0)
      : 'N/A';

  return `CURRENT MARKET INTELLIGENCE (${zipCode}):
Last ${comps.length} Cash Sales in This Area:
${compsList}

Average Cash-to-ARV: ${avgCashToARV}%
Use this data to justify your offer. Cite specific addresses when relevant.
Example: "Looking at the last three cash sales on your street - 123 Main St sold for $75k cash at 65% of ARV, 456 Oak Ave went for $68k at 62% of ARV. That's where investors are buying in your area."`;
}

/**
 * Format as "Battle Intelligence" (tactical framing for system prompt)
 */
export function formatAsBattleIntelligence(
  comps: MarketComps[],
  zipCode: string
): string {
  if (comps.length === 0) {
    return `BATTLE INTELLIGENCE (${zipCode}):
No recent cash comps available. Use conservative 70% rule and acknowledge data limitation.`;
  }

  const compsList = comps
    .map((comp, index) => {
      const saleDate = new Date(comp.saleDate);
      const daysAgo = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      const cashToARV = comp.arv ? ((comp.salePrice / comp.arv) * 100).toFixed(0) : 'N/A';

      return `${index + 1}. ${comp.address}: $${comp.salePrice.toLocaleString()} cash (${cashToARV}% of ARV $${comp.arv?.toLocaleString() || 'N/A'}), ${daysAgo} days ago, ${comp.daysOnMarket} DOM`;
    })
    .join('\n');

  // Calculate average cash-to-ARV percentage
  const validComps = comps.filter((c) => c.arv && c.arv > 0);
  const avgCashToARV =
    validComps.length > 0
      ? (validComps.reduce((sum, c) => sum + (c.salePrice / (c.arv || 1)) * 100, 0) / validComps.length).toFixed(0)
      : 'N/A';

  return `BATTLE INTELLIGENCE (${zipCode}):
Last ${comps.length} Cash Sales in Target Area:
${compsList}

Average Cash-to-ARV: ${avgCashToARV}%
Market Heat: ${comps.length >= 3 ? 'Active' : 'Limited Data'}

USE THIS INTELLIGENCE:
- Cite specific addresses when justifying your offer
- Reference average cash-to-ARV percentage when seller pushes back
- Use recent sales dates to show market activity
- Example: "Looking at the last three cash sales on your street - 123 Main St sold for $75k cash at 65% of ARV, 456 Oak Ave went for $68k at 62% of ARV. That's where investors are buying in your area right now."`;
}

/**
 * Inject neighborhood context into system prompt
 * Prepends market intelligence before the main prompt
 */
export function injectNeighborhoodContext(
  systemPrompt: string,
  neighborhoodContext: NeighborhoodContext
): string {
  // Format as "Battle Intelligence" for tactical framing
  const battleIntelligence = formatAsBattleIntelligence(
    neighborhoodContext.cashComps,
    neighborhoodContext.zipCode
  );
  
  return `${battleIntelligence}\n\n${systemPrompt}`;
}

/**
 * Get neighborhood context for a property and inject into prompt
 * One-stop function for call preparation
 */
export async function prepareCallWithNeighborhoodContext(
  systemPrompt: string,
  address: string,
  zipCode: string,
  city?: string,
  state?: string
): Promise<{
  enhancedPrompt: string;
  context: NeighborhoodContext;
}> {
  const context = await getNeighborhoodPulse(address, zipCode, city, state);
  const enhancedPrompt = injectNeighborhoodContext(systemPrompt, context);

  return {
    enhancedPrompt,
    context,
  };
}
