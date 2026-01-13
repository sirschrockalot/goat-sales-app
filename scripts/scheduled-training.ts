/**
 * Scheduled Training Script
 * Designed to be run by cron or scheduler
 * Executes a single training batch and logs results
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local first (override any existing env vars)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

// Also try .env.development as fallback
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_ope')) {
  const devEnvPath = path.join(process.cwd(), '.env.development');
  if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath, override: true });
  }
}

import { runBattleLoop } from '../src/lib/training';
import { getBudgetStatus } from '../src/lib/budgetMonitor';
import { getSupabaseClientForEnv } from '../src/lib/env-manager';
import logger from '../src/lib/logger';

// Default batch size (can be overridden via CLI arg)
const DEFAULT_BATCH_SIZE = 5;

async function runScheduledTraining() {
  const batchSize = parseInt(process.argv[2] || String(DEFAULT_BATCH_SIZE), 10);
  const startTime = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Scheduled Training Batch - ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Check budget before starting
    const budgetStatus = await getBudgetStatus();
    
    if (budgetStatus.isExceeded) {
      console.log('❌ Budget exceeded. Skipping training batch.');
      console.log(`   Daily Spend: $${budgetStatus.dailySpend.toFixed(2)}`);
      console.log(`   Daily Cap: $${budgetStatus.dailySpend.toFixed(2)}\n`);
      process.exit(0); // Exit gracefully, don't treat as error
    }

    console.log(`📊 Budget Status:`);
    console.log(`   Daily Spend: $${budgetStatus.dailySpend.toFixed(4)}`);
    console.log(`   Remaining: $${budgetStatus.remaining.toFixed(4)}`);
    console.log(`   Throttled: ${budgetStatus.isThrottled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Batch Size: ${batchSize}\n`);

    // Run training batch
    console.log(`🚀 Starting training batch...\n`);
    const results = await runBattleLoop(undefined, batchSize, {
      batchSize,
      maxConcurrent: 3,
      delayBetweenBattles: 1000,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    // Calculate totals
    const battlesCompleted = results.length;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    const avgScore = battlesCompleted > 0
      ? results.reduce((sum, r) => sum + (r.score?.totalScore || 0), 0) / battlesCompleted
      : 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Training Batch Complete`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Battles Completed: ${battlesCompleted}`);
    console.log(`   Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`   Average Score: ${avgScore.toFixed(1)}/100`);
    
    if (battlesCompleted > 0) {
      console.log(`\n   Battle Results:`);
      results.forEach((result, idx) => {
        console.log(`     ${idx + 1}. Score: ${result.score?.totalScore || 'N/A'}/100 | Cost: $${(result.cost || 0).toFixed(4)}`);
      });
    }

    // Get updated budget status
    const finalBudget = await getBudgetStatus();
    console.log(`\n   Updated Budget:`);
    console.log(`   Daily Spend: $${finalBudget.dailySpend.toFixed(4)}`);
    console.log(`   Remaining: $${finalBudget.remaining.toFixed(4)}`);
    console.log(`${'='.repeat(60)}\n`);

    // Log to file for monitoring
    const logEntry = {
      timestamp: new Date().toISOString(),
      batchSize,
      battlesCompleted,
      totalCost,
      avgScore,
      duration,
      dailySpend: finalBudget.dailySpend,
      remaining: finalBudget.remaining,
    };

    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'training-schedule.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    logger.info('Scheduled training batch completed', logEntry);

    // Exit with success
    process.exit(0);

  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`\n❌ Training batch failed after ${duration}s`);
    console.error(`   Error: ${error.message || String(error)}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    logger.error('Scheduled training batch failed', {
      error: error.message || String(error),
      stack: error.stack,
      duration,
      batchSize,
    });

    // Exit with error code (cron will log this)
    process.exit(1);
  }
}

// Run if called directly
// Check if this file is being executed directly (not imported)
const isMainModule = process.argv[1] && process.argv[1].endsWith('scheduled-training.ts');
if (isMainModule) {
  runScheduledTraining().catch((error) => {
    console.error('Fatal error in scheduled training:', error);
    process.exit(1);
  });
}

export { runScheduledTraining };
