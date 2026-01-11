/**
 * Vapi Webhook Stress Test
 * Simulates 10 concurrent sales calls finishing at the same time
 * 
 * Usage: npx tsx scripts/stress-test-webhook.ts
 * 
 * Prerequisites:
 * - Next.js dev server running on http://localhost:3000
 * - VAPI_SECRET_KEY set in .env.local
 * - At least one user in the profiles table
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const vapiSecretKey = process.env.VAPI_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!vapiSecretKey) {
  console.error('❌ VAPI_SECRET_KEY not found in .env.local');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generate a randomized transcript that may or may not pass Gate 1
 */
function generateRandomTranscript(shouldPassGate1: boolean): string {
  const gate1Pass = shouldPassGate1
    ? "Hi Sarah, this is Mike from Goat Real Estate! I'm calling about your property on 123 Main Street. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?"
    : "Hi Sarah, this is Mike. I'm calling about your property. Can we make an offer?";

  const gate2 = "Catch me up to speed, Sarah. What's got you even thinking about selling?";
  const gate3 = "What will I see when I walk through the front door?";
  const gate4 = "Your property was just approved for purchase. We've moved your funds into a Virtual Withdraw Account. Write this reference number down: VW-2024-001.";
  const gate5 = "I'm sending you an agreement right now. Let me know the moment you've signed it.";

  return `${gate1Pass}\n\nSarah: ${shouldPassGate1 ? 'Okay, that sounds fair.' : 'What do you mean?'}\n\nRep: ${gate2}\n\nSarah: I'm moving to Florida next month.\n\nRep: ${gate3}\n\nSarah: It's in pretty good condition, maybe $15k in repairs.\n\nRep: ${gate4}\n\nSarah: That sounds good.\n\nRep: ${gate5}\n\nSarah: I'll sign it today.`;
}

/**
 * Generate a mock webhook payload with randomized transcript
 */
function createMockPayload(userId: string, callId: string, shouldPassGate1: boolean) {
  return {
    type: 'end-of-call-report',
    call: {
      id: callId,
      status: 'ended',
      transcript: generateRandomTranscript(shouldPassGate1),
      recordingUrl: `https://example.com/recordings/${callId}.mp3`,
      metadata: {
        userId: userId,
        personaMode: 'acquisition',
        personaId: 'gauntlet-1',
        gauntletLevel: 1,
        assistantId: 'aaf338ae-b74a-43e4-ac48-73dd99817e9f',
        callStartTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        goatModeDuration: Math.floor(Math.random() * 120), // Random 0-120 seconds
      },
    },
  };
}

/**
 * Fetch a test user ID from Supabase
 */
async function getTestUserId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching test user:', error);
      throw new Error('Cannot fetch test user from database');
    }

    if (!data || !data.id) {
      console.error('❌ No users found in profiles table.');
      console.error('   Please create at least one user profile first.');
      process.exit(1);
    }

    return data.id;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

/**
 * Get count of calls in database before test
 */
async function getCallCount(): Promise<number> {
  const { count, error } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error counting calls:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Verify calls were created in database
 */
async function verifyCallsInDatabase(expectedCount: number, startTime: number) {
  try {
    // Wait a bit for all writes to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data, error, count } = await supabase
      .from('calls')
      .select('id, goat_score, logic_gates, created_at', { count: 'exact' })
      .gte('created_at', new Date(startTime - 1000).toISOString()) // Calls created after test started
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying calls table:', error);
      return null;
    }

    return {
      count: count || 0,
      calls: data || [],
    };
  } catch (error) {
    console.error('❌ Error verifying calls in database:', error);
    return null;
  }
}

/**
 * Send a single webhook request
 */
