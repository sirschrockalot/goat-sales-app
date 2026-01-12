/**
 * Start Tactical Scout Service
 * Background service that monitors for breakthrough sessions (score >= 95)
 */

import { initializeTacticalScout, scanExistingBreakthroughs } from '../src/lib/tacticalScout';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';

async function main() {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  logger.info('Starting Tactical Scout Service...');

  // First, scan existing battles for breakthroughs
  try {
    const processed = await scanExistingBreakthroughs();
    logger.info('Initial scan complete', { processed });
  } catch (error) {
    logger.error('Error in initial scan', { error });
  }

  // Initialize Realtime subscription
  const cleanup = initializeTacticalScout();

  // Keep process alive
  logger.info('Tactical Scout Service running. Monitoring for breakthroughs...');
  logger.info('Press Ctrl+C to stop');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down Tactical Scout...');
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down Tactical Scout...');
    cleanup();
    process.exit(0);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Fatal error in Tactical Scout', { error });
    process.exit(1);
  });
}
