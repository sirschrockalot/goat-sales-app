/**
 * Seed Local Database
 * Populates local Supabase instance with "Prod-Like" test data
 * 
 * Usage: npx tsx scripts/seed-local.ts
 * 
 * Prerequisites:
 * - Local Supabase running (supabase start)
 * - Environment variables loaded from .env.development
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// Load environment variables from .env.development
const envPath = path.join(process.cwd(), '.env.development');
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

// Fallback to .env.local if .env.development doesn't exist
const localEnvPath = path.join(process.cwd(), '.env.local');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && fs.existsSync(localEnvPath)) {
  const envFile = fs.readFileSync(localEnvPath, 'utf-8');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mock user data
const mockUsers = [
  { name: 'Sarah Johnson', email: 'sarah.johnson@test.com', xp: 2500, level: 5, path: 'acquisitions', isAdmin: true },
  { name: 'Mike Chen', email: 'mike.chen@test.com', xp: 1800, level: 4, path: 'acquisitions', isAdmin: false },
  { name: 'Emma Rodriguez', email: 'emma.rodriguez@test.com', xp: 3200, level: 5, path: 'dispositions', isAdmin: false },
  { name: 'David Kim', email: 'david.kim@test.com', xp: 950, level: 2, path: 'acquisitions', isAdmin: false },
  { name: 'Lisa Thompson', email: 'lisa.thompson@test.com', xp: 4200, level: 5, path: 'dispositions', isAdmin: false },
];

// Mock call transcripts with varying quality
const mockTranscripts = [
  {
    transcript: `Rep: Hi Sarah, this is Mike from Goat Real Estate! I'm calling about your property on 123 Main Street. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

Sarah: Um, okay, I guess that's fair.

Rep: Great! Before we get started, can you grab a pen and paper? I want to make sure you have my office number written down. It's 555-1234. Got that?

Sarah: Yes, I have it.

Rep: Perfect. Now, catch me up to speed, Sarah. What's got you even thinking about selling this property?

Sarah: Well, my mom passed away last year and left me this house. I live in Florida now, so I can't really manage it from here.

Rep: I'm sorry to hear about your mom, Sarah. That's really tough. I actually helped someone in a similar situation last month - they were dealing with probate and out-of-state management, and we were able to close in 7 days and give them a clean break. Does that sound like something that would help you?

Sarah: Yes, that would be amazing.

Rep: Perfect. Based on what you're telling me, Sarah, I can give you an approval today. Here's what I'm thinking: I can offer you $185,000 as-is, and we can close in 7 days. This is what we call a Virtual Withdraw - it's like putting money in escrow, but you get the certainty of a cash offer without the hassle of traditional financing. Your reference number is VW-2024-001. Does that work for you?

Sarah: That sounds good.

Rep: Excellent! So here's what happens next: I'm going to send you an agreement right now. You'll see the terms we discussed - $185,000, 7-day close, Virtual Withdraw reference VW-2024-001. I need you to sign it and send it back today so we can lock this in. Can you do that?

Sarah: Yes, I can sign it today.`,
    goatScore: 92,
    gates: [true, true, true, true, true],
  },
  {
    transcript: `Rep: Hi there, this is about your property.

Seller: Yeah?

Rep: So, what do you want for it?

Seller: I'm not sure, maybe $200k?

Rep: Okay, I can do $150k.

Seller: That's too low.

Rep: Well, that's my offer.`,
    goatScore: 35,
    gates: [false, false, false, false, false],
  },
  {
    transcript: `Rep: Hi John, this is Emma from Goat Real Estate! I'm calling about your property. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

John: Sure, that's fair.

Rep: Great! Can you grab a pen and paper? I want to make sure you have my office number. It's 555-5678.

John: Got it.

Rep: Now, catch me up to speed. What's got you thinking about selling?

John: I inherited it and just want to be done with it. Too much work.

Rep: I understand. I helped someone in a similar situation. We can close in 7 days. Does that work?

John: Yeah, that sounds good.

Rep: Perfect. I can offer you $175,000 as-is. We call this a Virtual Withdraw. Your reference number is VW-2024-002. Does that work?

John: Can you do $180k?

Rep: I hear you, John. And I want to make sure we're solving the real problem here. You mentioned you want to be done with this. Is $5,000 really going to change that for you? Or would you rather have the certainty of closing in 7 days?

John: You're right. Let's do it.

Rep: Great! I'm sending you an agreement now. Sign it and send it back today.`,
    goatScore: 78,
    gates: [true, true, true, true, true],
  },
  {
    transcript: `Rep: Hey, I'm calling about your house.

Seller: What about it?

Rep: Do you want to sell it?

Seller: Maybe.

Rep: How much?

Seller: I don't know, $250k?

Rep: That's too high.`,
    goatScore: 15,
    gates: [false, false, false, false, false],
  },
  {
    transcript: `Rep: Hi Maria, this is David from Goat Real Estate! I'm calling about your property on 456 Oak Avenue. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

Maria: Yes, that's fair.

Rep: Perfect! Before we get started, can you grab a pen and paper? I want to make sure you have my office number written down. It's 555-9012.

Maria: Yes, I have it.

Rep: Great! Now, catch me up to speed, Maria. What's got you even thinking about selling this property?

Maria: My husband and I are getting divorced, and we need to split the assets. This house is part of that.

Rep: I'm sorry to hear that, Maria. That's a difficult situation. I actually helped a couple in a similar situation last month - they needed a quick sale for their divorce settlement, and we were able to close in 10 days and give them both a clean break. Does that sound like something that would help you?

Maria: Yes, that would be perfect.

Rep: I understand. Now, before I can give you that approval or denial, I need to ask you a quick question. What will I see when I walk through the front door? Is it in good shape, or are there repairs needed?

Maria: It's in pretty good condition. The kitchen was updated a few years ago. Maybe $10,000 in minor repairs total?

Rep: Got it. And what about the outside? Any major issues with the roof, foundation, or exterior?

Maria: The roof is about 8 years old, but it's holding up. No foundation issues.

Rep: Perfect. Based on what you're telling me, Maria, I can give you an approval today. Here's what I'm thinking: I can offer you $195,000 as-is, and we can close in 10 days. This is what we call a Virtual Withdraw - it's like putting money in escrow, but you get the certainty of a cash offer. Your reference number is VW-2024-003. Does that work for you?

Maria: That sounds reasonable.

Rep: Excellent! So here's what happens next: I'm going to send you an agreement right now. You'll see the terms we discussed - $195,000, 10-day close, Virtual Withdraw reference VW-2024-003. I need you to sign it and send it back today so we can lock this in. Can you do that?

Maria: Yes, I can do that today.`,
    goatScore: 88,
    gates: [true, true, true, true, true],
  },
  {
    transcript: `Rep: Hi, I'm calling about selling your house.

Seller: Okay.

Rep: So, do you want to sell?

Seller: I guess so.

Rep: How much?

Seller: $300k.

Rep: I'll give you $200k.

Seller: No way.`,
    goatScore: 22,
    gates: [false, false, false, false, false],
  },
  {
    transcript: `Rep: Hi Robert, this is Lisa from Goat Real Estate! I'm calling about your property. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

Robert: Fair enough.

Rep: Great! Can you grab a pen and paper? My office number is 555-3456.

Robert: Got it.

Rep: Now, what's got you thinking about selling?

Robert: I'm retiring and moving to Florida. Don't need this big house anymore.

Rep: Congratulations on your retirement! I helped someone in a similar situation recently. We closed in 14 days. Does that timeline work for you?

Robert: Yes, that would be great.

Rep: Perfect. I can offer you $220,000 as-is. Virtual Withdraw reference VW-2024-004. Does that work?

Robert: Sounds good.

Rep: Great! I'm sending the agreement now. Sign it today.`,
    goatScore: 75,
    gates: [true, true, true, true, true],
  },
  {
    transcript: `Rep: Hey, want to sell your house?

Seller: Maybe.

Rep: How much?

Seller: $180k.

Rep: I'll do $120k.

Seller: That's insulting.`,
    goatScore: 18,
    gates: [false, false, false, false, false],
  },
  {
    transcript: `Rep: Hi Jennifer, this is Sarah from Goat Real Estate! I'm calling about your property on 789 Pine Street. I can promise you one of two things: I'm either going to give you an approval with an offer, or a denial with the reason why. Fair enough?

Jennifer: Yes, that's fair.

Rep: Perfect! Before we get started, can you grab a pen and paper? I want to make sure you have my office number written down. It's 555-7890.

Jennifer: Yes, I have it.

Rep: Excellent! Now, catch me up to speed, Jennifer. What's got you even thinking about selling this property?

Jennifer: I lost my job and can't afford the mortgage anymore. I'm behind on payments and the bank is threatening foreclosure.

Rep: I'm so sorry to hear that, Jennifer. That's really stressful. I actually helped someone in a similar situation last month - they were facing foreclosure and we were able to close in 5 days and give them a fresh start. Does that sound like something that would help you?

Jennifer: Yes, that would be a lifesaver.

Rep: I understand. Now, before I can give you that approval or denial, I need to ask you a quick question. What will I see when I walk through the front door? Is it in good shape, or are there repairs needed?

Jennifer: It needs some work. The kitchen is outdated, and there are some plumbing issues. Maybe $20,000 in repairs?

Rep: Got it. And what about the outside? Any major issues with the roof, foundation, or exterior?

Jennifer: The roof is old and leaks in a few places. No foundation issues though.

Rep: Perfect. Based on what you're telling me, Jennifer, I can give you an approval today. Here's what I'm thinking: I can offer you $160,000 as-is, and we can close in 5 days. This is what we call a Virtual Withdraw - it's like putting money in escrow, but you get the certainty of a cash offer without the hassle. Your reference number is VW-2024-005. Does that work for you?

Jennifer: Yes, that would be amazing. I really need this.

Rep: Excellent! So here's what happens next: I'm going to send you an agreement right now. You'll see the terms we discussed - $160,000, 5-day close, Virtual Withdraw reference VW-2024-005. I need you to sign it and send it back today so we can lock this in. Can you do that?

Jennifer: Yes, absolutely. I'll sign it right away.`,
    goatScore: 95,
    gates: [true, true, true, true, true],
  },
  {
    transcript: `Rep: Hi, calling about your property.

Seller: What about it?

Rep: Want to sell?

Seller: I don't know.

Rep: Well, let me know if you do.`,
    goatScore: 12,
    gates: [false, false, false, false, false],
  },
];

async function seedDatabase() {
  console.log('🌱 Seeding local database with test data...\n');

  try {
    // Step 1: Create mock users in auth and profiles
    console.log('👥 Step 1: Creating mock users...');
    const userIds: string[] = [];

    for (const user of mockUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'testpassword123',
        email_confirm: true,
        user_metadata: {
          name: user.name,
        },
      });

      if (authError) {
        // User might already exist, try to find existing user
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        const existingUser = allUsers?.users.find((u: any) => u.email === user.email);
        if (existingUser) {
          userIds.push(existingUser.id);
          console.log(`   ✓ User exists: ${user.name} (${user.email})`);
          // Update profile
          await supabase
            .from('profiles')
            .upsert({
              id: existingUser.id,
              name: user.name,
              email: user.email,
              is_admin: user.isAdmin,
              assigned_path: user.path,
              gauntlet_level: user.level,
              experience_points: user.xp,
              onboarding_completed: true,
            }, { onConflict: 'id' });
          continue;
        } else {
          console.error(`   ✗ Error creating user ${user.name}:`, authError.message);
          continue;
        }
      }

      if (!authUser.user) {
        console.error(`   ✗ Failed to create user ${user.name}`);
        continue;
      }

      userIds.push(authUser.user.id);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          is_admin: user.isAdmin,
          assigned_path: user.path,
          gauntlet_level: user.level,
          experience_points: user.xp,
          onboarding_completed: true,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error(`   ✗ Error creating profile for ${user.name}:`, profileError.message);
      } else {
        console.log(`   ✓ Created: ${user.name} (Level ${user.level}, ${user.xp} XP, ${user.path})`);
      }
    }

    console.log(`\n   ✅ Created ${userIds.length} users\n`);

    // Step 2: Seed script_segments (Acquisitions) - Updated to 8 gates
    console.log('📝 Step 2: Seeding script_segments (Acquisitions)...');
    const acquisitionsScripts = [
      {
        gate_number: 1,
        gate_name: 'Intro (Contact/Credibility)',
        script_text: "Hi, [SELLER NAME], this is [YOUR NAME] with Presidential Digs Real Estate. How are you doing today? I'm calling about your property at [PROPERTY ADDRESS]. You popped up on our radar because you might be open to selling, and my job is to see whether your property even qualifies for one of our offers. Would it be okay if I ask you a few quick questions? Just so you know how this works: By the end of the call, one of three things will happen: 1. We'll approve the property and make you an offer. 2. We'll say it doesn't fit our buying criteria and explain why. 3. Or we'll decide it's not a fit right now and part as friends. Does that sound fair? Before we dive in, do me a favor and grab a pen and paper so you know exactly who you're dealing with. Write this down: My name is [YOUR NAME]. Our company is Presidential Digs Real Estate. Our best callback number is [COMPANY PHONE]. Can you read that number back to me so I know you've got it right?",
        keywords: ['presidential digs', 'qualifies', 'three things', 'approve', "doesn't fit", 'sound fair', 'pen and paper', 'read that number back', 'presidential digs real estate'],
      },
      {
        gate_number: 2,
        gate_name: 'Fact Find - Motivation',
        script_text: "Catch me up to speed, [SELLER NAME] — what's got you even thinking about selling this house? Is this a rental or your primary home? How long have you owned the property? Are you local or out of state? What do you like most about the property? What do you not like about it? When you sell, what are you hoping to do with the money? Are you married or do you have any other decision-makers involved in this? Is there anyone else who would need to sign off if we move forward? How soon would you like to have this behind you if everything lined up?",
        keywords: ["what's got you thinking", 'why selling', 'motivation', 'probate', 'taxes', 'moving', 'married', 'kids', 'decision-makers', 'sign off', 'behind you', 'tell me a little more'],
      },
      {
        gate_number: 3,
        gate_name: 'Fact Find - Condition',
        script_text: "Let's talk about the house itself for a second. If I was walking through with you right now, what would I be seeing? What's the exterior? Any known foundation issues? Cracks, shifting, doors sticking? How's the roof? Any leaks, missing shingles, or soft spots? What kind of flooring do you have throughout? Have the kitchen and bathrooms been updated, or are they mostly original? Any plumbing or electrical issues you're aware of? How old is the HVAC system? Water heater? When was the last time the roof was replaced? Any issues with the electrical panel? Any plumbing problems? Any known mold, water damage, or past flooding? If we were able to agree on a number that made sense to both of us, how soon would you be ready to close?",
        keywords: ['walking through', 'what would i be seeing', 'foundation', 'roof', 'kitchen', 'bathrooms', 'hvac', 'water heater', 'electrical', 'plumbing', 'mold', 'water damage', 'flooding', 'ready to close'],
      },
      {
        gate_number: 4,
        gate_name: 'Transition to Numbers',
        script_text: "Okay, [SELLER NAME], I appreciate you walking me through all of that. Let me ask you this: if you had, say, $20,000 to $30,000 to put into the property, where do you think it would need to go first? What's the neighborhood like — more owners or renters? Any problem neighbors or issues on the street? Anyone else on the block fixing up houses? If I were driving the neighborhood, is there anything big I would notice that we haven't talked about yet? Have you thought about what you'd need to walk away with for this place to make sense for you?",
        keywords: ['$20,000', '$30,000', 'put into the property', 'where would it need to go', 'neighborhood', 'owners', 'renters', 'problem neighbors', 'walk away with', 'make sense for you'],
      },
      {
        gate_number: 5,
        gate_name: 'Running Comps / Short Hold',
        script_text: "Alright, [SELLER NAME], here's what I'm going to do. I'm going to plug everything you told me into our system and see what this looks like from an investor standpoint. It usually takes me a couple of minutes. Can you hang on the line while I do that, or would you rather I call you right back?",
        keywords: ['plug everything', 'our system', 'investor standpoint', 'couple of minutes', 'hang on the line', 'call you right back'],
      },
      {
        gate_number: 6,
        gate_name: 'The Offer',
        script_text: "Okay, [SELLER NAME], thanks for hanging in there. I've got some good news and some things I want to walk you through. The way we buy is as-is: You don't have to fix anything. You don't have to clean the house. We cover normal closing costs. You pick the closing date that works best for you. In exchange, we need to buy it at a number that makes sense for us as investors. Based on the condition of the property, the repairs we talked about, and what similar homes are going for in that area, the number that makes the most sense for us is: $[OFFER PRICE]. I completely understand. Let me ask you this: What number did you have in mind that would make this a no-brainer for you?",
        keywords: ['as-is', "don't have to fix", "don't have to clean", 'cover closing costs', 'pick the closing date', 'based on the condition', 'repairs we talked about', 'similar homes', 'number that makes sense', 'no-brainer', 'meet in the middle'],
      },
      {
        gate_number: 7,
        gate_name: 'The Close - Setting Expectations',
        script_text: "Here's what the next steps look like so there are no surprises. 1. Agreement: We'll send over a simple purchase agreement for $[FINAL PRICE]. It's 2–3 pages, plain English. 2. Welcome Call: Our transaction coordinator will give you a welcome call, go over the timeline, and answer any questions. 3. Photos / Walkthrough: We'll schedule a quick walkthrough or photos of the property — usually within a few days. 4. Title Work: The title company will do their job in the background and make sure everything is clear so you can get paid. 5. Closing: On closing day, you'll sign the final paperwork and get your funds — either by wire or check, whichever you prefer. Does that all sound good to you?",
        keywords: ['next steps', 'agreement', '2–3 pages', 'plain english', 'transaction coordinator', 'welcome call', 'walkthrough', 'photos', 'title company', 'closing day', 'wire', 'check', 'sound good'],
      },
      {
        gate_number: 8,
        gate_name: 'Final Commitment Questions',
        script_text: "Just so we're on the same page, if we lock this in at $[FINAL PRICE], are you 100% ready to move forward and sell the property to us? Awesome. I'll get the agreement sent to [SELLER EMAIL]. When you get it, I can stay on the line and walk you through the main points. It'll only take a couple of minutes.",
        keywords: ['same page', 'lock this in', '100% ready', 'move forward', 'sell the property', 'agreement sent', 'stay on the line', 'walk you through', 'main points'],
      },
    ];

    for (const script of acquisitionsScripts) {
      // First, try to delete existing gate if it exists
      await supabase
        .from('script_segments')
        .delete()
        .eq('gate_number', script.gate_number);

      // Then insert the new gate
      const { error } = await supabase
        .from('script_segments')
        .insert(script);

      if (error) {
        console.error(`   ✗ Error seeding gate ${script.gate_number}:`, error.message);
      } else {
        console.log(`   ✓ Seeded Gate ${script.gate_number}: ${script.gate_name}`);
      }
    }

    // Step 3: Seed dispo_script_segments (Dispositions)
    console.log('\n📝 Step 3: Seeding dispo_script_segments (Dispositions)...');
    const dispoScripts = [
      {
        gate_number: 1,
        gate_name: 'The Hook (The Numbers)',
        script_text: "Hey (Buyer), I've got a heavy-hitter in (Neighborhood). Buy-in is ($$$), ARV is ($$$). It's a bread-and-butter flip with a $50k spread. You interested in the numbers?",
        objective: 'Capture interest with the profit potential and ROI',
        success_criteria: {
          keywords: ['ARV', 'Buy-in', 'Spread', 'ROI', 'Bread-and-butter'],
          intent: 'Leading with financial benefit',
          tonality: 'Professional, urgent, authoritative',
        },
      },
      {
        gate_number: 2,
        gate_name: 'The Narrative (The Comp Analysis)',
        script_text: 'The comps at (Address) just sold for ($$$). This is the worst house on the best street. Needs about $25k in cosmetics and you\'re at full value.',
        objective: 'Build confidence in the valuation using market data',
        success_criteria: {
          keywords: ['Comps', 'Sold', 'Cosmetics', 'ARV justification'],
          logic: 'Comparing the subject property directly to recent neighborhood sales',
        },
      },
      {
        gate_number: 3,
        gate_name: 'The Scarcity Anchor (The Competition)',
        script_text: "I'm sending this to my top 5 buyers right now. I've already got walkthroughs being requested for tomorrow. If you want to lock this up, you have to move now.",
        objective: 'Force a decision by establishing that the deal is moving fast',
        success_criteria: {
          keywords: ['Top 5 buyers', 'Walkthroughs', 'Lock it up', 'Moving fast'],
          tactics: 'Creating a "Fear of Missing Out" (FOMO) environment',
        },
      },
      {
        gate_number: 4,
        gate_name: 'The Terms (Transaction Clarity)',
        script_text: 'Standard terms: $5k non-refundable EMD, 7-day close. We use (Title Company). Does your capital work with that timeline?',
        objective: 'Filter for real buyers by setting non-negotiable closing terms',
        success_criteria: {
          keywords: ['Non-refundable EMD', '7-day close', 'Title company'],
          verification: 'Confirming the buyer has the funds ready and agrees to the speed of the deal',
        },
      },
      {
        gate_number: 5,
        gate_name: 'The Clinch (The Assignment)',
        script_text: "I'm sending the assignment over to your email right now. Let me know the second you see it. Once you sign, the deal is yours and I'll pull it from the list.",
        objective: 'Get the assignment of contract signed immediately',
        success_criteria: {
          keywords: ['Sending assignment', 'Sign now', 'Deal is yours'],
          action: 'Directing the buyer to stay on the phone until the signature is confirmed',
        },
      },
    ];

    for (const script of dispoScripts) {
      // First, try to delete existing gate if it exists
      await supabase
        .from('dispo_script_segments')
        .delete()
        .eq('gate_number', script.gate_number);

      // Then insert the new gate
      const { error } = await supabase
        .from('dispo_script_segments')
        .insert(script);

      if (error) {
        console.error(`   ✗ Error seeding dispo gate ${script.gate_number}:`, error.message);
      } else {
        console.log(`   ✓ Seeded Dispo Gate ${script.gate_number}: ${script.gate_name}`);
      }
    }

    // Step 4: Create mock call records
    console.log('\n📞 Step 4: Creating mock call records...');
    let callsCreated = 0;

    for (let i = 0; i < 10; i++) {
      const userIndex = i % userIds.length;
      const userId = userIds[userIndex];
      const mockCall = mockTranscripts[i % mockTranscripts.length];
      const daysAgo = Math.floor(i / 2); // Spread calls over time
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(10 + (i % 8), 30 + (i % 30), 0, 0);

      const endedAt = new Date(createdAt);
      endedAt.setMinutes(endedAt.getMinutes() + 15 + (i % 10));

      const logicGates = [
        { gate: 1, name: 'The Intro (Approval/Denial)', passed: mockCall.gates[0], score: mockCall.gates[0] ? 95 : 45 },
        { gate: 2, name: 'Fact Find (The Why)', passed: mockCall.gates[1], score: mockCall.gates[1] ? 88 : 50 },
        { gate: 3, name: 'The Pitch (Inside/Outside)', passed: mockCall.gates[2], score: mockCall.gates[2] ? 92 : 40 },
        { gate: 4, name: 'The Offer (Virtual Withdraw)', passed: mockCall.gates[3], score: mockCall.gates[3] ? 90 : 35 },
        { gate: 5, name: 'The Close (Agreement)', passed: mockCall.gates[4], score: mockCall.gates[4] ? 85 : 30 },
      ];

      const { error } = await supabase
        .from('calls')
        .insert({
          user_id: userId,
          transcript: mockCall.transcript,
          goat_score: mockCall.goatScore,
          persona_mode: i % 2 === 0 ? 'acquisition' : 'disposition',
          logic_gates: logicGates,
          call_status: 'ended',
          created_at: createdAt.toISOString(),
          ended_at: endedAt.toISOString(),
          script_adherence: mockCall.goatScore > 70 ? 85 + (i % 15) : 40 + (i % 20),
        });

      if (error) {
        console.error(`   ✗ Error creating call ${i + 1}:`, error.message);
      } else {
        callsCreated++;
        console.log(`   ✓ Created call ${i + 1}: Score ${mockCall.goatScore}, ${mockCall.gates.filter(Boolean).length}/5 gates passed`);
      }
    }

    console.log(`\n   ✅ Created ${callsCreated} call records\n`);

    // Summary
    console.log('✅ Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Acquisitions Script Segments: ${acquisitionsScripts.length}`);
    console.log(`   - Dispositions Script Segments: ${dispoScripts.length}`);
    console.log(`   - Call Records: ${callsCreated}\n`);
    console.log('🚀 You can now:');
    console.log('   - Run: npm run dev:local (to start the dev server)');
    console.log('   - Login with any test user (password: testpassword123)');
    console.log('   - Test the Admin Dashboard with realistic data\n');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
