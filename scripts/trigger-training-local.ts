/**
 * Trigger Training Locally
 * Manually triggers the training batch on your local development server
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    process.exit(1);
  }

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });

  return env;
}

async function triggerTraining() {
  console.log('🚀 Triggering training batch locally...\n');

  // Load environment variables
  const env = loadEnvFile();
  const cronSecret = env.CRON_SECRET;
  const port = env.PORT || '3000';
  const baseUrl = `http://localhost:${port}`;

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not found in .env.local');
    console.log('\n💡 Add CRON_SECRET to your .env.local file:');
    console.log('   CRON_SECRET=your-secret-here');
    process.exit(1);
  }

  // Get batch size from command line args or use default
  const batchSizeArg = process.argv[2];
  const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 5;

  if (isNaN(batchSize) || batchSize < 1) {
    console.error('❌ Invalid batch size. Use a number >= 1');
    console.log('\nUsage: npx tsx scripts/trigger-training-local.ts [batchSize]');
    process.exit(1);
  }

  console.log(`📊 Batch size: ${batchSize}`);
  console.log(`🌐 Endpoint: ${baseUrl}/api/cron/train\n`);

  try {
    const response = await fetch(`${baseUrl}/api/cron/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ batchSize }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Training failed:', error.error || error.message || response.statusText);
      console.log(`   Status: ${response.status}`);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Training batch triggered successfully!\n');
    console.log('📈 Results:');
    console.log(`   Battles Completed: ${result.batch?.battlesCompleted || 0}`);
    console.log(`   Average Score: ${result.batch?.averageScore?.toFixed(1) || 0}/100`);
    console.log(`   Total Cost: $${result.batch?.totalCost?.toFixed(4) || 0}`);
    console.log(`   Batch ID: ${result.batch?.batchId || 'N/A'}`);
    
    if (result.batch?.errors && result.batch.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.batch.errors.length}`);
      result.batch.errors.forEach((error: string, i: number) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    if (result.message) {
      console.log(`\n💬 ${result.message}`);
    }

    console.log('\n✨ Check your terminal logs for detailed battle information.');
  } catch (error: any) {
    console.error('❌ Error triggering training:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your development server is running:');
      console.log('   npm run dev');
    }
    
    process.exit(1);
  }
}

triggerTraining().catch(console.error);
