/**
 * Pre-Call Research Script
 * Fetches Neighborhood Pulse (last 5 cash sales) and injects as "Battle Intelligence"
 * Wrapper for neighborhood context injection before calls
 */

import { prepareCallWithNeighborhoodContext } from '../src/lib/neighborhoodPulse';
import logger from '../src/lib/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

interface PreCallResearchResult {
  systemPrompt: string;
  neighborhoodContext: {
    address: string;
    zipCode: string;
    cashComps: any[];
    marketIntelligence: string;
  };
  battleIntelligence: string; // Formatted for system prompt
}

/**
 * Fetch Neighborhood Pulse and format as "Battle Intelligence"
 */
export async function getBattleIntelligence(
  propertyAddress: string,
  zipCode: string,
  city?: string,
  state?: string
): Promise<string> {
  logger.info('Fetching Battle Intelligence', { propertyAddress, zipCode });

  const { context } = await prepareCallWithNeighborhoodContext(
    '', // Will be injected into actual system prompt
    propertyAddress,
    zipCode,
    city,
    state
  );

  // Format as "Battle Intelligence" (more tactical framing)
  const battleIntelligence = formatBattleIntelligence(context);

  return battleIntelligence;
}

/**
 * Format market intelligence as "Battle Intelligence" for system prompt
 */
function formatBattleIntelligence(context: {
  address: string;
  zipCode: string;
  cashComps: any[];
  marketIntelligence: string;
}): string {
  if (context.cashComps.length === 0) {
    return `BATTLE INTELLIGENCE (${context.zipCode}):
No recent cash comps available. Use conservative 70% rule and acknowledge data limitation.`;
  }

  const compsList = context.cashComps
    .map((comp, index) => {
      const saleDate = new Date(comp.saleDate);
      const daysAgo = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      const cashToARV = comp.arv ? ((comp.salePrice / comp.arv) * 100).toFixed(0) : 'N/A';

      return `${index + 1}. ${comp.address}: $${comp.salePrice.toLocaleString()} cash (${cashToARV}% of ARV $${comp.arv?.toLocaleString() || 'N/A'}), ${daysAgo} days ago, ${comp.daysOnMarket} DOM`;
    })
    .join('\n');

  // Calculate average cash-to-ARV percentage
  const validComps = context.cashComps.filter((c) => c.arv && c.arv > 0);
  const avgCashToARV =
    validComps.length > 0
      ? (validComps.reduce((sum, c) => sum + (c.salePrice / (c.arv || 1)) * 100, 0) / validComps.length).toFixed(0)
      : 'N/A';

  return `BATTLE INTELLIGENCE (${context.zipCode}):
Last ${context.cashComps.length} Cash Sales in Target Area:
${compsList}

Average Cash-to-ARV: ${avgCashToARV}%
Market Heat: ${context.cashComps.length >= 3 ? 'Active' : 'Limited Data'}

USE THIS INTELLIGENCE:
- Cite specific addresses when justifying your offer
- Reference average cash-to-ARV percentage when seller pushes back
- Use recent sales dates to show market activity
- Example: "Looking at the last three cash sales on your street - 123 Main St sold for $75k cash at 65% of ARV, 456 Oak Ave went for $68k at 62% of ARV. That's where investors are buying in your area right now."`;
}

/**
 * Prepare system prompt with Battle Intelligence injection
 * Main function for pre-call research
 */
export async function prepareSystemPromptWithBattleIntelligence(
  baseSystemPrompt: string,
  propertyAddress: string,
  zipCode: string,
  city?: string,
  state?: string
): Promise<PreCallResearchResult> {
  logger.info('Preparing system prompt with Battle Intelligence', {
    propertyAddress,
    zipCode,
  });

  // Fetch neighborhood context
  const { enhancedPrompt, context } = await prepareCallWithNeighborhoodContext(
    baseSystemPrompt,
    propertyAddress,
    zipCode,
    city,
    state
  );

  // Format as Battle Intelligence
  const battleIntelligence = formatBattleIntelligence(context);

  return {
    systemPrompt: enhancedPrompt,
    neighborhoodContext: {
      address: context.address,
      zipCode: context.zipCode,
      cashComps: context.cashComps,
      marketIntelligence: context.marketIntelligence,
    },
    battleIntelligence,
  };
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: tsx scripts/preCallResearch.ts <propertyAddress> <zipCode> [city] [state]');
    console.error('Example: tsx scripts/preCallResearch.ts "123 Main St" "12345" "City" "State"');
    process.exit(1);
  }

  const propertyAddress = args[0];
  const zipCode = args[1];
  const city = args[2];
  const state = args[3];

  try {
    // Read base prompt
    const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
    let basePrompt = '';
    
    if (await fs.pathExists(basePromptPath)) {
      basePrompt = await fs.readFile(basePromptPath, 'utf-8');
    } else {
      console.error('base_prompt.txt not found');
      process.exit(1);
    }

    // Prepare with Battle Intelligence
    const result = await prepareSystemPromptWithBattleIntelligence(
      basePrompt,
      propertyAddress,
      zipCode,
      city,
      state
    );

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 BATTLE INTELLIGENCE INJECTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.battleIntelligence);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ System prompt prepared with ${result.neighborhoodContext.cashComps.length} cash comps`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error preparing Battle Intelligence:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { getBattleIntelligence, prepareSystemPromptWithBattleIntelligence };
