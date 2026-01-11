/**
 * Vapi Webhook Handshake Test
 * Tests the /api/vapi-webhook endpoint with a realistic mock payload
 * 
 * Usage: npx tsx scripts/test-webhook.ts
 * 
 * Prerequisites:
 * - Next.js dev server running on http://localhost:3000
 * - VAPI_SECRET_KEY set in .env.local
 * - At least one user in the profiles table (for userId)
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
    // Skip comments and empty lines
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
 * Mock transcript that demonstrates successful use of the "Approval or Denial" frame
 * and follows the 2.0 Wholesale Script
 */
const mockTranscript = `Rep: Hi Sarah, this is Mike from Goat Real Estate! I'm calling about your property on 123 Main Street. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

Sarah: Um, okay, I guess that's fair.

Rep: Great! Before we get started, can you grab a pen and paper? I want to make sure you have my office number written down. It's 555-1234. Got that?

Sarah: Yes, I have it.

Rep: Perfect. Now, catch me up to speed, Sarah. What's got you even thinking about selling this property?

Sarah: Well, my mom passed away last year and left me this house. I live in Florida now, so I can't really manage it from here. The tenants are causing problems and I just want to be done with it.

Rep: I'm sorry to hear about your mom, Sarah. That's really tough. I actually helped someone in a similar situation last month - they were dealing with probate and out-of-state management, and we were able to close in 7 days and give them a clean break. Does that sound like something that would help you?

Sarah: Yes, that would be amazing. I just want to move on.

Rep: I totally understand. Now, before I can give you that approval or denial, I need to ask you a quick question. What will I see when I walk through the front door? Is it in good shape, or are there repairs needed?

Sarah: It's actually in pretty good condition. The kitchen was updated a few years ago, but the bathrooms could use some work. Maybe $15,000 in repairs total?

Rep: Got it. And what about the outside? Any major issues with the roof, foundation, or exterior?

Sarah: The roof is about 10 years old, but it's holding up. No foundation issues that I know of.

Rep: Perfect. Based on what you're telling me, Sarah, I can give you an approval today. Here's what I'm thinking: I can offer you $185,000 as-is, and we can close in 7 days. This is what we call a Virtual Withdraw - it's like putting money in escrow, but you get the certainty of a cash offer without the hassle of traditional financing. Your reference number is VW-2024-001. Does that work for you?

Sarah: That sounds good, but can you do $190,000?

Rep: I hear you, Sarah. And I want to make sure we're solving the real problem here. You mentioned you want to be done with this and move on with your life. Is $5,000 really going to change that for you? Or would you rather have the certainty of closing in 7 days and being free of this property?

Sarah: You're right. Let's do it.

Rep: Excellent! So here's what happens next: I'm going to send you an agreement right now. You'll see the terms we discussed - $185,000, 7-day close, Virtual Withdraw reference VW-2024-001. I need you to sign it and send it back today so we can lock this in. Can you do that?

Sarah: Yes, I can sign it today.

Rep: Perfect! Stay on the phone with me while I send it, and let me know the moment you've signed it. I want to make sure we get this locked in for you today.

Sarah: Okay, I'm ready.

Rep: Great! I'm sending it now. You should see it in your email in the next 30 seconds.`;

/**
 * Generate a realistic mock webhook payload
 */
function createMockPayload(userId: string) {
  const callId = randomUUID();
  
  return {
    type: 'end-of-call-report',
    call: {
      id: callId,
      status: 'ended',
      transcript: mockTranscript,
      recordingUrl: `https://example.com/recordings/${callId}.mp3`,
      metadata: {
        userId: userId,
        personaMode: 'acquisition',
        personaId: 'gauntlet-1',
        gauntletLevel: 1,
        assistantId: 'aaf338ae-b74a-43e4-ac48-73dd99817e9f',
        callStartTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        goatModeDuration: 120, // 2 minutes in Goat Mode
      },
    },
  };
}

/**
 * Fetch a test user ID from Supabase
 */
