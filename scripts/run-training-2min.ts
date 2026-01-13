/**
 * Run Training for 2 Minutes
 * Triggers training and monitors progress for 2 minutes
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

const DURATION_MINUTES = 2;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

interface TrainingStats {
  startTime: Date;
  battlesCompleted: number;
  totalCost: number;
  batchesRun: number;
  errors: string[];
}

async function triggerTraining(batchSize: number = 2): Promise<any> {
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

async function checkBattles(): Promise<number> {
  try {
    const response = await fetch(`${appUrl}/api/sandbox/battles?limit=10`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.battles?.length || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

async function runTrainingFor2Minutes() {
  console.log('🚀 Running Training for 2 Minutes\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initial state
  console.log('📊 Initial State');
  console.log('─────────────────────────────────────────────────────\n');

  const initialBudget = await getBudgetStatus();
  const initialBattles = await checkBattles();
  
  if (initialBudget) {
    console.log(`   Daily Cap: $${initialBudget.dailyCap?.toFixed(2) || '15.00'}`);
    console.log(`   Today's Spend: $${initialBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining: $${initialBudget.remaining?.toFixed(4) || '15.0000'}`);
    console.log(`   Throttled: ${initialBudget.isThrottled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Exceeded: ${initialBudget.isExceeded ? '🚨 YES' : '✅ NO'}`);
  }
  console.log(`   Current Battles in DB: ${initialBattles}`);
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
    batchesRun: 0,
    errors: [],
  };

  console.log(`   Duration: ${DURATION_MINUTES} minutes`);
  console.log(`   Batch Size: 2 battles per batch`);
  console.log(`   Monitoring interval: ${CHECK_INTERVAL_MS / 1000} seconds\n`);

  // Trigger initial batch
  console.log('   Triggering first batch...');
  const firstBatch = await triggerTraining(2);
  
  if (firstBatch.error) {
    console.log(`   ❌ Failed to start training: ${firstBatch.error}`);
    if (firstBatch.status === 503) {
      console.log('   💡 Training is blocked (kill-switch or budget limit)');
    }
    return;
  }

  console.log(`   ✅ Batch 1 started (running in background)\n`);

  // Monitor for 2 minutes
  const endTime = Date.now() + DURATION_MS;
  let lastCheck = Date.now();
  let lastBattleCount = initialBattles;
  let lastSpend = initialBudget?.todaySpend || 0;

  console.log('📊 Monitoring Progress');
  console.log('─────────────────────────────────────────────────────\n');

  while (Date.now() < endTime) {
    const elapsed = Date.now() - stats.startTime.getTime();
    const remaining = endTime - Date.now();
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const remainingSeconds = Math.floor(remaining / 1000);

    // Check status every 5 seconds
    if (Date.now() - lastCheck >= CHECK_INTERVAL_MS) {
      const budget = await getBudgetStatus();
      const battleCount = await checkBattles();
      const newBattles = battleCount - lastBattleCount;
      const spendIncrease = (budget?.todaySpend || 0) - lastSpend;

      if (budget) {
        console.log(`   [${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s] ` +
                   `Battles: ${battleCount} (+${newBattles}) | ` +
                   `Spend: $${budget.todaySpend?.toFixed(4) || '0.0000'} (+$${spendIncrease.toFixed(4)}) | ` +
                   `Remaining: ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`);
      }

      if (newBattles > 0) {
        stats.battlesCompleted += newBattles;
        console.log(`   🎉 ${newBattles} new battle(s) detected!`);
      }

      lastBattleCount = battleCount;
      lastSpend = budget?.todaySpend || 0;
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
  const finalBattles = await checkBattles();
  const totalElapsed = Date.now() - stats.startTime.getTime();
  const elapsedMinutes = Math.floor(totalElapsed / 60000);
  const elapsedSeconds = Math.floor((totalElapsed % 60000) / 1000);

  console.log(`   Duration: ${elapsedMinutes}m ${elapsedSeconds}s`);
  console.log(`   Battles Created: ${finalBattles - initialBattles}`);
  console.log(`   Total Battles in DB: ${finalBattles}`);

  if (finalBudget) {
    const spendIncrease = (finalBudget.todaySpend || 0) - (initialBudget?.todaySpend || 0);
    console.log(`\n   Spend Increase: $${spendIncrease.toFixed(4)}`);
    console.log(`   Today's Total Spend: $${finalBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining Budget: $${finalBudget.remaining?.toFixed(4) || '15.0000'}`);
  }

  if (finalBattles > initialBattles) {
    console.log('\n   ✅ SUCCESS! Battles are being created!');
  } else {
    console.log('\n   ⚠️  No new battles detected.');
    console.log('   💡 Training may still be running in background.');
    console.log('   💡 Check Heroku logs for errors.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTrainingFor2Minutes().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
