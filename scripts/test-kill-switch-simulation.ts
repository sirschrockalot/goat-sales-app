/**
 * Kill-Switch Simulation Test
 * Simulates a training session to verify kill-switch activates automatically
 * 
 * Options:
 * 1. Dry-run simulation (no actual API calls)
 * 2. Real test with lowered budget cap (uses real training)
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

// Simulation parameters
const SIMULATION_MODE = process.argv.includes('--simulate') || process.argv.includes('-s');
const TEST_BUDGET_CAP = 0.10; // $0.10 for testing (very low to trigger quickly)

interface SimulationState {
  currentSpend: number;
  battlesRun: number;
  killSwitchActive: boolean;
  budgetExceeded: boolean;
  logs: string[];
}

async function checkKillSwitchStatus(): Promise<{ active: boolean; activatedAt?: string }> {
  try {
    const response = await fetch(`${appUrl}/api/sandbox/kill-switch`);
    if (response.ok) {
      return await response.json();
    }
    return { active: false };
  } catch (error) {
    return { active: false };
  }
}

async function triggerTraining(batchSize: number = 1): Promise<any> {
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
        return JSON.parse(errorText);
      } catch {
        return { error: errorText, status: response.status };
      }
    }

    return await response.json();
  } catch (error: any) {
    return { error: (error as Error).message };
  }
}

async function getCurrentSpend(): Promise<number> {
  try {
    const response = await fetch(`${appUrl}/api/sandbox/budget-status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.todaySpend || 0;
    }
  } catch (error) {
    // API might require auth, that's okay
  }
  return 0;
}

async function simulateTrainingSession() {
  console.log('🧪 Kill-Switch Simulation Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (SIMULATION_MODE) {
    console.log('📊 Mode: DRY-RUN SIMULATION (no actual API calls)\n');
    await runDryRunSimulation();
  } else {
    console.log('⚠️  Mode: REAL TEST (will trigger actual training)\n');
    console.log('⚠️  WARNING: This will run real training battles!');
    console.log('⚠️  Current budget cap: $15.00');
    console.log('⚠️  This test will run until budget is reached.\n');
    console.log('💡 For a safer test, use: --simulate flag\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('Continue with real test? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n✅ Test cancelled. Use --simulate for dry-run simulation.');
      return;
    }

    await runRealTest();
  }
}

async function runDryRunSimulation() {
  console.log('📊 Dry-Run Simulation');
  console.log('─────────────────────────────────────────────────────\n');

  const state: SimulationState = {
    currentSpend: 0,
    battlesRun: 0,
    killSwitchActive: false,
    budgetExceeded: false,
    logs: [],
  };

  const DAILY_CAP = 15.0;
  const COST_PER_BATTLE = 0.010; // Average cost per battle
  const BATTLE_TIME_SECONDS = 60; // Average time per battle

  console.log('Simulating training session...\n');
  console.log(`   Daily Cap: $${DAILY_CAP.toFixed(2)}`);
  console.log(`   Cost per Battle: $${COST_PER_BATTLE.toFixed(4)}`);
  console.log(`   Estimated Battles to Cap: ${Math.floor(DAILY_CAP / COST_PER_BATTLE)}\n`);

  let step = 0;
  const maxSteps = Math.ceil(DAILY_CAP / COST_PER_BATTLE) + 10;

  while (step < maxSteps && !state.budgetExceeded) {
    step++;

    // Simulate battle
    state.currentSpend += COST_PER_BATTLE;
    state.battlesRun++;

    // Check if budget exceeded
    if (state.currentSpend >= DAILY_CAP) {
      state.budgetExceeded = true;
      state.killSwitchActive = true;
      state.logs.push(`Step ${step}: Budget exceeded! Spend: $${state.currentSpend.toFixed(4)}`);
      break;
    }

    // Log every 100 battles
    if (step % 100 === 0) {
      const percentage = (state.currentSpend / DAILY_CAP) * 100;
      state.logs.push(`Step ${step}: Spend: $${state.currentSpend.toFixed(4)} (${percentage.toFixed(1)}%)`);
      console.log(`   Battle ${step}: $${state.currentSpend.toFixed(4)} / $${DAILY_CAP.toFixed(2)} (${percentage.toFixed(1)}%)`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Simulation Results');
  console.log('─────────────────────────────────────────────────────\n');

  console.log(`   Total Battles: ${state.battlesRun}`);
  console.log(`   Total Spend: $${state.currentSpend.toFixed(4)}`);
  console.log(`   Budget Exceeded: ${state.budgetExceeded ? '✅ YES' : '❌ NO'}`);
  console.log(`   Kill-Switch Active: ${state.killSwitchActive ? '✅ YES' : '❌ NO'}`);
  console.log(`   Estimated Time: ${(state.battlesRun * BATTLE_TIME_SECONDS / 60).toFixed(1)} minutes`);

  console.log('\n✅ Simulation Complete');
  console.log('   In real scenario:');
  console.log('   1. checkBudget() would detect budget exceeded');
  console.log('   2. setKillSwitchActive(true) would be called automatically');
  console.log('   3. Training would stop immediately');
  console.log('   4. All subsequent training requests would be blocked');
  console.log('');
}

async function runRealTest() {
  console.log('🚀 Real Test - Monitoring Training Session\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Check initial state
  console.log('📊 Step 1: Check Initial State');
  console.log('─────────────────────────────────────────────────────\n');

  const initialKillSwitch = await checkKillSwitchStatus();
  const initialSpend = await getCurrentSpend();

  console.log(`   Kill-Switch Status: ${initialKillSwitch.active ? '🚨 ACTIVE' : '✅ INACTIVE'}`);
  console.log(`   Current Spend: $${initialSpend.toFixed(4)}`);
  console.log(`   Daily Cap: $15.00`);
  console.log(`   Remaining: $${(15.0 - initialSpend).toFixed(4)}`);

  if (initialKillSwitch.active) {
    console.log('\n   ⚠️  Kill-switch is already active!');
    console.log('   💡 Deactivate it first to run this test.');
    return;
  }

  if (initialSpend >= 15.0) {
    console.log('\n   ⚠️  Budget already exceeded!');
    console.log('   💡 Wait for budget reset (midnight UTC) or reset billing_logs.');
    return;
  }

  console.log('');

  // Step 2: Run training batches until budget is reached
  console.log('📊 Step 2: Run Training Batches');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('   ⚠️  This will run training until budget is reached.');
  console.log('   ⚠️  This may take a while and will consume budget.\n');

  let battlesRun = 0;
  let currentSpend = initialSpend;
  const maxBattles = 200; // Safety limit
  const checkInterval = 5; // Check every 5 battles

  for (let i = 0; i < maxBattles; i++) {
    // Check current spend
    currentSpend = await getCurrentSpend();
    const remaining = 15.0 - currentSpend;

    if (currentSpend >= 15.0) {
      console.log(`\n   🚨 Budget exceeded! Current spend: $${currentSpend.toFixed(4)}`);
      break;
    }

    if (remaining < 0.05) {
      console.log(`\n   ⚠️  Approaching budget limit. Remaining: $${remaining.toFixed(4)}`);
      console.log('   Running one more small batch to trigger limit...\n');
    }

    // Run a small batch
    console.log(`   Batch ${i + 1}: Triggering training (batchSize: 1)...`);
    const result = await triggerTraining(1);

    if (result.error) {
      if (result.error.includes('Budget Limit Reached') || result.error.includes('Training paused')) {
        console.log(`   ✅ Training blocked: ${result.error}`);
        break;
      }
      console.log(`   ⚠️  Error: ${result.error}`);
    } else {
      battlesRun++;
      console.log(`   ✅ Batch started (battles completed: ${result.batch?.battlesCompleted || 0})`);
    }

    // Wait a bit for battles to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check kill-switch status
    if (i % checkInterval === 0) {
      const killSwitchStatus = await checkKillSwitchStatus();
      if (killSwitchStatus.active) {
        console.log(`\n   🚨 Kill-switch activated!`);
        break;
      }
    }
  }

  // Step 3: Verify kill-switch is active
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Step 3: Verify Kill-Switch Status');
  console.log('─────────────────────────────────────────────────────\n');

  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for any pending operations

  const finalKillSwitch = await checkKillSwitchStatus();
  const finalSpend = await getCurrentSpend();

  console.log(`   Kill-Switch Status: ${finalKillSwitch.active ? '🚨 ACTIVE' : '❌ INACTIVE'}`);
  if (finalKillSwitch.activatedAt) {
    console.log(`   Activated At: ${finalKillSwitch.activatedAt}`);
  }
  console.log(`   Current Spend: $${finalSpend.toFixed(4)}`);
  console.log(`   Battles Run: ${battlesRun}`);

  // Step 4: Try to trigger training again (should be blocked)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Step 4: Verify Training is Blocked');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('   Attempting to trigger training with kill-switch active...');
  const blockedResult = await triggerTraining(1);

  if (blockedResult.error || blockedResult.status === 503) {
    console.log('   ✅ PASS: Training correctly blocked');
    console.log(`   Response: ${blockedResult.error || blockedResult.message || 'Service Unavailable'}`);
  } else {
    console.log('   ❌ FAIL: Training should be blocked but was allowed');
    console.log(`   Response: ${JSON.stringify(blockedResult)}`);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Test Summary');
  console.log('─────────────────────────────────────────────────────\n');

  const tests = [
    {
      name: 'Kill-Switch Activated Automatically',
      passed: finalKillSwitch.active === true,
    },
    {
      name: 'Budget Exceeded',
      passed: finalSpend >= 15.0,
    },
    {
      name: 'Training Blocked When Active',
      passed: blockedResult.error !== undefined || blockedResult.status === 503,
    },
  ];

  tests.forEach((test) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`   ${status} ${test.name}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (tests.every(t => t.passed)) {
    console.log('✅ All tests PASSED!');
    console.log('   Kill-switch is working correctly.');
    console.log('   Training stops automatically when budget is reached.');
  } else {
    console.log('⚠️  Some tests FAILED.');
    console.log('   Review the results above.');
  }

  console.log('\n💡 Next Steps:');
  console.log('   1. Kill-switch will remain active until manually deactivated');
  console.log('   2. Budget resets at midnight UTC');
  console.log('   3. Deactivate kill-switch via dashboard to resume training');
  console.log('');
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Kill-Switch Simulation Test\n');
  console.log('Usage:');
  console.log('  npx tsx scripts/test-kill-switch-simulation.ts [options]\n');
  console.log('Options:');
  console.log('  --simulate, -s    Run dry-run simulation (no actual API calls)');
  console.log('  --help, -h        Show this help message\n');
  console.log('Examples:');
  console.log('  npx tsx scripts/test-kill-switch-simulation.ts --simulate');
  console.log('  npx tsx scripts/test-kill-switch-simulation.ts');
  process.exit(0);
}

simulateTrainingSession().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
