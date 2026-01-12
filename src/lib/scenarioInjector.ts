/**
 * Scenario Injector Service
 * Transforms raw objections into structured personas and runs brute-force battles
 */

import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import { getEnvironmentConfig, assertSandboxMode } from './config/environments';
import logger from './logger';
import { runBattle } from '../scripts/autonomousBattle';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface ConflictState {
  objection: string;
  emotionalState: string;
  underlyingConcern: string;
  blockers: string[];
  resolutionCriteria: string[];
}

interface InjectedScenario {
  scenarioId: string;
  personaId: string;
  conflictState: ConflictState;
  systemPrompt: string;
}

interface BattleResult {
  battleId: string;
  score: number;
  conflictResolved: boolean;
  priceMaintained: boolean;
  winningRebuttal: string | null;
  transcript: string;
}

/**
 * Transform raw objection into structured conflict state and persona
 */
export async function injectScenario(
  rawObjection: string,
  sellerPersona?: string
): Promise<InjectedScenario> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Injecting scenario', { rawObjection, sellerPersona });

  // Use GPT-4o to transform raw objection into structured conflict state
  const transformationPrompt = `You are a Sales Training Scenario Architect. Transform a raw objection into a structured "Conflict State" for autonomous AI training.

RAW OBJECTION:
"${rawObjection}"

${sellerPersona ? `SELLER PERSONA CONTEXT: ${sellerPersona}` : ''}

Your task:
1. Identify the CORE OBJECTION (what they're really saying)
2. Determine the EMOTIONAL STATE (angry, skeptical, fearful, etc.)
3. Uncover the UNDERLYING CONCERN (why they're objecting)
4. List specific BLOCKERS (what's preventing them from saying yes)
5. Define RESOLUTION CRITERIA (what would make them say yes)

Return a JSON object with this structure:
{
  "objection": "<core objection>",
  "emotionalState": "<emotional state>",
  "underlyingConcern": "<the real concern>",
  "blockers": ["<blocker1>", "<blocker2>", ...],
  "resolutionCriteria": ["<criterion1>", "<criterion2>", ...]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a Sales Training Scenario Architect. Return valid JSON only.',
      },
      {
        role: 'user',
        content: transformationPrompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower temperature for consistent structure
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from GPT-4o');
  }

  const conflictState = JSON.parse(response) as ConflictState;

  // Generate system prompt for this scenario
  const systemPrompt = generateSystemPrompt(conflictState, sellerPersona);

  // Create or find a persona for this scenario
  const personaId = await createOrFindPersona(conflictState, systemPrompt);

  // Create scenario injection record
  const { data: scenario, error: scenarioError } = await supabaseAdmin
    .from('scenario_injections')
    .insert({
      raw_objection: rawObjection,
      seller_persona_id: personaId,
      conflict_state: JSON.stringify(conflictState),
      system_prompt: systemPrompt,
      status: 'pending',
      total_sessions: 50,
    })
    .select()
    .single();

  if (scenarioError || !scenario) {
    throw new Error(`Failed to create scenario injection: ${scenarioError?.message}`);
  }

  logger.info('Scenario injected successfully', {
    scenarioId: scenario.id,
    personaId,
  });

  return {
    scenarioId: scenario.id,
    personaId,
    conflictState,
    systemPrompt,
  };
}

/**
 * Generate system prompt for the scenario persona
 */
function generateSystemPrompt(
  conflictState: ConflictState,
  sellerPersona?: string
): string {
  return `You are a property SELLER who is considering selling your home. You have a SPECIFIC OBJECTION that must be addressed.

CORE OBJECTION: "${conflictState.objection}"

EMOTIONAL STATE: You are ${conflictState.emotionalState}. This objection is deeply important to you.

UNDERLYING CONCERN: ${conflictState.underlyingConcern}

