/**
 * Promotion Script
 * Flags high-score battles and promotes winning tactics to production
 */

import { autoPromoteHighScoreTactics, getTacticsReadyForPromotion } from '../src/lib/promotionService';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';

async function main() {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  logger.info('Starting tactic promotion process...');

  try {
    // Get tactics ready for promotion
    const readyTactics = await getTacticsReadyForPromotion();
    logger.info('Tactics ready for promotion', { count: readyTactics.length });

    // Auto-promote high-score tactics
    const result = await autoPromoteHighScoreTactics();

    console.log(`\n✅ Promotion complete:`);
    console.log(`   Flagged: ${result.flagged}`);
    console.log(`   Promoted: ${result.promoted}`);

    if (result.promoted > 0) {
      console.log(`\n🎉 ${result.promoted} tactics have been promoted to production_base_prompt.txt`);
    }
  } catch (error) {
    logger.error('Error promoting tactics', { error });
    console.error('❌ Error promoting tactics:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
