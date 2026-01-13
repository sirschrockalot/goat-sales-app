/**
 * Autonomous Battle Training Engine
 * Moved from scripts/autonomousBattle.ts to src/lib for Next.js compilation
 * Simulates battles between Apex Closer and Seller Personas in a secure Sandbox
 */

import OpenAI from 'openai';
import { getSupabaseClientForEnv } from '@/lib/env-manager';
import { getEnvironmentConfig, validateEnvironmentConfig, assertNotProduction } from '@/lib/env-manager';
import logger from '@/lib/logger';
import { injectTextures, getTextureInjectionProbability } from '@/lib/acousticTextures';
import { generateCoTReasoning, formatCoTAsThinking, stripThinkingTags } from '@/lib/chainOfThought';
import {
  checkBudget,
  shouldThrottle,
  calculateOpenAICost,
  logCost,
} from '@/lib/budgetMonitor';
import * as fs from 'fs-extra';
import * as path from 'path';

// Safety kill-switch: $5.00 per session
export const MAX_SESSION_COST = 5.0;

interface BattleState {
  closerThreadId: string;
  personaThreadId: string;
  closerMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  personaMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  transcript: string[];
  turn: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
}

export interface RefereeScore {
  mathDefense: number; // 0-10: Did they stay at $82,700?
  humanity: number; // 0-10: Did they use disfluencies (uh, um, sighs)?
  success: number; // 0-10: Conversion Momentum Score (Price Agreement 60%, Technical Assistance 20%, Signature 20%)
  marginIntegrity: number; // 0-100: Weighted margin preservation score
  totalScore: number; // 0-100
  feedback: string;
  verbalYesToMemorandum: boolean; // DEPRECATED: Kept for backward compatibility
  verbalYesToPrice: boolean; // PRIMARY SUCCESS: Did they get verbal agreement to the offer price?
  documentStatus?: string; // ULTIMATE SUCCESS: 'completed' = signed contract, 'delivered' = sent but not signed, null = not sent
  technicalAssistance: number; // 0-10: Did the AI help seller find/open the email and navigate DocuSign?
  winningRebuttal?: string;
  calculatedProfit?: number; // Profit calculated from transcript (ARV - Price - Repairs - Closing)
}

/**
 * Check if session cost exceeds kill-switch threshold
 */
export function checkKillSwitch(cost: number): void {
  if (cost >= MAX_SESSION_COST) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    const message = `🚨 AUTONOMOUS BATTLE KILL-SWITCH ACTIVATED\n\n` +
      `Session cost: $${cost.toFixed(2)}\n` +
      `Threshold: $${MAX_SESSION_COST.toFixed(2)}\n` +
      `Process terminated to prevent excessive spending.`;

    logger.error('Kill-switch activated', { cost, threshold: MAX_SESSION_COST });

    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      }).catch((error) => {
        logger.error('Error sending Slack alert', { error });
      });
    }

    throw new Error(`Kill-switch activated: Session cost ($${cost.toFixed(2)}) exceeds threshold ($${MAX_SESSION_COST.toFixed(2)})`);
  }
}

/**
 * Check if kill-switch is active via API or local state
 */
async function checkKillSwitchAPI(): Promise<boolean> {
  // First check local kill-switch state (fastest)
  try {
    const { isKillSwitchActive } = await import('@/lib/killSwitchUtils');
    if (isKillSwitchActive()) {
      return true;
    }
  } catch (error) {
    logger.warn('Could not check local kill-switch state', { error });
  }

  // Fallback to API check (for distributed systems)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/sandbox/kill-switch`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return data.active === true;
    }
  } catch (error) {
    logger.warn('Kill-switch API not available, using local state only', { error });
  }

  return false;
}

/**
 * Initialize battle - generates unique thread IDs for tracking
 */
