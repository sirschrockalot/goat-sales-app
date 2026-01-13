/**
 * Test Training via GET Endpoint
 * Uses GET endpoint which waits for completion (up to 3 minutes)
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

async function testTrainingWithGET() {
  console.log('🚀 Testing Training via GET Endpoint (waits for completion)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initial state
  console.log('📊 Initial State');
  console.log('─────────────────────────────────────────────────────\n');

  const initialBattles = await checkBattles();
  const initialBudget = await getBudgetStatus();

  console.log(`   Current Battles in DB: ${initialBattles}`);
  if (initialBudget) {
    console.log(`   Today's Spend: $${initialBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    console.log(`   Remaining: $${initialBudget.remaining?.toFixed(4) || '15.0000'}`);
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

  // Trigger training via GET endpoint
  console.log('🚀 Starting Training (GET endpoint - waits for completion)');
  console.log('─────────────────────────────────────────────────────\n');
  console.log('   This will wait up to 3 minutes for training to complete...');
  console.log('   Batch Size: 1 battle\n');

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

    console.log('   ⏳ Calling GET /api/cron/train...\n');

    const response = await fetch(`${appUrl}/api/cron/train?batchSize=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    console.log(`   ✅ Response received after ${elapsedMinutes}m ${elapsedSeconds % 60}s\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText}\n`);
      return;
    }

    const result = await response.json();
    
    console.log('📊 Training Results');
    console.log('─────────────────────────────────────────────────────\n');
    console.log(`   Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Battles Completed: ${result.batch?.battlesCompleted || 0}`);
    console.log(`   Total Cost: $${result.batch?.totalCost?.toFixed(4) || '0.0000'}`);
    console.log(`   Average Score: ${result.batch?.averageScore?.toFixed(1) || '0'}/100`);
    console.log(`   Batch ID: ${result.batch?.batchId || 'N/A'}`);
    
    if (result.batch?.errors && result.batch.errors.length > 0) {
      console.log(`\n   ⚠️  Errors: ${result.batch.errors.length}`);
      result.batch.errors.forEach((error: string, i: number) => {
        console.log(`      ${i + 1}. ${error}`);
      });
    }

    console.log(`\n   Message: ${result.message || 'N/A'}\n`);

    // Check final state
    console.log('📊 Final State');
    console.log('─────────────────────────────────────────────────────\n');

    const finalBattles = await checkBattles();
    const finalBudget = await getBudgetStatus();
    const newBattles = finalBattles - initialBattles;

    console.log(`   Battles Created: ${newBattles}`);
    console.log(`   Total Battles in DB: ${finalBattles}`);

    if (finalBudget) {
      const spendIncrease = (finalBudget.todaySpend || 0) - (initialBudget?.todaySpend || 0);
      console.log(`   Spend Increase: $${spendIncrease.toFixed(4)}`);
      console.log(`   Today's Total Spend: $${finalBudget.todaySpend?.toFixed(4) || '0.0000'}`);
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (result.batch?.battlesCompleted > 0) {
      console.log('✅ SUCCESS! Training completed and battles were created!');
      console.log(`   ${result.batch.battlesCompleted} battle(s) completed`);
    } else if (newBattles > 0) {
      console.log('✅ SUCCESS! Battles were created (even though API reported 0)');
      console.log(`   ${newBattles} new battle(s) found in database`);
    } else {
      console.log('⚠️  No battles were created');
      console.log('   Possible reasons:');
      console.log('   1. Training is still running in background');
      console.log('   2. Battles failed before completion');
      console.log('   3. Error occurred during training');
      if (result.batch?.errors && result.batch.errors.length > 0) {
        console.log('   4. Check errors above');
      }
    }
    console.log('');

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    if (error.name === 'AbortError') {
      console.log(`\n   ⏱️  Request timed out after ${elapsedMinutes}m ${elapsedSeconds % 60}s`);
      console.log('   Training may still be running in background');
      console.log('   Checking for battles that were created...\n');
    } else {
      console.log(`\n   ❌ Error: ${error.message}`);
      console.log(`   Stack: ${error.stack}\n`);
    }

    // Check if any battles were created despite the error
    const finalBattles = await checkBattles();
    const newBattles = finalBattles - initialBattles;

    if (newBattles > 0) {
      console.log(`   ✅ Found ${newBattles} new battle(s) in database!`);
      console.log('   Training may have completed despite the timeout/error');
    } else {
      console.log('   ⚠️  No new battles found');
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testTrainingWithGET().catch((error) => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
