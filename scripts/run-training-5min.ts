/**
 * Run Training for 5 Minutes
 * Triggers training and monitors progress for 5 minutes
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
  });

  return env;
}

const env = loadEnvFile();
const appUrl = process.env.HEROKU_APP_URL || 'https://goat-sales-app-82e296b21c05.herokuapp.com';
const cronSecret = process.env.CRON_SECRET || env.CRON_SECRET;

if (!cronSecret) {
  console.error('❌ CRON_SECRET not found');
  process.exit(1);
}

const DURATION_MINUTES = 5;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds

interface TrainingStats {
  startTime: Date;
  battlesCompleted: number;
  totalCost: number;
  averageScore: number;
  batchesRun: number;
  errors: string[];
  lastUpdate: Date;
}

async function triggerTraining(batchSize: number = 3): Promise<any> {
  try {
    const response = await fetch(`${appUrl}/api/cron/train`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchSize }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        return { error: JSON.parse(errorText), status: response.status };
      } catch {
        return { error: errorText, status: response.status };
      }
    }

    return await response.json();
  } catch (error: any) {
    return { error: (error as Error).message };
  }
}

async function getBudgetStatus(): Promise<any> {
  try {
    const response = await fetch(`${appUrl}/api/sandbox/budget-status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getRecentBattles(count: number = 10): Promise<any[]> {
  // We can't directly query the database from here, but we can check via API if available
  // For now, we'll rely on the training batch results
  return [];
}

async function runTrainingFor5Minutes() {
  console.log('🚀 Running Training for 5 Minutes\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initial state
  console.log('📊 Initial State');
  console.log('─────────────────────────────────────────────────────\n');

  const initialBudget = await getBudgetStatus();
  if (initialBudget) {
    console.log(`   Daily Cap: $${initialBudget.dailyCap?.toFixed(2) || '15.00'}`);
    console.log(`   Today's Spend: $${initialBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining: $${initialBudget.remaining?.toFixed(4) || '15.0000'}`);
    console.log(`   Percentage Used: ${initialBudget.percentageUsed?.toFixed(2) || '0.00'}%`);
    console.log(`   Throttled: ${initialBudget.isThrottled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Exceeded: ${initialBudget.isExceeded ? '🚨 YES' : '✅ NO'}`);
  } else {
    console.log('   ⚠️  Could not fetch budget status');
  }
  console.log('');

  // Check kill-switch
  try {
    const killSwitchResponse = await fetch(`${appUrl}/api/sandbox/kill-switch`);
    if (killSwitchResponse.ok) {
      const killSwitch = await killSwitchResponse.json();
      if (killSwitch.active) {
        console.log('   🚨 Kill-switch is ACTIVE - Training will be blocked!');
        console.log('   💡 Deactivate kill-switch first to run training.\n');
        return;
      }
    }
  } catch (error) {
    // Continue if we can't check
  }

  // Start training
  console.log('🚀 Starting Training');
  console.log('─────────────────────────────────────────────────────\n');

  const stats: TrainingStats = {
    startTime: new Date(),
    battlesCompleted: 0,
    totalCost: 0,
    averageScore: 0,
    batchesRun: 0,
    errors: [],
    lastUpdate: new Date(),
  };

  console.log(`   Duration: ${DURATION_MINUTES} minutes`);
  console.log(`   Batch Size: 3 battles per batch`);
  console.log(`   Monitoring interval: ${CHECK_INTERVAL_MS / 1000} seconds\n`);
  console.log('   Starting training batches...\n');

  // Trigger initial batch
  let batchNumber = 0;
  const batchPromises: Promise<any>[] = [];

  // Function to trigger a batch
  const triggerBatch = async () => {
    batchNumber++;
    const batchResult = await triggerTraining(3);
    
    if (batchResult.error) {
      if (batchResult.error.includes('Budget Limit Reached') || 
          batchResult.error.includes('Training paused') ||
          batchResult.status === 503) {
        stats.errors.push(`Batch ${batchNumber}: ${batchResult.error || 'Training blocked'}`);
        return null;
      }
      stats.errors.push(`Batch ${batchNumber}: ${batchResult.error}`);
      return null;
    }

    stats.batchesRun++;
    if (batchResult.batch) {
      stats.battlesCompleted += batchResult.batch.battlesCompleted || 0;
      stats.totalCost += batchResult.batch.totalCost || 0;
      
      if (batchResult.batch.battlesCompleted > 0) {
        const currentAvg = stats.averageScore;
        const newAvg = batchResult.batch.averageScore || 0;
        const totalBattles = stats.battlesCompleted;
        stats.averageScore = ((currentAvg * (totalBattles - (batchResult.batch.battlesCompleted || 0))) + 
                              (newAvg * (batchResult.batch.battlesCompleted || 0))) / totalBattles;
      }
    }

    return batchResult;
  };

  // Start first batch
  const firstBatch = await triggerBatch();
  if (!firstBatch || firstBatch.error) {
    console.log('   ❌ Failed to start training:', firstBatch?.error || 'Unknown error');
    return;
  }

  console.log(`   ✅ Batch 1 started (running in background)\n`);

  // Monitor for 5 minutes
  const endTime = Date.now() + DURATION_MS;
  let lastCheck = Date.now();
  let nextBatchTime = Date.now() + 30000; // Trigger next batch every 30 seconds

  console.log('📊 Monitoring Progress');
  console.log('─────────────────────────────────────────────────────\n');

  while (Date.now() < endTime) {
    const elapsed = Date.now() - stats.startTime.getTime();
    const remaining = endTime - Date.now();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    const remainingMinutes = Math.floor(remaining / 60000);
    const remainingSeconds = Math.floor((remaining % 60000) / 1000);

    // Trigger new batch every 30 seconds
    if (Date.now() >= nextBatchTime && batchNumber < 10) { // Limit to 10 batches max
      triggerBatch().catch(err => {
        stats.errors.push(`Batch ${batchNumber + 1}: ${err.message}`);
      });
      nextBatchTime = Date.now() + 30000;
    }

    // Check budget status every 10 seconds
    if (Date.now() - lastCheck >= CHECK_INTERVAL_MS) {
      const budget = await getBudgetStatus();
      
      if (budget) {
        const costPerBattle = stats.battlesCompleted > 0 
          ? (stats.totalCost / stats.battlesCompleted).toFixed(4)
          : '0.0000';
        
        console.log(`   [${elapsedMinutes}m ${elapsedSeconds}s] Battles: ${stats.battlesCompleted} | ` +
                   `Cost: $${stats.totalCost.toFixed(4)} | ` +
                   `Avg: $${costPerBattle}/battle | ` +
                   `Today: $${budget.todaySpend?.toFixed(4) || '0.0000'} | ` +
                   `Remaining: ${remainingMinutes}m ${remainingSeconds}s`);
      }

      lastCheck = Date.now();
    }

    // Check for kill-switch
    try {
      const killSwitchResponse = await fetch(`${appUrl}/api/sandbox/kill-switch`);
      if (killSwitchResponse.ok) {
        const killSwitch = await killSwitchResponse.json();
        if (killSwitch.active) {
          console.log('\n   🚨 Kill-switch activated! Training stopped.');
          break;
        }
      }
    } catch (error) {
      // Continue monitoring
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Final Results');
  console.log('─────────────────────────────────────────────────────\n');

  const finalBudget = await getBudgetStatus();
  const totalElapsed = Date.now() - stats.startTime.getTime();
  const elapsedMinutes = Math.floor(totalElapsed / 60000);
  const elapsedSeconds = Math.floor((totalElapsed % 60000) / 1000);

  console.log(`   Duration: ${elapsedMinutes}m ${elapsedSeconds}s`);
  console.log(`   Batches Run: ${stats.batchesRun}`);
  console.log(`   Battles Completed: ${stats.battlesCompleted}`);
  console.log(`   Total Cost (this session): $${stats.totalCost.toFixed(4)}`);
  console.log(`   Average Cost per Battle: $${stats.battlesCompleted > 0 ? (stats.totalCost / stats.battlesCompleted).toFixed(4) : '0.0000'}`);
  console.log(`   Average Score: ${stats.averageScore.toFixed(1)}/100`);

  if (finalBudget) {
    console.log(`\n   Today's Total Spend: $${finalBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining Budget: $${finalBudget.remaining?.toFixed(4) || '15.0000'}`);
    console.log(`   Percentage Used: ${finalBudget.percentageUsed?.toFixed(2) || '0.00'}%`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n   ⚠️  Errors: ${stats.errors.length}`);
    stats.errors.forEach((error, i) => {
      console.log(`      ${i + 1}. ${error}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Training session complete!');
  console.log('');
  console.log('💡 Note: Battles run in background, so some may still be completing.');
  console.log('   Check the Training Monitor dashboard for final results.');
  console.log('');
}

runTrainingFor5Minutes().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