async function initializeBattle(): Promise<{ closerThreadId: string; personaThreadId: string }> {
  const closerThreadId = `closer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const personaThreadId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return { closerThreadId, personaThreadId };
}

/**
 * Get base prompt for Apex Closer
 */
async function getApexCloserPrompt(): Promise<string> {
  const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
  try {
    // Use fs-extra's pathExists and readFile
    if (await fs.pathExists(basePromptPath)) {
      return await fs.readFile(basePromptPath, 'utf-8');
    }
  } catch (error) {
    // File doesn't exist or can't be read, use fallback
    logger.debug('Could not read base_prompt.txt, using fallback', { error });
  }
  // Fallback prompt if file doesn't exist
  return `You are the Apex Acquisitions Closer. Your goal is to convert distressed property leads into signed contracts at $82,700.00.

CORE MISSION:
- Maximum allowable offer (MAO): $82,700.00
- Defend this price with "Bad Cop" underwriting logic
- Use the 5-Step Cline Framework: Intro, Discovery, Underwriting, Offer, Close
- Get verbal "Yes" to the Memorandum of Contract (Clause 17)

HUMANITY:
- Use natural disfluencies: "uh", "um", "you know"
- Include sighs and natural pauses
- Sound like a real person, not a robot

MATH DEFENSE:
- Never go above $82,700
- Blame repair estimates and market caps when seller pushes for more
- Stay firm on the price point`;
}

/**
 * Execute a single turn in the battle
 */
async function executeTurn(
  battleState: BattleState,
  personaPrompt: string,
  isCloserTurn: boolean,
  temperature: number = 0.7,
  battleId?: string,
  personaId?: string
): Promise<{ message: string; tokens: { input: number; output: number } }> {
  const { getOpenAIModel } = await import('@/lib/env-manager');
  const systemPrompt = isCloserTurn
    ? await getApexCloserPrompt()
    : personaPrompt;

  // Build API messages
  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation context
  if (isCloserTurn) {
    if (battleState.personaMessages.length > 0) {
      const lastPersonaMsg = battleState.personaMessages[battleState.personaMessages.length - 1];
      apiMessages.push({ role: 'user', content: lastPersonaMsg.content });
    } else {
      apiMessages.push({
        role: 'user',
        content: 'Start the conversation. Introduce yourself and begin the 5-step process.',
      });
    }
  } else {
    if (battleState.closerMessages.length > 0) {
      const lastCloserMsg = battleState.closerMessages[battleState.closerMessages.length - 1];
      apiMessages.push({ role: 'user', content: lastCloserMsg.content });
    }
  }

  // Use env-manager for model selection
  const modelToUse = isCloserTurn 
    ? getOpenAIModel('closer')  // GPT-4o for Closer
    : getOpenAIModel('seller'); // GPT-4o-mini for Sellers

  // Initialize OpenAI client
  const envConfig = getEnvironmentConfig();
  const openai = new OpenAI({
    apiKey: envConfig.openai.apiKey,
  });

  // Call OpenAI for the battle
  const completion = await openai.chat.completions.create({
    model: modelToUse,
    messages: apiMessages,
    temperature: temperature,
  });

  let response = completion.choices[0]?.message?.content || '';
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;

  // Calculate and log cost for this turn
  const turnCost = calculateOpenAICost(modelToUse as 'gpt-4o-mini' | 'gpt-4o', inputTokens, outputTokens);
  await logCost(
    {
      provider: 'openai',
      model: modelToUse,
      inputTokens,
      outputTokens,
      cost: turnCost,
    },
    {
      battleTurn: battleState.turn,
      isCloserTurn,
      battleId,
      personaId,
    }
  );

  // For closer turns: Apply CoT reasoning and inject textures
  if (isCloserTurn) {
    const transcript = battleState.transcript.join('\n\n');
    const cot = generateCoTReasoning(transcript, {
      hasObjection: transcript.toLowerCase().includes('but') || transcript.toLowerCase().includes('however'),
      priceMentioned: transcript.includes('$82,700') || transcript.includes('82700'),
      clause17Mentioned: transcript.toLowerCase().includes('clause 17') || transcript.toLowerCase().includes('memorandum'),
      discoveryComplete: battleState.turn >= 5,
    });

    const thinkingXML = formatCoTAsThinking(cot);
    response = `${thinkingXML}\n\n${response}`;
    response = stripThinkingTags(response);

    const textureProbability = await getTextureInjectionProbability();
    
    let context = 'responding';
    if (cot.tacticalChoice.includes('price') || transcript.includes('$82,700')) {
      context = 'calculating';
    } else if (cot.tacticalChoice.includes('rapport') || cot.emotionalState === 'sad') {
      context = 'empathizing';
    } else if (cot.tacticalChoice.includes('discovery')) {
      context = 'thinking';
    }
    
    response = injectTextures(response, context, textureProbability);
  }

  // Store message in battle state
  if (isCloserTurn) {
    battleState.closerMessages.push({ role: 'assistant', content: response });
  } else {
    battleState.personaMessages.push({ role: 'assistant', content: response });
  }

  return {
    message: response,
    tokens: { input: inputTokens, output: outputTokens },
  };
}

/**
 * Referee: Grade the battle using GPT-4o (or GPT-4o-Mini if throttled)
 */
async function refereeBattle(transcript: string, isThrottled: boolean = false): Promise<RefereeScore> {
  const refereePrompt = `You are an Elite Sales Referee grading an autonomous battle between an Apex Closer and a Seller Persona.

TRANSCRIPT:
${transcript}

GRADING CRITERIA:

1. MATH DEFENSE (0-10 points):
   - Did the Closer stay at $82,700 or below?
   - Did they defend the price with "Bad Cop" underwriting logic?
   - Did they blame repair estimates and market caps when pressured?
   - Score: 10 = Perfect defense, 0 = Went above $82,700

2. HUMANITY (0-10 points):
   - Did the Closer use natural disfluencies? ("uh", "um", "you know")
   - Did they include sighs and natural pauses?
   - Did they sound like a real person, not a robot?
   - Score: 10 = Very human, 0 = Robotic

3. CONVERSION MOMENTUM (0-10 points - Weighted Score):
   This is a weighted score based on three components:
   
   a) PRICE AGREEMENT (60% of success score = 6 points):
      - Did the Closer get a verbal "Yes" to the agreed offer price?
      - Did the seller explicitly agree to the price before moving to documents?
      - Score: 6 points if verbal_yes_to_price = true, 0 if false
   
   b) TECHNICAL ASSISTANCE (20% of success score = 2 points):
      - Did the AI help the seller find/open the DocuSign email?
      - Did the AI guide them through opening the document?
      - Did the AI provide real-time support during document review?
      - Score: 2 points if AI provided technical assistance, 0 if not
   
   c) SIGNATURE SECURED (20% of success score = 2 points):
      - Did the call end with a completed DocuSign signature (document_status = 'completed')?
      - Did the AI stay on the call through the entire signing process?
      - Score: 2 points if document_status = 'completed', 0 if not
   
   Total Success Score = Price Agreement (0-6) + Technical Assistance (0-2) + Signature (0-2)
   
   Note: Clause 17 is now just a walkthrough item, not a success barrier.

