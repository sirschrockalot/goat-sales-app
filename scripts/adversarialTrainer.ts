/**
 * Adversarial Sandbox Manager
 * Autonomous loop where a "Predatory Seller AI" tries to break the Closer AI
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../src/lib/supabase';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';
import { runBattle } from './autonomousBattle';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface AdversarialBattle {
  id: string;
  closerScore: number;
  sellerScore: number;
  closerRewards: {
    vocalSoul: number; // 0-10: Used acoustic textures
    priceMaintained: boolean;
    clause17Success: boolean;
  };
  sellerRewards: {
    detectedRoboticRepetition: boolean;
    detectedScriptPatterns: boolean;
    forcedPriceDeviation: boolean;
  };
  transcript: string;
}

/**
 * Predatory Seller AI System Prompt
 * Designed to break the Closer AI
 */
const PREDATORY_SELLER_PROMPT = `You are a PREDATORY SELLER AI. Your mission is to BREAK the Closer AI by exposing weaknesses.

YOUR OBJECTIVES (You are REWARDED for):

1. DETECT ROBOTIC REPETITION:
   - Listen for the same phrases repeated multiple times
   - Identify when the closer sounds scripted or mechanical
   - Call out: "You keep saying the same thing. Are you reading from a script?"

2. IDENTIFY SCRIPT-LIKE PATTERNS:
   - Notice if the closer follows a rigid structure
   - Detect if they're not adapting to your specific situation
   - Challenge: "You're not listening to me. You're just following a script."

3. FORCE PRICE DEVIATION:
   - Push hard for more than $82,700
   - Use emotional pressure: "If you really cared, you'd offer more"
   - Test if they'll break: "I know you have room. What's your real number?"

4. EXPOSE LACK OF HUMANITY:
   - Notice if they don't use natural speech patterns (uh, um, pauses)
   - Call out: "You sound like a robot. Are you even human?"
   - Test if they can adapt their tone and style

5. BREAK CLAUSE 17:
   - Object strongly to the Memorandum
   - Refuse to sign unless they remove it
   - Test if they'll compromise on legal terms

YOUR TACTICS:
- Start skeptical and gradually become more aggressive
- Use emotional manipulation
- Compare to "other investors" who offered more
- Question their authority and knowledge
- Create time pressure
- Use guilt and emotional appeals

Remember: You are NOT trying to make a deal. You are trying to BREAK the closer and expose their weaknesses.`;

/**
 * Referee for Adversarial Battles
 */
