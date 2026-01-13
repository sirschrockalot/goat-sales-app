/**
 * Run Training Directly from Terminal
 * Executes training battles directly against sandbox database
 * No timeout issues - runs locally until completion
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { runBattleLoop } from '../src/lib/training';
import { getBudgetStatus } from '../src/lib/budgetMonitor';
import { getSupabaseClientForEnv } from '../src/lib/env-manager';
import logger from '../src/lib/logger';

async function runTrainingDirect() {
  console.log('🚀 Running Training Directly (Local Terminal)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get batch size from command line args or use default
  const batchSizeArg = process.argv[2];
  const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 5;

  if (isNaN(batchSize) || batchSize < 1) {
    console.error('❌ Invalid batch size. Use a number >= 1');
    console.log('\nUsage: npx tsx scripts/run-training-direct.ts [batchSize]');
    console.log('Example: npx tsx scripts/run-training-direct.ts 3');
    process.exit(1);
  }

  // Initial state
  console.log('📊 Initial State');
  console.log('─────────────────────────────────────────────────────\n');

  const initialBudget = await getBudgetStatus();
  if (initialBudget) {
    console.log(`   Daily Cap: $${initialBudget.dailyCap?.toFixed(2) || '15.00'}`);
    console.log(`   Today's Spend: $${initialBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining: $${initialBudget.remaining?.toFixed(4) || '15.0000'}`);
    console.log(`   Throttled: ${initialBudget.isThrottled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Exceeded: ${initialBudget.isExceeded ? '🚨 YES' : '✅ NO'}`);
  }

  // Check personas
  const supabase = getSupabaseClientForEnv('sandbox');
  const { data: personas, count } = await supabase
    .from('sandbox_personas')
    .select('id, name', { count: 'exact' })
    .eq('is_active', true)
    .limit(batchSize);

  if (!personas || personas.length === 0) {
    console.error('❌ No active personas found!');
    console.log('   💡 Create personas first or activate existing ones');
    process.exit(1);
  }

  console.log(`   Active Personas: ${count || personas.length}`);
  console.log(`   Batch Size: ${batchSize}`);
  console.log('');

  // Start training
  console.log('🚀 Starting Training');
  console.log('─────────────────────────────────────────────────────\n');
  console.log(`   Running ${batchSize} battle(s)...`);
  console.log('   This will run until completion (no timeout)\n');

  const startTime = Date.now();

  try {
    console.log('   ⏳ Starting runBattleLoop...\n');
    
    // Run training directly - no API, no timeout
    const results = await runBattleLoop(undefined, batchSize, {
      batchSize,
      maxConcurrent: 3,
      delayBetweenBattles: 1000,
    });

    console.log(`   ✅ runBattleLoop completed, returned ${results.length} result(s)\n`);

    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Final results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Training Results');
    console.log('─────────────────────────────────────────────────────\n');

    console.log(`   Duration: ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
    console.log(`   Battles Completed: ${results.length}`);
    
    if (results.length > 0) {
      const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
      const averageScore = results.reduce((sum, r) => sum + (r.score?.totalScore || 0), 0) / results.length;
      const averageCost = totalCost / results.length;

      console.log(`   Total Cost: $${totalCost.toFixed(4)}`);
      console.log(`   Average Cost per Battle: $${averageCost.toFixed(4)}`);
      console.log(`   Average Score: ${averageScore.toFixed(1)}/100`);
      
      console.log('\n   Battle Details:');
      results.forEach((result, i) => {
        console.log(`      ${i + 1}. Score: ${result.score?.totalScore || 'N/A'}/100 | Cost: $${(result.cost || 0).toFixed(4)}`);
      });
    } else {
      console.log('   ⚠️  No battles completed');
    }

    // Final budget status
    const finalBudget = await getBudgetStatus();
    if (finalBudget) {
      const spendIncrease = (finalBudget.todaySpend || 0) - (initialBudget?.todaySpend || 0);
      console.log(`\n   Spend Increase: $${spendIncrease.toFixed(4)}`);
      console.log(`   Today's Total Spend: $${finalBudget.todaySpend?.toFixed(4) || '0.0000'}`);
      console.log(`   Remaining Budget: $${finalBudget.remaining?.toFixed(4) || '15.0000'}`);
    }

    // Check battles in database
    const { count: battleCount } = await supabase
      .from('sandbox_battles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n   Total Battles in DB: ${battleCount || 0}`);

    if (results.length > 0) {
      console.log('\n   ✅ SUCCESS! Training completed and battles were created!');
    } else {
      console.log('\n   ⚠️  Training completed but no battles were returned');
      console.log('   💡 Check logs for errors');
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('❌ Training Error');
    console.log('─────────────────────────────────────────────────────\n');
    console.log(`   Duration before error: ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
    console.log(`   Error: ${error.message || String(error)}`);
    
    if (error.stack) {
      console.log(`\n   Stack trace:`);
      console.log(`   ${error.stack.split('\n').slice(0, 5).join('\n   ')}`);
    }

    // Check if any battles were created despite the error
    const { count: battleCount } = await supabase
      .from('sandbox_battles')
      .select('*', { count: 'exact', head: true });

    if (battleCount && battleCount > 0) {
      console.log(`\n   ⚠️  Note: ${battleCount} battle(s) were created before the error`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  runTrainingDirect().catch((error) => {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  });
}

export { runTrainingDirect };
