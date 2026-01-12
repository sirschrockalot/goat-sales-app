/**
 * Ignition Script
 * Initiates the first 5 autonomous battles in the Sandbox
 * Initializes Budget Monitor and executes parallel Vapi Web-Calls
 */

import { runBattle } from './autonomousBattle';
import { checkBudget, getBudgetStatus } from '../src/lib/budgetMonitor';
import { getSupabaseClientForEnv, assertEnvironment } from '../src/lib/env-manager';
import logger from '../src/lib/logger';
import { auditVocalSoul } from './vocalSoulAuditor';

/**
 * Fetch 5 random Principal Partner personas from training_personas table
 */
async function fetchRandomPersonas(count: number = 5): Promise<any[]> {
  const supabase = getSupabaseClientForEnv('sandbox');
  
  const { data: personas, error } = await supabase
    .from('training_personas')
    .select('*')
    .eq('is_active', true)
    .limit(count * 2); // Fetch more than needed for randomization
  
  if (error) {
    logger.error('Error fetching personas', { error });
    throw error;
  }

  if (!personas || personas.length === 0) {
    // Fallback to sandbox_personas if training_personas is empty
    const { data: fallbackPersonas, error: fallbackError } = await supabase
      .from('sandbox_personas')
      .select('*')
      .eq('is_active', true)
      .limit(count * 2);
    
    if (fallbackError || !fallbackPersonas || fallbackPersonas.length === 0) {
      throw new Error('No active personas found in training_personas or sandbox_personas');
    }
    
    // Randomize and return requested count
    const shuffled = fallbackPersonas.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Randomize and return requested count
  const shuffled = personas.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Execute a single battle with Vocal Soul Auditor grading
 */
async function executeBattleWithAuditor(persona: any): Promise<{
  battleId: string;
  score: any;
  transcript: string;
  humanityGrade?: number;
}> {
  logger.info('Starting battle', { personaName: persona.name, personaId: persona.id });

  // Run the battle
  const battleResult = await runBattle(
    persona.id,
    undefined, // closerAssistantId (will be created dynamically)
    0.7 // temperature
  );

  // Run Vocal Soul Auditor
  let humanityGrade: number | undefined;
  try {
    const auditResult = await auditVocalSoul(battleResult.battleId, battleResult.transcript);
    humanityGrade = auditResult.humanityGrade;
    
    logger.info('Vocal Soul Auditor complete', {
      battleId: battleResult.battleId,
      humanityGrade,
    });
  } catch (error) {
    logger.warn('Vocal Soul Auditor failed', { error, battleId: battleResult.battleId });
    // Continue even if auditor fails
  }

  return {
    battleId: battleResult.battleId,
    score: battleResult.score,
    transcript: battleResult.transcript,
    humanityGrade,
  };
}

/**
 * Main ignition function
 * Initializes Budget Monitor and executes 5 parallel battles
 */
async function igniteTraining(): Promise<void> {
  logger.info('🚀 IGNITION SEQUENCE STARTED');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Ensure we're in SANDBOX mode
  try {
    assertEnvironment('sandbox');
  } catch (error) {
    logger.error('Environment check failed', { error });
    throw new Error('Must run in SANDBOX environment. Set EXPLICIT_ENV=sandbox');
  }

  // Step 1: Initialize Budget Monitor
  logger.info('📊 Step 1: Initializing Budget Monitor...');
  try {
    await checkBudget(); // Throws if daily cap exceeded
    const budgetStatus = await getBudgetStatus();
    logger.info('Budget status', {
      dailySpend: budgetStatus.dailySpend,
      remaining: budgetStatus.remaining,
      isThrottled: budgetStatus.isThrottled,
    });
    logger.info('✅ Budget Monitor initialized');
  } catch (error: any) {
    if (error.message?.includes('Budget Limit Reached')) {
      logger.error('❌ Budget limit reached. Training paused.');
      throw error;
    }
    throw error;
  }

  // Step 2: Fetch 5 random Principal Partner personas
  logger.info('👥 Step 2: Fetching Principal Partner personas...');
  const personas = await fetchRandomPersonas(5);
  logger.info(`✅ Fetched ${personas.length} personas:`, personas.map(p => p.name));

  // Step 3: Execute parallel battles
  logger.info('⚔️  Step 3: Executing 5 parallel battles...');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const battlePromises = personas.map((persona, index) => {
    logger.info(`Starting battle ${index + 1}/5`, { personaName: persona.name });
    return executeBattleWithAuditor(persona)
      .then((result) => {
        logger.info(`✅ Battle ${index + 1} complete`, {
          personaName: persona.name,
          battleId: result.battleId,
          score: result.score.totalScore,
          humanityGrade: result.humanityGrade,
        });
        return result;
      })
      .catch((error) => {
        logger.error(`❌ Battle ${index + 1} failed`, {
          personaName: persona.name,
          error,
        });
        throw error;
      });
  });

  // Execute all battles in parallel
  const results = await Promise.allSettled(battlePromises);

  // Step 4: Report results
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 IGNITION RESULTS');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info(`✅ Successful: ${successful}/5`);
  logger.info(`❌ Failed: ${failed}/5`);

  // Log successful battle details
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const battleResult = result.value;
      logger.info(`Battle ${index + 1}:`, {
        battleId: battleResult.battleId,
        score: battleResult.score.totalScore,
        mathDefense: battleResult.score.mathDefense,
        humanity: battleResult.score.humanity,
        success: battleResult.score.success,
        humanityGrade: battleResult.humanityGrade,
      });
    } else {
      logger.error(`Battle ${index + 1} error:`, result.reason);
    }
  });

  // Final budget check
  const finalBudget = await getBudgetStatus();
  logger.info('Final budget status', {
    dailySpend: finalBudget.dailySpend,
    remaining: finalBudget.remaining,
  });

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🎉 IGNITION SEQUENCE COMPLETE');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  igniteTraining()
    .then(() => {
      console.log('\n✅ Ignition complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ignition failed:', error);
      process.exit(1);
    });
}

export { igniteTraining, fetchRandomPersonas };
