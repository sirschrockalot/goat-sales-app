/**
 * Scan Breakthroughs Script
 * One-time scan of existing battles for breakthroughs
 */

import { scanExistingBreakthroughs } from '../src/lib/tacticalScout';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';

async function main() {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  logger.info('Scanning existing battles for breakthroughs...');

  try {
    const processed = await scanExistingBreakthroughs();
    console.log(`\n✅ Scan complete: Processed ${processed} breakthroughs`);
    process.exit(0);
  } catch (error) {
    logger.error('Error scanning breakthroughs', { error });
    console.error('❌ Error scanning breakthroughs:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
