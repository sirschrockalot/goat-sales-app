/**
 * Batch Audit Humanity Grades
 * Audits existing battles that don't have humanity grades yet
 * Works with transcripts only (no audio files needed)
 */

// Load environment variables from .env files
// Try .env.local first (for local development), then fall back to .env
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local if it exists, otherwise load .env
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Default behavior
}

import logger from '../src/lib/logger';
import { auditVocalSoul, checkAndInjectFeedback } from './vocalSoulAuditor';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import { createClient } from '@supabase/supabase-js';

// Initialize environment (required for Supabase)
const config = getEnvironmentConfig();
assertSandboxMode(config);

// Validate config has required values
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error(
    `Missing Supabase credentials. Required:\n` +
    `  - SUPABASE_SANDBOX_URL or NEXT_PUBLIC_SUPABASE_URL\n` +
    `  - SUPABASE_SERVICE_ROLE_KEY\n` +
    `Current values: url=${!!config.supabase.url}, serviceKey=${!!config.supabase.serviceRoleKey}`
  );
}

// Create Supabase admin client using environment config
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface Battle {
  id: string;
  transcript: string;
  referee_score: number;
  humanity_grade: number | null;
}

/**
 * Batch audit battles without humanity grades
 */
async function batchAuditHumanityGrades(options: {
  limit?: number;
  minScore?: number;
  dryRun?: boolean;
} = {}) {
  const { limit = 50, minScore = 0, dryRun = false } = options;

  logger.info('Starting batch humanity grade audit', { limit, minScore, dryRun });

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Fetch battles without humanity grades
  const { data: battles, error } = await supabaseAdmin
    .from('sandbox_battles')
    .select('id, transcript, referee_score, humanity_grade')
    .is('humanity_grade', null)
    .gte('referee_score', minScore)
    .not('transcript', 'is', null)
    .limit(limit)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching battles', { error });
    throw error;
  }

  if (!battles || battles.length === 0) {
    logger.info('No battles found to audit');
    return {
      total: 0,
      audited: 0,
      errors: 0,
    };
  }

  logger.info(`Found ${battles.length} battles to audit`);

  if (dryRun) {
    logger.info('DRY RUN - Would audit the following battles:', {
      battleIds: battles.map((b) => b.id),
      count: battles.length,
    });
    return {
      total: battles.length,
      audited: 0,
      errors: 0,
      dryRun: true,
    };
  }

  // Audit each battle
  let audited = 0;
  let errors = 0;
  const results: Array<{
    battleId: string;
    success: boolean;
    humanityGrade?: number;
    error?: string;
  }> = [];

  for (const battle of battles) {
    try {
      if (!battle.transcript || battle.transcript.trim().length === 0) {
        logger.warn('Skipping battle with empty transcript', { battleId: battle.id });
        errors++;
        results.push({
          battleId: battle.id,
          success: false,
          error: 'Empty transcript',
        });
        continue;
      }

      logger.info(`Auditing battle ${battle.id}`, {
        battleId: battle.id,
        score: battle.referee_score,
        transcriptLength: battle.transcript.length,
      });

      // Audit the battle (transcript-only, no audio file needed)
      const auditResult = await auditVocalSoul(
        undefined, // No audio file - uses transcript analysis
        battle.transcript,
        battle.id
      );

      logger.info('Audit complete', {
        battleId: battle.id,
        humanityGrade: auditResult.humanityGrade,
        closenessToCline: auditResult.closenessToCline,
      });

      // Check if feedback injection is needed
      if (auditResult.humanityGrade < 85) {
        await checkAndInjectFeedback(auditResult.humanityGrade);
        logger.info('Feedback injected', {
          battleId: battle.id,
          humanityGrade: auditResult.humanityGrade,
        });
      }

      audited++;
      results.push({
        battleId: battle.id,
        success: true,
        humanityGrade: auditResult.humanityGrade,
      });

      // Small delay to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error('Error auditing battle', {
        battleId: battle.id,
        error,
      });
      errors++;
      results.push({
        battleId: battle.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Summary
  const summary = {
    total: battles.length,
    audited,
    errors,
    results,
  };

  logger.info('Batch audit complete', summary);

  // Print summary
  console.log('\n📊 Batch Humanity Grade Audit Summary:');
  console.log(`Total battles found: ${battles.length}`);
  console.log(`Successfully audited: ${audited}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nHumanity Grade Distribution:`);

  const grades = results
    .filter((r) => r.success && r.humanityGrade !== undefined)
    .map((r) => r.humanityGrade!);

  if (grades.length > 0) {
    const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    console.log(`  Average: ${avg.toFixed(1)}`);
    console.log(`  Min: ${min}`);
    console.log(`  Max: ${max}`);
  }

  return summary;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const minScoreArg = args.find((arg) => arg.startsWith('--min-score='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
  const minScore = minScoreArg ? parseInt(minScoreArg.split('=')[1]) : 0;

  try {
    await batchAuditHumanityGrades({
      limit,
      minScore,
      dryRun,
    });
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error in batch audit', { error });
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { batchAuditHumanityGrades };