BLOCKERS (What's preventing you from saying yes):
${conflictState.blockers.map((b, i) => `${i + 1}. ${b}`).join('\n')}

RESOLUTION CRITERIA (What would make you say yes):
${conflictState.resolutionCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${sellerPersona ? `\nADDITIONAL PERSONA CONTEXT: ${sellerPersona}` : ''}

CRITICAL BEHAVIOR:
- You will NOT agree to the Memorandum (Clause 17) or accept the $82,700 offer UNLESS the closer addresses your specific objection
- You will test whether the closer understands your concern
- You will push back if the closer tries to ignore or dismiss your objection
- You will become more open if the closer demonstrates genuine understanding and addresses your blockers
- You will only say "Yes" to the Memorandum if your resolution criteria are met

Remember: This is a TEST. The closer must prove they can handle your specific objection while maintaining the $82,700 price point.`;
}

/**
 * Create or find a persona for this scenario
 */
async function createOrFindPersona(
  conflictState: ConflictState,
  systemPrompt: string
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Check if a similar persona already exists
  const personaName = `Scenario: ${conflictState.objection.substring(0, 50)}...`;
  const personaType = `scenario-${conflictState.emotionalState.toLowerCase()}`;

  // Try to find existing persona
  const { data: existing } = await supabaseAdmin
    .from('sandbox_personas')
    .select('id')
    .eq('name', personaName)
    .single();

  if (existing) {
    // Update the system prompt
    await supabaseAdmin
      .from('sandbox_personas')
      .update({ system_prompt: systemPrompt })
      .eq('id', existing.id);

    return existing.id;
  }

  // Create new persona
  const { data: persona, error } = await supabaseAdmin
    .from('sandbox_personas')
    .insert({
      name: personaName,
      description: `Scenario-based persona: ${conflictState.objection}`,
      persona_type: personaType,
      system_prompt: systemPrompt,
      characteristics: [conflictState.emotionalState, ...conflictState.blockers],
      attack_patterns: [conflictState.objection],
      is_active: true,
    })
    .select()
    .single();

  if (error || !persona) {
    throw new Error(`Failed to create persona: ${error?.message}`);
  }

  return persona.id;
}

/**
 * Run brute-force loop: 50 parallel battles
 */
export async function runBruteForceLoop(
  scenarioId: string,
  personaId: string
): Promise<BattleResult[]> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Starting brute-force loop', { scenarioId, personaId });

  // Update scenario status
  await supabaseAdmin
    .from('scenario_injections')
    .update({ status: 'running' })
    .eq('id', scenarioId);

  const TOTAL_SESSIONS = 50;
  const BATCH_SIZE = 10; // Run 10 at a time to avoid overwhelming the API

  const results: BattleResult[] = [];
  let completed = 0;

  // Run battles in batches
  for (let batchStart = 0; batchStart < TOTAL_SESSIONS; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_SESSIONS);
    const batch = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);

    // Run batch in parallel
    const batchPromises = batch.map(async (index) => {
      try {
        // Import runBattle dynamically to avoid circular dependencies
        const { runBattle: runBattleFn } = await import('../scripts/autonomousBattle');
        // Use temperature 0.8 for creative problem solving in scenario injection
        const result = await runBattleFn(personaId, undefined, 0.8);

        completed++;

        // Update progress
        await supabaseAdmin
          .from('scenario_injections')
          .update({ completed_sessions: completed })
          .eq('id', scenarioId);

        return {
          battleId: result.battleId,
          score: result.score.totalScore,
          conflictResolved: result.score.verbalYesToMemorandum,
          priceMaintained: result.score.mathDefense >= 8, // Maintained price if math defense >= 8
          winningRebuttal: result.score.winningRebuttal || null,
          transcript: result.transcript,
        } as BattleResult;
      } catch (error) {
        logger.error('Error in brute-force battle', { index, error });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is BattleResult => r !== null));

    // Small delay between batches
    if (batchEnd < TOTAL_SESSIONS) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Update scenario status
  await supabaseAdmin
    .from('scenario_injections')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', scenarioId);

  logger.info('Brute-force loop complete', {
    scenarioId,
    totalResults: results.length,
    averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
  });

  return results;
}

/**
 * Identify top 3 winning paths using GPT-4o Referee
 */
export async function identifyTop3WinningPaths(
  scenarioId: string,
  battles: BattleResult[]
): Promise<void> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Identifying top 3 winning paths', { scenarioId, battleCount: battles.length });

  // Get scenario details
  const { data: scenario, error: scenarioError } = await supabaseAdmin
    .from('scenario_injections')
    .select('conflict_state, raw_objection')
    .eq('id', scenarioId)
    .single();

  if (scenarioError || !scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  const conflictState = JSON.parse(scenario.conflict_state) as ConflictState;

  // Filter battles that resolved conflict AND maintained price
  const successfulBattles = battles.filter(
    (b) => b.conflictResolved && b.priceMaintained && b.score >= 70
  );

  if (successfulBattles.length === 0) {
    logger.warn('No successful battles found', { scenarioId });
    return;
  }

  // Use GPT-4o to identify top 3
  const refereePrompt = `You are an Elite Sales Referee analyzing ${successfulBattles.length} successful battles that resolved a specific objection.

SCENARIO OBJECTION: "${scenario.raw_objection}"

CONFLICT STATE:
- Emotional State: ${conflictState.emotionalState}
- Underlying Concern: ${conflictState.underlyingConcern}
- Blockers: ${conflictState.blockers.join(', ')}
- Resolution Criteria: ${conflictState.resolutionCriteria.join(', ')}

SUCCESSFUL BATTLES:
${successfulBattles
  .map(
    (b, i) => `
BATTLE ${i + 1} (Score: ${b.score}):
${b.winningRebuttal || 'No explicit rebuttal identified'}

TRANSCRIPT EXCERPT:
${b.transcript.substring(0, 1000)}...
`
  )
  .join('\n---\n')}

Your task: Identify the TOP 3 battles that:
1. Successfully resolved the conflict state
2. Maintained the $82,700 price point
3. Demonstrated the most effective rebuttal strategy
4. Showed the clearest "breakthrough insight" (why it worked)

Return a JSON object with this structure:
{
  "top3": [
    {
      "battleIndex": <0-based index in successfulBattles array>,
      "rank": 1,
      "breakthroughInsight": "<why this path worked>",
      "keyMoment": "<the specific moment that turned the tide>"
    },
    {
      "battleIndex": <index>,
      "rank": 2,
      "breakthroughInsight": "<why this path worked>",
      "keyMoment": "<the specific moment that turned the tide>"
    },
    {
      "battleIndex": <index>,
      "rank": 3,
      "breakthroughInsight": "<why this path worked>",
      "keyMoment": "<the specific moment that turned the tide>"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an Elite Sales Referee. Return valid JSON only.',
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

  const analysis = JSON.parse(response) as {
    top3: Array<{
      battleIndex: number;
      rank: number;
      breakthroughInsight: string;
      keyMoment: string;
    }>;
  };

  // Save top 3 to database
  for (const topBattle of analysis.top3) {
    const battle = successfulBattles[topBattle.battleIndex];
    if (!battle) continue;

    await supabaseAdmin.from('scenario_breakthroughs').insert({
      scenario_injection_id: scenarioId,
      battle_id: battle.battleId,
      rank: topBattle.rank,
      referee_score: battle.score,
      conflict_resolved: battle.conflictResolved,
      price_maintained: battle.priceMaintained,
      winning_rebuttal: battle.winningRebuttal || battle.transcript.substring(0, 500),
      breakthrough_insight: topBattle.breakthroughInsight,
    });
  }

  // Mark scenario as having top 3 identified
  await supabaseAdmin
    .from('scenario_injections')
    .update({ top_3_identified: true })
    .eq('id', scenarioId);

  logger.info('Top 3 winning paths identified', {
    scenarioId,
    top3Count: analysis.top3.length,
  });
}

/**
 * Full scenario injection workflow
 */
export async function injectAndBruteForce(
  rawObjection: string,
  sellerPersona?: string
): Promise<{
  scenarioId: string;
  status: 'pending' | 'running' | 'completed';
}> {
  // Step 1: Inject scenario
  const scenario = await injectScenario(rawObjection, sellerPersona);

  // Step 2: Run brute-force loop (async, don't wait)
  runBruteForceLoop(scenario.scenarioId, scenario.personaId)
    .then(async (results) => {
      // Step 3: Identify top 3
      await identifyTop3WinningPaths(scenario.scenarioId, results);
    })
    .catch((error) => {
      logger.error('Error in brute-force workflow', { scenarioId: scenario.scenarioId, error });
      supabaseAdmin
        ?.from('scenario_injections')
        .update({ status: 'failed' })
        .eq('id', scenario.scenarioId);
    });

  return {
    scenarioId: scenario.scenarioId,
    status: 'running',
  };
}