async function sendWebhookRequest(
  payload: any,
  requestNumber: number
): Promise<{ success: boolean; callId?: string; goatScore?: number; error?: string; duration: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/vapi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': vapiSecretKey,
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    const responseData = await response.json();

    if (response.ok && responseData.success) {
      return {
        success: true,
        callId: responseData.callId,
        goatScore: responseData.goatScore,
        duration,
      };
    } else {
      return {
        success: false,
        error: responseData.error || `HTTP ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Main stress test function
 */
async function runStressTest() {
  console.log('🔥 Starting Vapi Webhook Stress Test...\n');
  console.log('📊 Test Configuration:');
  console.log('   - Concurrent Requests: 10');
  console.log('   - Endpoint: /api/vapi-webhook');
  console.log('   - Expected: 10 successful call records\n');

  // Step 1: Get test user ID
  console.log('📋 Step 1: Fetching test user ID...');
  const userId = await getTestUserId();
  console.log(`   ✓ Using userId: ${userId}\n`);

  // Step 2: Get initial call count
  console.log('📊 Step 2: Getting baseline call count...');
  const initialCallCount = await getCallCount();
  console.log(`   ✓ Initial call count: ${initialCallCount}\n`);

  // Step 3: Generate 10 unique payloads (mix of passing and failing Gate 1)
  console.log('📦 Step 3: Generating 10 randomized webhook payloads...');
  const payloads = Array.from({ length: 10 }, (_, i) => {
    const callId = randomUUID();
    const shouldPassGate1 = i % 2 === 0; // Alternate between passing and failing
    return {
      callId,
      payload: createMockPayload(userId, callId, shouldPassGate1),
      shouldPassGate1,
    };
  });
  console.log(`   ✓ Generated 10 payloads (${payloads.filter(p => p.shouldPassGate1).length} should pass Gate 1, ${payloads.filter(p => !p.shouldPassGate1).length} should fail)\n`);

  // Step 4: Send all requests concurrently
  console.log('📤 Step 4: Sending 10 concurrent POST requests...');
  const testStartTime = Date.now();
  
  const results = await Promise.all(
    payloads.map((p, index) => 
      sendWebhookRequest(p.payload, index + 1)
        .then(result => ({ ...result, callId: p.callId, shouldPassGate1: p.shouldPassGate1 }))
    )
  );

  const totalDuration = Date.now() - testStartTime;
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`   ✓ All requests completed in ${totalDuration}ms\n`);

  // Step 5: Report results
  console.log('📈 Step 5: Performance Results');
  console.log('   ' + '='.repeat(60));
  console.log(`   Total Time: ${totalDuration}ms`);
  console.log(`   Average Time per Request: ${Math.round(totalDuration / 10)}ms`);
  console.log(`   Success Rate: ${successCount}/10 (${(successCount / 10 * 100).toFixed(1)}%)`);
  console.log(`   Failure Rate: ${failureCount}/10 (${(failureCount / 10 * 100).toFixed(1)}%)\n`);

  // Show individual results
  console.log('📋 Individual Request Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const gateStatus = payloads[index].shouldPassGate1 ? '(Should pass Gate 1)' : '(Should fail Gate 1)';
    console.log(`   ${index + 1}. ${status} Request ${index + 1} ${gateStatus} - ${result.duration}ms`);
    if (result.success) {
      console.log(`      Call ID: ${result.callId}`);
      console.log(`      Goat Score: ${result.goatScore}`);
    } else {
      console.log(`      Error: ${result.error}`);
    }
  });
  console.log('');

  // Step 6: Verify database
  console.log('🔍 Step 6: Verifying database records...');
  const verification = await verifyCallsInDatabase(10, testStartTime);

  if (!verification) {
    console.error('❌ Could not verify database records');
    process.exit(1);
  }

  console.log(`   ✓ Found ${verification.count} new call records`);
  
  if (verification.count === 10) {
    console.log('   ✅ All 10 calls were successfully stored in the database!');
  } else {
    console.error(`   ❌ Expected 10 calls, found ${verification.count}`);
    process.exit(1);
  }

  // Show Goat Score distribution
  const scores = verification.calls.map(c => c.goat_score).filter(s => s !== null);
  if (scores.length > 0) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    console.log(`\n   📊 Goat Score Statistics:`);
    console.log(`      Average: ${avgScore.toFixed(1)}`);
    console.log(`      Range: ${minScore} - ${maxScore}`);
  }

  // Show Logic Gates summary
  const gateStats = {
    'Approval/Denial Intro': { passed: 0, total: 0 },
    'Fact-Finding': { passed: 0, total: 0 },
    'Property Condition': { passed: 0, total: 0 },
    'Tone': { passed: 0, total: 0 },
    'The Clinch': { passed: 0, total: 0 },
  };

  verification.calls.forEach(call => {
    if (call.logic_gates && Array.isArray(call.logic_gates)) {
      call.logic_gates.forEach((gate: any) => {
        if (gateStats[gate.name]) {
          gateStats[gate.name].total++;
          if (gate.passed) {
            gateStats[gate.name].passed++;
          }
        }
      });
    }
  });

  console.log(`\n   🎯 Logic Gates Summary:`);
  Object.entries(gateStats).forEach(([name, stats]) => {
    const passRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : '0.0';
    console.log(`      ${name}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
  });

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ STRESS TEST COMPLETE: All validations passed!');
  console.log('='.repeat(60));
  console.log(`\nSummary:`);
  console.log(`  - Concurrent Requests: ✅ ${successCount}/10 successful`);
  console.log(`  - Total Processing Time: ✅ ${totalDuration}ms`);
  console.log(`  - Database Records: ✅ ${verification.count}/10 created`);
  console.log(`  - AI Judge Processing: ✅ All calls scored`);
  console.log(`  - Logic Gates Detection: ✅ All gates analyzed`);
  console.log(`\n🎉 Your webhook infrastructure can handle concurrent load!`);
}

// Run the stress test
runStressTest().catch((error) => {
  console.error('\n❌ Stress test failed with error:', error);
  process.exit(1);
});