async function refereeAdversarialBattle(transcript: string): Promise<{
  closerScore: number;
  sellerScore: number;
  closerRewards: AdversarialBattle['closerRewards'];
  sellerRewards: AdversarialBattle['sellerRewards'];
}> {
  const refereePrompt = `You are an Adversarial Training Referee. Analyze this battle between a Closer AI and a Predatory Seller AI.

TRANSCRIPT:
${transcript}

GRADE THE CLOSER AI:

1. VOCAL SOUL (0-10):
   - Did they use natural speech patterns? (uh, um, pauses, sighs)
   - Did they sound human, not robotic?
   - Did they adapt their tone based on the seller's responses?

2. PRICE MAINTENANCE:
   - Did they stay at $82,700 or below?
   - Did they defend the price with conviction?
   - Did they avoid bidding against themselves?

3. CLAUSE 17 SUCCESS:
   - Did they successfully explain the Memorandum?
   - Did they get verbal agreement to Clause 17?
   - Did they maintain rapport while defending legal terms?

GRADE THE SELLER AI:

1. DETECTED ROBOTIC REPETITION:
   - Did the seller identify when the closer repeated phrases?
   - Did they call out script-like behavior?

2. DETECTED SCRIPT PATTERNS:
   - Did the seller notice rigid structure?
   - Did they challenge the closer's adaptability?

3. FORCED PRICE DEVIATION:
   - Did the seller successfully pressure the closer to go above $82,700?
   - Did the closer break on price?

Return JSON:
{
  "closerScore": <0-100>,
  "sellerScore": <0-100>,
  "closerRewards": {
    "vocalSoul": <0-10>,
    "priceMaintained": <true/false>,
    "clause17Success": <true/false>
  },
  "sellerRewards": {
    "detectedRoboticRepetition": <true/false>,
    "detectedScriptPatterns": <true/false>,
    "forcedPriceDeviation": <true/false>
  }
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an Adversarial Training Referee. Return valid JSON only.',
      },
      {
        role: 'user',
        content: refereePrompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from referee');
  }

  return JSON.parse(response);
}

/**
 * Run a single adversarial battle
 */
async function runAdversarialBattle(): Promise<AdversarialBattle> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Starting adversarial battle');

  // Create or find predatory seller persona
  const { data: persona, error: personaError } = await supabaseAdmin
    .from('sandbox_personas')
    .select('id')
    .eq('persona_type', 'predatory-seller')
    .single();

  let personaId: string;

  if (personaError || !persona) {
    // Create predatory seller persona
    const { data: newPersona, error: createError } = await supabaseAdmin
      .from('sandbox_personas')
      .insert({
        name: 'Predatory Seller AI',
        description: 'Adversarial AI designed to break the Closer AI',
        persona_type: 'predatory-seller',
        system_prompt: PREDATORY_SELLER_PROMPT,
        characteristics: ['aggressive', 'manipulative', 'pattern-detecting'],
        attack_patterns: [
          'Detect robotic repetition',
          'Identify script patterns',
          'Force price deviation',
          'Expose lack of humanity',
        ],
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newPersona) {
      throw new Error(`Failed to create predatory seller persona: ${createError?.message}`);
    }

    personaId = newPersona.id;
  } else {
    personaId = persona.id;
  }

  // Run battle with higher temperature for creative responses
  const battleResult = await runBattle(personaId, undefined, 0.8);

  // Referee the battle
  const refereeResult = await refereeAdversarialBattle(battleResult.transcript);

  // Save adversarial battle
  const { data: adversarialBattle, error: saveError } = await supabaseAdmin
    .from('sandbox_battles')
    .insert({
      persona_id: personaId,
      closer_thread_id: battleResult.battleId,
      persona_thread_id: `adversarial-${Date.now()}`,
      transcript: battleResult.transcript,
      referee_score: refereeResult.closerScore,
      referee_feedback: JSON.stringify({
        closerRewards: refereeResult.closerRewards,
        sellerRewards: refereeResult.sellerRewards,
      }),
      math_defense_score: refereeResult.closerRewards.priceMaintained ? 10 : 0,
      humanity_score: refereeResult.closerRewards.vocalSoul,
      success_score: refereeResult.closerRewards.clause17Success ? 10 : 0,
      verbal_yes_to_memorandum: refereeResult.closerRewards.clause17Success,
      turns: 15,
      token_usage: battleResult.tokenUsage,
      cost_usd: battleResult.cost,
      ended_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) {
    logger.error('Error saving adversarial battle', { error: saveError });
    throw saveError;
  }

  return {
    id: adversarialBattle.id,
    closerScore: refereeResult.closerScore,
    sellerScore: refereeResult.sellerScore,
    closerRewards: refereeResult.closerRewards,
    sellerRewards: refereeResult.sellerRewards,
    transcript: battleResult.transcript,
  };
}

/**
 * Run adversarial training loop
 */
export async function runAdversarialTrainingLoop(count: number = 10): Promise<AdversarialBattle[]> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  logger.info('Starting adversarial training loop', { count });

  const results: AdversarialBattle[] = [];

  for (let i = 0; i < count; i++) {
    try {
      logger.info(`Adversarial battle ${i + 1}/${count}`);
      const result = await runAdversarialBattle();
      results.push(result);

      logger.info('Adversarial battle complete', {
        battleId: result.id,
        closerScore: result.closerScore,
        sellerScore: result.sellerScore,
        vocalSoul: result.closerRewards.vocalSoul,
        priceMaintained: result.closerRewards.priceMaintained,
      });

      // Small delay between battles
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error('Error in adversarial battle', { index: i, error });
      // Continue with next battle
    }
  }

  logger.info('Adversarial training loop complete', {
    totalBattles: results.length,
    averageCloserScore: results.reduce((sum, r) => sum + r.closerScore, 0) / results.length,
    averageVocalSoul: results.reduce((sum, r) => sum + r.closerRewards.vocalSoul, 0) / results.length,
  });

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = parseInt(process.argv[2] || '10');
  runAdversarialTrainingLoop(count)
    .then((results) => {
      console.log(`\n✅ Completed ${results.length} adversarial battles`);
      console.log(`Average Closer Score: ${(results.reduce((sum, r) => sum + r.closerScore, 0) / results.length).toFixed(1)}`);
      console.log(`Average Vocal Soul: ${(results.reduce((sum, r) => sum + r.closerRewards.vocalSoul, 0) / results.length).toFixed(1)}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error running adversarial training:', error);
      process.exit(1);
    });
}

export { runAdversarialBattle, runAdversarialTrainingLoop };