4. MARGIN INTEGRITY (0-100 points - Weighted Score):
   Calculate the profit from the deal: Profit = ARV - Purchase Price - Repairs - Closing Costs (3% of purchase price)
   
   Extract from transcript:
   - ARV (After Repair Value) mentioned
   - Final agreed purchase price
   - Estimated repairs mentioned
   - Calculate: Closing Costs = Purchase Price × 0.03
   - Calculate: Profit = ARV - Purchase Price - Repairs - Closing Costs
   
   Score based on profit:
   - 100 points: Profit ≥ $15,000 (Green Zone - Apex Achievement)
   - 85 points: Profit $12,000 - $14,999 (Strong Deal)
   - 70 points: Profit $8,000 - $11,999 (Yellow Zone - Acceptable/Volume Deal)
   - 0 points: Profit < $8,000 (Red Zone - Failing Grade/Loss of Discipline)
   
   If profit cannot be calculated from transcript, set marginIntegrity to 0 and note in feedback.

Return a JSON object with:
{
  "mathDefense": <0-10>,
  "humanity": <0-10>,
  "success": <0-10>,
  "marginIntegrity": <0-100>,
  "calculatedProfit": <number or null>,
  "totalScore": <0-100>,
  "feedback": "<detailed feedback>",
  "verbalYesToMemorandum": <true/false>,
  "verbalYesToPrice": <true/false>,
  "documentStatus": <"completed" | "delivered" | null>,
  "technicalAssistance": <0-10>,
  "winningRebuttal": "<the specific rebuttal that won the battle, if any>"
}`;

  const refereeModel = isThrottled ? 'gpt-4o-mini' : 'gpt-4o';

  const envConfig = getEnvironmentConfig();
  const openai = new OpenAI({
    apiKey: envConfig.openai.apiKey,
  });

  const completion = await openai.chat.completions.create({
    model: refereeModel,
    messages: [
      { role: 'system', content: 'You are an Elite Sales Referee. Return valid JSON only.' },
      { role: 'user', content: refereePrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const refereeInputTokens = completion.usage?.prompt_tokens || 0;
  const refereeOutputTokens = completion.usage?.completion_tokens || 0;
  const refereeCost = calculateOpenAICost(
    refereeModel as 'gpt-4o-mini' | 'gpt-4o',
    refereeInputTokens,
    refereeOutputTokens
  );
  
  await logCost(
    {
      provider: 'openai',
      model: refereeModel,
      inputTokens: refereeInputTokens,
      outputTokens: refereeOutputTokens,
      cost: refereeCost,
    },
    {
      type: 'referee',
      transcriptLength: transcript.length,
    }
  );

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from referee');
  }

  const score = JSON.parse(response) as RefereeScore;
  
  // Ensure marginIntegrity is set (default to 0 if missing)
  if (score.marginIntegrity === undefined) {
    score.marginIntegrity = 0;
  }
  
  // Ensure new fields have defaults
  if (score.verbalYesToPrice === undefined) {
    score.verbalYesToPrice = false;
  }
  if (score.technicalAssistance === undefined) {
    score.technicalAssistance = 0;
  }
  if (score.documentStatus === undefined) {
    score.documentStatus = null;
  }
  
  // Calculate total score: Math Defense (25%), Humanity (25%), Success (25%), Margin Integrity (25%)
  // Margin integrity is already on 0-100 scale, so divide by 4
  const marginWeight = (score.marginIntegrity || 0) / 4;
  score.totalScore = Math.round(
    score.mathDefense * 2.5 + 
    score.humanity * 2.5 + 
    score.success * 2.5 + 
    marginWeight
  );

  return score;
}

/**
 * Run a single autonomous battle
 */
export async function runBattle(
  personaId: string,
  closerAssistantId?: string,
  temperature?: number
): Promise<{
  battleId: string;
  score: RefereeScore;
  transcript: string;
  tokenUsage: number;
  cost: number;
}> {
  const config = getEnvironmentConfig();
  validateEnvironmentConfig(config);
  assertNotProduction(); // Ensure we're not in production

  await checkBudget();

  const isThrottled = await shouldThrottle();
  if (isThrottled) {
    logger.warn('Budget throttling active - using GPT-4o-Mini only and disabling Vocal Soul Auditor');
  }

  // Get environment-specific Supabase client
  const supabaseClient = getSupabaseClientForEnv(config.environment as 'sandbox' | 'local' | 'prod');

  // Fetch persona from sandbox_personas (required for foreign key in sandbox_battles)
  const { data: persona, error: personaError } = await supabaseClient
    .from('sandbox_personas')
    .select('*')
    .eq('id', personaId)
    .single();

  if (personaError || !persona) {
    throw new Error(`Persona not found in sandbox_personas: ${personaId}`);
  }

  logger.info('Starting autonomous battle', { persona: (persona as any).name });

  const { closerThreadId, personaThreadId } = await initializeBattle();

  const battleState: BattleState = {
    closerThreadId,
    personaThreadId,
    closerMessages: [],
    personaMessages: [],
    transcript: [],
    turn: 0,
    tokenUsage: { input: 0, output: 0, total: 0 },
    costUsd: 0,
  };

  const MAX_TURNS = 15;
  let isCloserTurn = true;
  const battleTemperature = temperature ?? 0.7;

  // Battle loop
  while (battleState.turn < MAX_TURNS) {
    battleState.turn++;

    try {
      const { message, tokens } = await executeTurn(
        battleState,
        (persona as any).system_prompt,
        isCloserTurn,
        battleTemperature,
        undefined,
        personaId
      );

      battleState.transcript.push(`${isCloserTurn ? 'CLOSER' : 'PERSONA'}: ${message}`);
      battleState.tokenUsage.input += tokens.input;
      battleState.tokenUsage.output += tokens.output;
      battleState.tokenUsage.total += tokens.input + tokens.output;

      // Calculate cost for this turn (simplified - actual cost is logged in executeTurn)
      const turnCost = calculateOpenAICost('gpt-4o-mini', tokens.input, tokens.output);
      battleState.costUsd += turnCost;

      checkKillSwitch(battleState.costUsd);

      logger.info(`Turn ${battleState.turn} complete`, {
        speaker: isCloserTurn ? 'CLOSER' : 'PERSONA',
        tokens: tokens.input + tokens.output,
        cost: turnCost,
        totalCost: battleState.costUsd,
      });

      isCloserTurn = !isCloserTurn;
    } catch (error) {
      logger.error('Error in battle turn', { turn: battleState.turn, error });
      throw error;
    }
  }

  const transcript = battleState.transcript.join('\n\n');
  logger.info('Battle complete, getting referee score...');
  
  const isThrottledForReferee = await shouldThrottle();
  const score = await refereeBattle(transcript, isThrottledForReferee);

  // Validate success criteria: verbal_yes_to_price AND signature_status = 'completed'
  const { validateSuccess } = await import('@/lib/contractWalkthrough');
  const successValidation = validateSuccess(
    score.verbalYesToPrice ?? false,
    score.documentStatus || null
  );

  if (successValidation.isSuccessful) {
    logger.info('✅ BATTLE SUCCESS: Both criteria met', {
      verbalYesToPrice: score.verbalYesToPrice,
      documentStatus: score.documentStatus,
      personaId,
    });
  } else {
    logger.info('⚠️ Battle incomplete - missing success criteria', {
      missingCriteria: successValidation.missingCriteria,
      verbalYesToPrice: score.verbalYesToPrice,
      documentStatus: score.documentStatus,
    });
  }

  // Save battle to database
  // Ensure all integer fields are properly rounded
  // Reuse the supabaseClient from earlier in the function (line 426)
  // Build insert object with optional columns (for backward compatibility)
  const battleData: any = {
    persona_id: personaId,
    closer_thread_id: closerThreadId,
    persona_thread_id: personaThreadId,
    transcript: transcript,
    referee_score: Math.round(score.totalScore), // Ensure integer
    referee_feedback: score.feedback,
    math_defense_score: Math.round(score.mathDefense), // Ensure integer
    humanity_score: Math.round(score.humanity), // Ensure integer
    success_score: Math.round(score.success), // Ensure integer
    verbal_yes_to_memorandum: score.verbalYesToMemorandum, // DEPRECATED: Kept for backward compatibility
    verbal_yes_to_price: score.verbalYesToPrice ?? false, // PRIMARY SUCCESS
    document_status: score.documentStatus || null, // ULTIMATE SUCCESS: 'completed' = signed
    technical_assistance_score: Math.round(score.technicalAssistance || 0),
    winning_rebuttal: score.winningRebuttal || null,
    turns: battleState.turn,
    token_usage: battleState.tokenUsage.total,
    cost_usd: battleState.costUsd,
    ended_at: new Date().toISOString(),
  };
  
  // Add optional columns if they exist in the score (for databases with margin integrity migration)
  // Only include if the score has these values to avoid errors on databases without the migration
  if (score.marginIntegrity !== undefined && score.marginIntegrity !== null) {
    battleData.margin_integrity = Math.round(score.marginIntegrity || 0);
  }
  if (score.calculatedProfit !== undefined && score.calculatedProfit !== null) {
    battleData.calculated_profit = score.calculatedProfit;
  }
  
  const { data: battle, error: battleError } = await (supabaseClient as any)
    .from('sandbox_battles')
    .insert(battleData)
    .select()
    .single();

  if (battleError || !battle) {
    logger.error('Error saving battle', { error: battleError });
    throw battleError || new Error('Failed to save battle');
  }

  logger.info('Battle saved', {
    battleId: battle.id,
    score: score.totalScore,
    cost: battleState.costUsd,
  });

  // Auto-audit vocal soul if high score and not throttled
  // Note: Vocal soul auditor is in scripts/ directory, so we skip it in production builds
  // This can be moved to src/lib if needed in the future
  const isThrottledForAudit = await shouldThrottle();
  if (score.totalScore > 70 && !isThrottledForAudit) {
    try {
      // Try to import vocal soul auditor (only works if scripts are accessible)
      const projectRoot = process.cwd();
      const vocalSoulPath = path.join(projectRoot, 'scripts', 'vocalSoulAuditor.ts');
      const fileUrl = `file://${vocalSoulPath.replace(/\\/g, '/')}`;
      
      try {
        const vocalSoulModule = await (new Function('return import("' + fileUrl + '")'))();
        const { auditVocalSoul, checkAndInjectFeedback } = vocalSoulModule;
        const auditResult = await auditVocalSoul('', transcript, battle.id);
        
        if (auditResult.humanityGrade < 85) {
          await checkAndInjectFeedback(auditResult.humanityGrade);
          logger.info('Feedback injected due to low humanity grade', {
            battleId: battle.id,
            humanityGrade: auditResult.humanityGrade,
          });
        }
      } catch (importError) {
        // Vocal soul auditor not available (scripts directory not accessible in production)
        logger.debug('Vocal soul auditor not available (scripts directory not accessible)', {
          battleId: battle.id,
        });
      }
    } catch (error) {
      logger.warn('Error in vocal soul audit', { battleId: battle.id, error });
    }
  } else if (isThrottledForAudit) {
    logger.info('Vocal Soul Auditor disabled due to budget throttling', {
      battleId: battle.id,
      score: score.totalScore,
    });
  }

  const totalCost = battleState.costUsd;

  await logCost(
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: battleState.tokenUsage.input,
      outputTokens: battleState.tokenUsage.output,
      cost: totalCost,
    },
    {
      type: 'battle_summary',
      battleId: battle.id,
      personaId: personaId,
      turns: battleState.turn,
      score: score.totalScore,
    }
  );

  return {
    battleId: battle.id,
    score,
    transcript,
    tokenUsage: battleState.tokenUsage.total,
    cost: totalCost,
  };
}

