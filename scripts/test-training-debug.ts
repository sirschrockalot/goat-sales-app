/**
 * Debug Training Execution
 * Tests training execution and shows detailed error messages
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

async function triggerTrainingAndWait(batchSize: number = 1) {
  console.log('🚀 Triggering Training Batch');
  console.log('─────────────────────────────────────────────────────\n');

  try {
    const response = await fetch(`${appUrl}/api/cron/train`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchSize }),
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.status === 'started') {
      console.log('✅ Training batch started in background');
      console.log('⏳ Waiting 30 seconds for battles to complete...\n');
      
      // Wait and check for results
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`   Checking after ${(i + 1) * 5} seconds...`);
        
        // Check if battles were created
        const battlesResponse = await fetch(`${appUrl}/api/sandbox/battles?limit=5`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (battlesResponse.ok) {
          const battlesData = await battlesResponse.json();
          if (battlesData.battles && battlesData.battles.length > 0) {
            console.log(`   ✅ Found ${battlesData.battles.length} battle(s)!`);
            break;
          }
        }
      }
      
      console.log('\n📊 Final Check:');
      const finalBattlesResponse = await fetch(`${appUrl}/api/sandbox/battles?limit=5`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (finalBattlesResponse.ok) {
        const finalBattles = await finalBattlesResponse.json();
        console.log(`   Battles found: ${finalBattles.battles?.length || 0}`);
        if (finalBattles.battles && finalBattles.battles.length > 0) {
          console.log('   ✅ Training is working!');
        } else {
          console.log('   ❌ No battles found - training may be failing');
          console.log('   💡 Check Heroku logs for errors');
        }
      }
    } else if (result.error) {
      console.log('❌ Training failed:', result.error);
      console.log('   Message:', result.message);
    }
  } catch (error: any) {
    console.error('❌ Error triggering training:', error.message);
    console.error('   Stack:', error.stack);
  }
}

async function checkEnvironment() {
  console.log('🔍 Checking Environment Configuration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const nodeEnv = process.env.NODE_ENV;
  const explicitEnv = process.env.EXPLICIT_ENV;

  console.log(`   NODE_ENV: ${nodeEnv || 'not set'}`);
  console.log(`   EXPLICIT_ENV: ${explicitEnv || 'not set'}`);
  console.log('');

  // Expected behavior:
  // - If EXPLICIT_ENV=sandbox, environment should be 'sandbox'
  // - isProduction should be false
  // - assertNotProduction() should pass

  if (explicitEnv === 'sandbox') {
    console.log('   ✅ EXPLICIT_ENV=sandbox is set');
    console.log('   ✅ Environment should be detected as sandbox');
    console.log('   ✅ isProduction should be false');
    console.log('   ✅ assertNotProduction() should pass');
  } else {
    console.log('   ⚠️  EXPLICIT_ENV is not set to sandbox');
    console.log('   💡 Set EXPLICIT_ENV=sandbox on Heroku');
  }
  console.log('');
}

async function main() {
  await checkEnvironment();
  await triggerTrainingAndWait(1);
}

main().catch(console.error);
