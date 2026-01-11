/**
 * Seed Production Database
 * Updates production Supabase instance with the new 8-gate script
 * 
 * Usage: npx tsx scripts/seed-production.ts
 * 
 * Prerequisites:
 * - Production environment variables loaded (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - Run this from your local machine with production credentials
 * 
 * WARNING: This will DELETE and REPLACE existing script_segments data!
 */

import { createClient } from '@supabase/supabase-js';

// Get production credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your environment or .env.production file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedProduction() {
  console.log('🌱 Seeding production database with 8-gate Presidential Digs script...\n');

  // Step 1: Apply migration to update constraint
  console.log('📝 Step 1: Applying migration to update gate_number constraint...');
  try {
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the old constraint
        ALTER TABLE script_segments 
          DROP CONSTRAINT IF EXISTS script_segments_gate_number_check;

        -- Add new constraint allowing 1-8 gates
        ALTER TABLE script_segments 
          ADD CONSTRAINT script_segments_gate_number_check 
          CHECK (gate_number >= 1 AND gate_number <= 8);
      `,
    });

    if (migrationError) {
      console.log('   ⚠️  Migration may have already been applied or needs manual execution');
      console.log('   You can run this SQL manually in Supabase Dashboard:');
      console.log('   ALTER TABLE script_segments DROP CONSTRAINT IF EXISTS script_segments_gate_number_check;');
      console.log('   ALTER TABLE script_segments ADD CONSTRAINT script_segments_gate_number_check CHECK (gate_number >= 1 AND gate_number <= 8);\n');
    } else {
      console.log('   ✓ Constraint updated successfully\n');
    }
  } catch (error) {
    console.log('   ⚠️  Could not run migration automatically. Please run it manually in Supabase Dashboard.\n');
  }

  // Step 2: Seed script_segments (Acquisitions) - 8 gates
  console.log('📝 Step 2: Seeding script_segments (Acquisitions - 8 gates)...');
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
    // First, delete existing gate if it exists
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

  console.log('\n✅ Production database seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   - Acquisitions Script Segments: 8 gates');
  console.log('\n⚠️  Note: You may need to regenerate embeddings for these script segments');
  console.log('   by calling the /api/script/embed endpoint or running the embed script.\n');
}

// Run the seed
seedProduction()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding production database:', error);
    process.exit(1);
  });