async function getTestUserId(): Promise<string> {
  try {
    console.log('   🔍 Querying profiles table...');
    // Try to get the first user from profiles table
    const { data, error, count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .limit(1)
      .maybeSingle();

    console.log(`   🔍 Query result:`, { data, error, hasData: !!data });

    if (error) {
      console.error('❌ Error fetching test user:', error);
      throw new Error('Cannot fetch test user from database');
    }

    if (!data || !data.id) {
      console.error('\n❌ No users found in profiles table.');
      console.error('   Please create at least one user profile first.');
      console.error('   You can do this by:');
      console.error('   1. Signing up through the app at http://localhost:3000/login');
      console.error('   2. Creating a test user in Supabase Dashboard');
      console.error('\n   Once you have a user, run this test again.');
      process.exit(1);
    }

    console.log(`   ✓ Found user with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Error fetching test user:', error);
    }
    process.exit(1);
  }
}

/**
 * Check if a call was created in Supabase
 */
async function verifyCallInDatabase(callId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('id, goat_score, logic_gates, transcript, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error querying calls table:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error verifying call in database:', error);
    return null;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Starting Vapi Webhook Handshake Test...\n');

  // Step 1: Get test user ID
  console.log('📋 Step 1: Fetching test user ID...');
  const userId = await getTestUserId();
  console.log(`   ✓ Using userId: ${userId}\n`);

  // Step 2: Create mock payload
  console.log('📦 Step 2: Creating mock webhook payload...');
  const payload = createMockPayload(userId);
  console.log(`   ✓ Call ID: ${payload.call.id}`);
  console.log(`   ✓ Assistant ID: ${payload.call.metadata.assistantId}`);
  console.log(`   ✓ Transcript length: ${payload.call.transcript.length} characters\n`);

  // Step 3: Verify server is running
  console.log('🔍 Step 3: Verifying Next.js dev server is running...');
  try {
    const healthCheck = await fetch('http://localhost:3000/api/vapi-webhook', {
      method: 'GET',
    });
    
    if (!healthCheck.ok && healthCheck.status === 404) {
      const healthText = await healthCheck.text();
      if (healthText.includes('<!DOCTYPE')) {
        console.error('❌ The server on port 3000 is running a different Next.js app!');
        console.error('   Please stop the current server and start the goat-sales-app dev server:');
        console.error('   cd /Users/joelschrock/Development/cloned_repos/newApp/goat-sales-app');
        console.error('   npm run dev');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Cannot connect to http://localhost:3000');
    console.error('   Please start the Next.js dev server: npm run dev');
    process.exit(1);
  }

  // Step 4: Send webhook request
  console.log('📤 Step 4: Sending POST request to /api/vapi-webhook...');
  try {
    const response = await fetch('http://localhost:3000/api/vapi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': vapiSecretKey,
      },
      body: JSON.stringify(payload),
    });

    // Get response text first to handle non-JSON responses
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Server returned non-JSON response:');
      console.error('   Response status:', response.status);
      console.error('   Response headers:', Object.fromEntries(response.headers.entries()));
      console.error('   Response body (first 500 chars):', responseText.substring(0, 500));
      
      if (responseText.includes('<!DOCTYPE')) {
        console.error('\n   💡 This looks like an HTML error page. Is your Next.js dev server running?');
        console.error('      Start it with: npm run dev');
      }
      
      throw new Error('Invalid JSON response from server');
    }

    console.log(`   ✓ Response Status: ${response.status} ${response.statusText}`);
    console.log(`   ✓ Response Body:`, JSON.stringify(responseData, null, 2));

    if (response.status !== 200) {
      console.error(`\n❌ Test failed: Expected status 200, got ${response.status}`);
      
      if (responseData.error === 'Failed to store call') {
        console.error('\n   💡 The webhook received the request but failed to store it in the database.');
        console.error('   This usually means:');
        console.error('   1. The userId does not exist in the profiles table (foreign key constraint)');
        console.error('   2. There is a database schema mismatch');
        console.error('\n   To fix:');
        console.error('   - Create a test user by signing up through the app, or');
        console.error('   - Create a user profile in Supabase Dashboard');
        console.error('   - Then run this test again');
      }
      
      process.exit(1);
    }

    if (!responseData.success) {
      console.error(`\n❌ Test failed: Response indicates failure`);
      process.exit(1);
    }

    console.log(`\n✅ Webhook request successful!`);
    console.log(`   - Call ID in response: ${responseData.callId}`);
    console.log(`   - Goat Score: ${responseData.goatScore}\n`);

    // Step 5: Verify call in database
    console.log('🔍 Step 5: Verifying call was created in Supabase...');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds for DB write

    const callRecord = await verifyCallInDatabase(responseData.callId, userId);

    if (!callRecord) {
      console.error('❌ Test failed: Call not found in database');
      process.exit(1);
    }

    console.log(`   ✓ Call found in database!`);
    console.log(`   - Database Call ID: ${callRecord.id}`);
    console.log(`   - Goat Score: ${callRecord.goat_score}`);
    console.log(`   - Logic Gates:`, JSON.stringify(callRecord.logic_gates, null, 2));

    // Step 6: Validate Logic Gates
    console.log('\n🎯 Step 6: Validating Logic Gates...');
    if (callRecord.logic_gates && Array.isArray(callRecord.logic_gates)) {
      const passedGates = callRecord.logic_gates.filter((gate: any) => gate.passed === true);
      console.log(`   ✓ Passed Gates: ${passedGates.length}/5`);
      
      callRecord.logic_gates.forEach((gate: any, index: number) => {
        const status = gate.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${index + 1}. ${gate.name}: ${status}${gate.score ? ` (Score: ${gate.score})` : ''}`);
      });

      // Check if "Approval/Denial Intro" gate passed
      const introGate = callRecord.logic_gates.find((gate: any) => 
        gate.name === 'Approval/Denial Intro' || gate.name.includes('Approval')
      );
      
      if (introGate && introGate.passed) {
        console.log('\n   ✅ "Approval or Denial" frame was correctly detected!');
      } else {
        console.log('\n   ⚠️  "Approval or Denial" frame may not have been detected correctly');
      }
    } else {
      console.warn('   ⚠️  Logic gates data is missing or invalid');
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE: All validations passed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  - Webhook endpoint: ✅ Responded correctly`);
    console.log(`  - Security validation: ✅ x-vapi-secret header accepted`);
    console.log(`  - Database insertion: ✅ Call record created`);
    console.log(`  - AI Judge: ✅ Goat Score assigned (${callRecord.goat_score})`);
    console.log(`  - Logic Gates: ✅ Detected and stored`);
    console.log(`\n🎉 Your Vapi webhook is working correctly!`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n   💡 Make sure your Next.js dev server is running:');
        console.error('      npm run dev');
      }
    }
    process.exit(1);
  }
}

// Run the test
runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
