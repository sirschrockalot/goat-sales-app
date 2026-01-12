/**
 * Golden Samples Script
 * Auto-saves battles with score > 95 as golden samples for promotion
 */

import { autoSaveGoldenSamples, getGoldenSamples } from '../src/lib/promotionService';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';

async function main() {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  logger.info('Starting golden sample processing...');

  try {
    // Get golden samples
    const goldenSamples = await getGoldenSamples();
    console.log(`\n📊 Found ${goldenSamples.length} golden samples (score > 95)`);

    // Auto-save them
    const result = await autoSaveGoldenSamples();

    console.log(`\n✅ Golden Sample Processing Complete:`);
    console.log(`   Saved: ${result.saved}`);
    console.log(`   Suggested: ${result.suggested}`);

    if (result.saved > 0) {
      console.log(`\n🎉 ${result.saved} golden samples have been saved with priority 8`);
      console.log(`   Review them in the Training Dashboard for promotion to production`);
    }
  } catch (error) {
    logger.error('Error processing golden samples', { error });
    console.error('❌ Error processing golden samples:', error);
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
