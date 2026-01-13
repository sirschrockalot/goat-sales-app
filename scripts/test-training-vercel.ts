/**
 * Test Training on Vercel
 * Runs a small test batch (1-2 battles) to verify training is working correctly
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

async function testTraining() {
  console.log('🧪 Testing Training on Vercel Production\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load environment variables - try Vercel production env file first, then .env.local
  let env: Record<string, string> = {};
  
  // Try to load from Vercel production env file
  const vercelProdEnvPath = path.join(process.cwd(), '.env.vercel.production');
  if (fs.existsSync(vercelProdEnvPath)) {
    const vercelEnvFile = fs.readFileSync(vercelProdEnvPath, 'utf-8');
    vercelEnvFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes and handle escaped newlines
          value = value.replace(/^["']|["']$/g, '').replace(/\\n/g, '').replace(/\n/g, '');
          env[key] = value;
        }
      }
    });
  }
  
  // Fallback to .env.local
  if (!env.CRON_SECRET) {
    const localEnv = loadEnvFile();
    env = { ...env, ...localEnv };
  }
  
  // Allow override via process.env
  const cronSecret = process.env.CRON_SECRET || env.CRON_SECRET;
  
  // Use production Vercel URL - prioritize process.env, then .env.local, then default
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL || 'https://goat-sales-app.vercel.app';

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not found in .env.local');
    console.log('\n💡 Add CRON_SECRET to your .env.local file');
    process.exit(1);
  }

  // Get batch size from command line args or use 1 for testing
  const batchSizeArg = process.argv[2];
  const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 1;

  if (isNaN(batchSize) || batchSize < 1 || batchSize > 3) {
    console.error('❌ Invalid batch size. For testing, use 1-3 battles');
    console.log('\nUsage: npx tsx scripts/test-training-vercel.ts [batchSize]');
    console.log('  Example: npx tsx scripts/test-training-vercel.ts 1');
    process.exit(1);
  }

  const endpoint = `${appUrl}/api/cron/train`;

  console.log('📋 Test Configuration:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Batch Size: ${batchSize} battle(s)`);
  console.log(`   Environment: Production (Vercel)`);
  console.log(`   CRON_SECRET: ${cronSecret ? `${cronSecret.substring(0, 8)}...` : 'NOT FOUND'}`);
  console.log('');

  console.log('🚀 Sending test request...\n');
  
  // Debug: Show what we're sending (first 8 chars only for security)
  if (process.env.DEBUG) {
    console.log('🔍 Debug Info:');
    console.log(`   Authorization Header: Bearer ${cronSecret?.substring(0, 8)}...`);
    console.log(`   Expected Format: Bearer ${cronSecret?.substring(0, 8)}...`);
    console.log('');
  }

  try {
    const startTime = Date.now();
    
    const authHeader = `Bearer ${cronSecret}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ batchSize }),
    });

    const responseTime = Date.now() - startTime;

    console.log(`⏱️  Response received in ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      console.error('❌ Training test failed!\n');
      console.error('Error Details:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Message: ${errorData.error || errorData.message || 'Unknown error'}`);
      
      if (response.status === 401) {
        console.error('\n💡 Authentication failed. Check:');
        console.error('   1. CRON_SECRET in .env.local matches Vercel environment variable');
        console.error('   2. Authorization header format is correct');
      } else if (response.status === 500) {
        console.error('\n💡 Server error. Check:');
        console.error('   1. Vercel deployment is active');
        console.error('   2. Environment variables are set correctly');
        console.error('   3. Check Vercel logs for detailed error');
      }
      
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Training test successful!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 Test Results:');
    console.log(`   ✅ Success: ${result.success ? 'Yes' : 'No'}`);
    console.log(`   🎯 Battles Completed: ${result.batch?.battlesCompleted || 0}`);
    console.log(`   📊 Average Score: ${result.batch?.averageScore?.toFixed(1) || 'N/A'}/100`);
    console.log(`   💰 Total Cost: $${result.batch?.totalCost?.toFixed(4) || '0.0000'}`);
    console.log(`   🆔 Batch ID: ${result.batch?.batchId || 'N/A'}`);
    console.log(`   ⏰ Completed At: ${result.batch?.completedAt || 'N/A'}`);
    
    if (result.batch?.errors && result.batch.errors.length > 0) {
      console.log(`\n   ⚠️  Errors: ${result.batch.errors.length}`);
      result.batch.errors.forEach((error: string, i: number) => {
        console.log(`      ${i + 1}. ${error}`);
      });
    } else {
      console.log(`   ✅ No errors`);
    }

    if (result.message) {
      console.log(`\n   💬 ${result.message}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Validation checks
    console.log('🔍 Validation Checks:');
    
    const checks = [
      {
        name: 'Response received',
        passed: response.ok,
      },
      {
        name: 'Battles completed',
        passed: (result.batch?.battlesCompleted || 0) > 0,
      },
      {
        name: 'Batch ID generated',
        passed: !!result.batch?.batchId,
      },
      {
        name: 'No errors',
        passed: !result.batch?.errors || result.batch.errors.length === 0,
      },
      {
        name: 'Cost tracked',
        passed: typeof result.batch?.totalCost === 'number',
      },
    ];

    let allPassed = true;
    checks.forEach((check) => {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
      if (!check.passed) allPassed = false;
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (allPassed) {
      console.log('🎉 All validation checks passed!');
      console.log('✨ Training system is working correctly on Vercel.\n');
      console.log('💡 Next steps:');
      console.log('   1. Check Vercel logs for detailed battle information');
      console.log('   2. View results in Training Monitor: /admin/training-monitor');
      console.log('   3. Review battle details in Supabase sandbox_battles table');
    } else {
      console.log('⚠️  Some validation checks failed.');
      console.log('💡 Review the errors above and check Vercel logs for details.\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error during test:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection failed. Check:');
      console.error('   1. NEXT_PUBLIC_APP_URL is correct in .env.local');
      console.error('   2. Vercel deployment is active and accessible');
      console.error('   3. Network connectivity');
    } else if (error.message?.includes('fetch')) {
      console.error('\n💡 Network error. Check:');
      console.error('   1. Internet connection');
      console.error('   2. Vercel deployment URL is correct');
    }
    
    process.exit(1);
  }
}

testTraining().catch(console.error);