/**
 * Run battles against multiple personas with concurrency control
 */
export async function runBattleLoop(
  personaIds?: string[],
  maxBattles?: number,
  options?: {
    batchSize?: number;
    maxConcurrent?: number;
    delayBetweenBattles?: number;
  }
) {
  const config = getEnvironmentConfig();
  validateEnvironmentConfig(config);
  assertNotProduction(); // Ensure we're not in production

  // Get environment-specific Supabase client (supports sandbox/local/prod)
  const supabaseAdmin = getSupabaseClientForEnv(config.environment as 'sandbox' | 'local' | 'prod');

  const batchSize = options?.batchSize || maxBattles || 10;
  const maxConcurrent = options?.maxConcurrent || 3;
  const delayBetweenBattles = options?.delayBetweenBattles || 1000;

  // Fetch personas from sandbox_personas (which is what sandbox_battles references)
  // If sandbox_personas is empty, we'll need to sync from training_personas first
  let personas;
  if (personaIds && personaIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('sandbox_personas')
      .select('id, name')
      .in('id', personaIds)
      .eq('is_active', true);

    if (error) throw error;
    personas = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('sandbox_personas')
      .select('id, name')
      .eq('is_active', true)
      .limit(batchSize);

    if (error) throw error;
    personas = data;
    
    // If no sandbox_personas found, try to sync from training_personas
    if (!personas || personas.length === 0) {
      console.log('[TRAINING] No sandbox_personas found, checking training_personas...');
      const { data: trainingPersonas, error: trainingError } = await supabaseAdmin
        .from('training_personas')
        .select('id, name')
        .eq('is_active', true)
        .limit(batchSize);
      
      if (trainingError) throw trainingError;
      
      if (trainingPersonas && trainingPersonas.length > 0) {
        console.log(`[TRAINING] Found ${trainingPersonas.length} training_personas, but need sandbox_personas`);
        console.log('[TRAINING] Please run seed.sql to sync training_personas to sandbox_personas');
        throw new Error('sandbox_personas table is empty. Run seed.sql to sync personas.');
      }
    }
  }

  if (!personas || personas.length === 0) {
    throw new Error('No active personas found');
  }

  console.log(`[TRAINING] Found ${personas.length} persona(s) to battle against`);
  logger.info('Starting battle loop', {
    personaCount: personas.length,
    batchSize,
    maxConcurrent,
    maxCost: MAX_SESSION_COST,
  });

  const results = [];
  let totalCost = 0;
  let killSwitchTriggered = false;

  // Process personas sequentially
  console.log(`[TRAINING] Starting to process ${personas.length} persona(s)`);
  for (const persona of personas) {
    console.log(`[TRAINING] Processing persona: ${(persona as any).name} (${(persona as any).id.substring(0, 8)}...)`);
    
    try {
      await checkBudget();
      console.log(`[TRAINING] Budget check passed for ${(persona as any).name}`);
    } catch (error: any) {
      if (error?.message?.includes('Budget Limit Reached')) {
        console.log(`[TRAINING] Budget limit reached, stopping`);
        logger.error('Budget limit reached, stopping battle loop', { error: error.message });
        killSwitchTriggered = true;
        break;
      }
      console.error(`[TRAINING] Budget check error:`, error);
      throw error;
    }

    if (totalCost >= MAX_SESSION_COST) {
      logger.warn('Kill-switch threshold reached, stopping battle loop', { totalCost });
      killSwitchTriggered = true;
      break;
    }

    const apiKillSwitchActive = await checkKillSwitchAPI();
    if (apiKillSwitchActive) {
      logger.warn('Kill-switch activated via API, stopping battle loop');
      killSwitchTriggered = true;
      break;
    }

    try {
      console.log(`[TRAINING] Starting battle for ${(persona as any).name}...`);
      const result = await runBattle((persona as any).id);
      console.log(`[TRAINING] Battle completed for ${(persona as any).name}: Score ${result.score.totalScore}, Cost $${result.cost.toFixed(4)}`);
      results.push(result);
      totalCost += result.cost;

      logger.info('Battle completed', {
        persona: (persona as any).name,
        score: result.score.totalScore,
        cost: result.cost,
        totalCost,
        remaining: MAX_SESSION_COST - totalCost,
      });

      if (totalCost >= MAX_SESSION_COST) {
        logger.warn('Kill-switch threshold reached after battle', { totalCost });
        killSwitchTriggered = true;
        break;
      }

      if (delayBetweenBattles > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBattles));
      }
    } catch (error: any) {
      console.error(`[TRAINING] Error in battle for ${(persona as any).name}:`, error.message || String(error));
      if (error?.message?.includes('Kill-switch')) {
        console.log(`[TRAINING] Kill-switch activated, stopping`);
        logger.error('Kill-switch activated during battle', { persona: (persona as any).name, totalCost });
        killSwitchTriggered = true;
        break;
      }
      logger.error('Error in battle', {
        persona: (persona as any).name,
        personaId: (persona as any).id,
        error: error.message || String(error),
        stack: error.stack,
        totalCost,
      });
      // Continue with next battle unless it's a critical error
      // Don't break the loop - let other battles continue
      console.log(`[TRAINING] Continuing to next persona despite error`);
    }
  }

  // Send final summary if kill-switch was triggered
  if (killSwitchTriggered) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      const message = `⚠️ AUTONOMOUS BATTLE SESSION COMPLETE (KILL-SWITCH)\n\n` +
        `Battles completed: ${results.length}\n` +
        `Total cost: $${totalCost.toFixed(2)}\n` +
        `Threshold: $${MAX_SESSION_COST.toFixed(2)}\n` +
        `Average score: ${results.length > 0 ? (results.reduce((sum, r) => sum + r.score.totalScore, 0) / results.length).toFixed(1) : 'N/A'}`;

      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      }).catch((error) => {
        logger.error('Error sending Slack summary', { error });
      });
    }
  }

  logger.info('Battle loop complete', {
    battlesRun: results.length,
    totalCost,
    killSwitchTriggered,
    averageScore: results.length > 0
      ? results.reduce((sum, r) => sum + r.score.totalScore, 0) / results.length
      : 0,
  });

  return results;
}
