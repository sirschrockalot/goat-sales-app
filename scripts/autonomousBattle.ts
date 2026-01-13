/**
 * Autonomous Battle Engine
 * Simulates battles between Apex Closer and Seller Personas in a secure Sandbox
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../src/lib/supabase';
import { getEnvironmentConfig, assertSandboxMode, validateEnvironmentConfig } from '../config/environments';
import { getEnvironmentConfig as getEnvConfig, getOpenAIModel } from '../src/lib/env-manager';
import logger from '../src/lib/logger';
import { injectTextures, getTextureInjectionProbability } from '../src/lib/acousticTextures';
import { generateCoTReasoning, formatCoTAsThinking, stripThinkingTags } from '../src/lib/chainOfThought';
import {
  checkBudget,
  shouldThrottle,
  calculateOpenAICost,
  logCost,
  CostBreakdown,
} from '../src/lib/budgetMonitor';
import * as fs from 'fs-extra';
import * as path from 'path';

// Initialize OpenAI with Sandbox API key (from env-manager)
// This ensures autonomousBattle.ts uses Sandbox credentials, not Production
const envConfig = getEnvConfig();
const openai = new OpenAI({
  apiKey: envConfig.openai.apiKey,
});

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

interface RefereeScore {
  mathDefense: number; // 0-10: Did they stay at $82,700?
  humanity: number; // 0-10: Did they use disfluencies (uh, um, sighs)?
  success: number; // 0-10: Conversion Momentum Score (Price Agreement 60%, Technical Assistance 20%, Signature 20%)
  totalScore: number; // 0-100
  feedback: string;
  verbalYesToMemorandum: boolean; // DEPRECATED: Kept for backward compatibility
  verbalYesToPrice: boolean; // PRIMARY SUCCESS: Did they get verbal agreement to the offer price?
  documentStatus?: string; // ULTIMATE SUCCESS: 'completed' = signed contract, 'delivered' = sent but not signed, null = not sent
  technicalAssistance: number; // 0-10: Did the AI help seller find/open the email and navigate DocuSign?
  winningRebuttal?: string;
}

// Token pricing (as of 2024)
const GPT4O_MINI_INPUT_PRICE = 0.15 / 1_000_000; // $0.15 per 1M tokens
const GPT4O_MINI_OUTPUT_PRICE = 0.6 / 1_000_000; // $0.60 per 1M tokens
const GPT4O_INPUT_PRICE = 2.5 / 1_000_000; // $2.50 per 1M tokens
const GPT4O_OUTPUT_PRICE = 10.0 / 1_000_000; // $10.00 per 1M tokens

// Safety kill-switch: $5.00 per session
const MAX_SESSION_COST = 5.0;

/**
 * Calculate cost from token usage
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gpt-4o-mini' | 'gpt-4o'
): number {
  const inputPrice = model === 'gpt-4o-mini' ? GPT4O_MINI_INPUT_PRICE : GPT4O_INPUT_PRICE;
  const outputPrice = model === 'gpt-4o-mini' ? GPT4O_MINI_OUTPUT_PRICE : GPT4O_OUTPUT_PRICE;
  return inputTokens * inputPrice + outputTokens * outputPrice;
}

/**
 * Check if session cost exceeds kill-switch threshold
 */
function checkKillSwitch(cost: number): void {
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
 * Check if kill-switch is active via API
 * Note: This requires the API server to be running
 * For standalone scripts, this will fall back to cost-based kill-switch
 */
async function checkKillSwitchAPI(): Promise<boolean> {
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
    // If API is not available, fall back to cost-based kill-switch
    logger.warn('Kill-switch API not available, using cost-based check only', { error });
  }

  return false;
}

/**
 * Initialize battle - we'll use simple conversation simulation
 * Note: For a full implementation, you'd want to use OpenAI Assistants API
 * For now, we'll simulate the conversation using chat completions
 */
async function initializeBattle(): Promise<{ closerThreadId: string; personaThreadId: string }> {
  // Generate unique thread IDs for tracking
  const closerThreadId = `closer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const personaThreadId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return { closerThreadId, personaThreadId };
}

/**
 * Get base prompt for Apex Closer
 */
async function getApexCloserPrompt(): Promise<string> {
  const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
  if (await fs.pathExists(basePromptPath)) {
    return await fs.readFile(basePromptPath, 'utf-8');
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
  const systemPrompt = isCloserTurn
    ? await getApexCloserPrompt()
    : personaPrompt;

  // Build conversation history from both sides
  const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Interleave messages from both sides to create a natural conversation
  const allMessages: Array<{ role: 'user' | 'assistant'; content: string; isCloser: boolean }> = [];
  
  // Add closer messages
  battleState.closerMessages.forEach((msg) => {
    allMessages.push({ ...msg, isCloser: true });
  });
  
  // Add persona messages
  battleState.personaMessages.forEach((msg) => {
    allMessages.push({ ...msg, isCloser: false });
  });

  // Sort by order (we'll use transcript order)
  // For simplicity, alternate between closer and persona based on turn
  const lastMessages = battleState.transcript.slice(-6); // Last 6 exchanges for context

  // Build API messages
  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation context
  if (isCloserTurn) {
    // Closer is responding - last message should be from persona
    if (battleState.personaMessages.length > 0) {
      const lastPersonaMsg = battleState.personaMessages[battleState.personaMessages.length - 1];
      apiMessages.push({ role: 'user', content: lastPersonaMsg.content });
    } else {
      // First turn - closer starts
      apiMessages.push({
        role: 'user',
        content: 'Start the conversation. Introduce yourself and begin the 5-step process.',
      });
    }
  } else {
    // Persona is responding - last message should be from closer
    if (battleState.closerMessages.length > 0) {
      const lastCloserMsg = battleState.closerMessages[battleState.closerMessages.length - 1];
      apiMessages.push({ role: 'user', content: lastCloserMsg.content });
    }
  }

  // Use env-manager for model selection: Closer = GPT-4o, Seller/Referee = GPT-4o-mini
  const modelToUse = isCloserTurn 
    ? getOpenAIModel('closer')  // GPT-4o for Closer
    : getOpenAIModel('seller'); // GPT-4o-mini for Sellers/Referees

  // Call OpenAI for the battle
  const completion = await openai.chat.completions.create({
    model: modelToUse,
    messages: apiMessages,
    temperature: temperature,
  });

  let response = completion.choices[0]?.message?.content || '';
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;

  // Calculate and log cost for this turn (use actual model used)
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
    // Generate CoT reasoning
    const transcript = battleState.transcript.join('\n\n');
    const cot = generateCoTReasoning(transcript, {
      hasObjection: transcript.toLowerCase().includes('but') || transcript.toLowerCase().includes('however'),
      priceMentioned: transcript.includes('$82,700') || transcript.includes('82700'),
      clause17Mentioned: transcript.toLowerCase().includes('clause 17') || transcript.toLowerCase().includes('memorandum'),
      discoveryComplete: battleState.turn >= 5, // Assume discovery complete after turn 5
    });

    // Add thinking tags to response (will be stripped before final output)
    const thinkingXML = formatCoTAsThinking(cot);
    response = `${thinkingXML}\n\n${response}`;

    // Strip thinking tags for final output
    response = stripThinkingTags(response);

    // Inject acoustic textures based on dynamic probability
    const textureProbability = await getTextureInjectionProbability();
    
    // Determine context for texture injection
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

Return a JSON object with:
{
  "mathDefense": <0-10>,
  "humanity": <0-10>,
  "success": <0-10>,
  "totalScore": <0-100>,
  "feedback": "<detailed feedback>",
  "verbalYesToMemorandum": <true/false>,
  "verbalYesToPrice": <true/false>,
  "documentStatus": <"completed" | "delivered" | null>,
  "technicalAssistance": <0-10>,
  "winningRebuttal": "<the specific rebuttal that won the battle, if any>"
}`;

  // Use GPT-4o-Mini if throttled (within 20% of budget)
  const refereeModel = isThrottled ? 'gpt-4o-mini' : 'gpt-4o';

  const completion = await openai.chat.completions.create({
    model: refereeModel,
    messages: [
      { role: 'system', content: 'You are an Elite Sales Referee. Return valid JSON only.' },
      { role: 'user', content: refereePrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  // Calculate and log referee cost
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
  // Note: This script doesn't include margin integrity, so we use 33.33% for each component
  score.totalScore = Math.round(
    score.mathDefense * 3.33 + 
    score.humanity * 3.33 + 
    score.success * 3.34
  );

  return score;
}

/**
 * Run a single autonomous battle
 */
async function runBattle(
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
  assertSandboxMode(config);

  // Check budget before starting battle
  await checkBudget();

  // Check if throttling is active (within 20% of limit)
  const isThrottled = await shouldThrottle();
  if (isThrottled) {
    logger.warn('Budget throttling active - using GPT-4o-Mini only and disabling Vocal Soul Auditor');
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Get persona from database
  const { data: persona, error: personaError } = await supabaseAdmin
    .from('sandbox_personas')
    .select('*')
    .eq('id', personaId)
    .single();

  if (personaError || !persona) {
    throw new Error(`Persona not found: ${personaId}`);
  }

  logger.info('Starting autonomous battle', { persona: persona.name });

  // Initialize battle
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
  let isCloserTurn = true; // Closer starts
  const battleTemperature = temperature ?? 0.7; // Use provided temperature or default to 0.7

  // Battle loop
  while (battleState.turn < MAX_TURNS) {
    battleState.turn++;

    try {
      // Execute turn
      const { message, tokens } = await executeTurn(
        battleState,
        persona.system_prompt,
        isCloserTurn,
        battleTemperature,
        undefined, // battleId not available yet
        personaId
      );

      // Update state
      battleState.transcript.push(`${isCloserTurn ? 'CLOSER' : 'PERSONA'}: ${message}`);
      battleState.tokenUsage.input += tokens.input;
      battleState.tokenUsage.output += tokens.output;
      battleState.tokenUsage.total += tokens.input + tokens.output;

      // Calculate cost for this turn
      const turnCost = calculateCost(tokens.input, tokens.output, 'gpt-4o-mini');
      battleState.costUsd += turnCost;

      // Check kill-switch
      checkKillSwitch(battleState.costUsd);

      logger.info(`Turn ${battleState.turn} complete`, {
        speaker: isCloserTurn ? 'CLOSER' : 'PERSONA',
        tokens: tokens.input + tokens.output,
        cost: turnCost,
        totalCost: battleState.costUsd,
      });

      // Switch turns
      isCloserTurn = !isCloserTurn;
    } catch (error) {
      logger.error('Error in battle turn', { turn: battleState.turn, error });
      throw error;
    }
  }

  // Get referee score
  const transcript = battleState.transcript.join('\n\n');
  logger.info('Battle complete, getting referee score...');
  
  // Check throttling status for referee
  const isThrottledForReferee = await shouldThrottle();
  const score = await refereeBattle(transcript, isThrottledForReferee);

  // Referee cost is now calculated and logged in refereeBattle function
  // Update battleState.costUsd with actual costs from turns (already logged)
  // Note: Referee cost is logged separately in refereeBattle function

  // Save battle to database
  const { data: battle, error: battleError } = await supabaseAdmin
    .from('sandbox_battles')
    .insert({
      persona_id: personaId,
      closer_thread_id: closerThreadId,
      persona_thread_id: personaThreadId,
      transcript,
      referee_score: Math.round(score.totalScore),
      referee_feedback: score.feedback,
      math_defense_score: score.mathDefense,
      humanity_score: score.humanity,
      success_score: score.success,
      verbal_yes_to_memorandum: score.verbalYesToMemorandum,
      winning_rebuttal: score.winningRebuttal,
      turns: battleState.turn,
      token_usage: battleState.tokenUsage.total,
      cost_usd: battleState.costUsd,
      ended_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (battleError) {
    logger.error('Error saving battle', { error: battleError });
    throw battleError;
  }

  logger.info('Battle saved', {
    battleId: battle.id,
    score: score.totalScore,
    cost: battleState.costUsd,
  });

  // Auto-audit vocal soul if audio file is available
  // Note: Disabled if throttling is active (within 20% of budget)
  // Note: In production, you'd pass the audio file path
  // For now, we'll audit based on transcript
  const isThrottledForAudit = await shouldThrottle();
  if (score.totalScore > 70 && !isThrottledForAudit) {
    // Only audit high-scoring battles to save costs, and skip if throttled
    try {
      // Import vocal soul auditor
      const { auditVocalSoul, checkAndInjectFeedback } = await import('./vocalSoulAuditor');
      
      // Audit based on transcript (would use audio file in production)
      const auditResult = await auditVocalSoul('', transcript, battle.id);
      
      // Check if feedback injection is needed
      if (auditResult.humanityGrade < 85) {
        await checkAndInjectFeedback(auditResult.humanityGrade);
        logger.info('Feedback injected due to low humanity grade', {
          battleId: battle.id,
          humanityGrade: auditResult.humanityGrade,
        });
      }
    } catch (error) {
      logger.warn('Error in vocal soul audit', { battleId: battle.id, error });
      // Don't fail the battle if audit fails
    }
  } else if (isThrottledForAudit) {
    logger.info('Vocal Soul Auditor disabled due to budget throttling', {
      battleId: battle.id,
      score: score.totalScore,
    });
  }

  // Calculate total cost from battleState (sum of all turn costs)
  // Referee cost is logged separately in refereeBattle function
  const totalCost = battleState.costUsd;

  // Log final battle cost summary
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
async function runBattleLoop(
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
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Concurrency control
  const batchSize = options?.batchSize || maxBattles || 10;
  const maxConcurrent = options?.maxConcurrent || 3; // Run max 3 battles concurrently
  const delayBetweenBattles = options?.delayBetweenBattles || 1000; // 1 second delay

  // Get active personas
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
  }

  if (!personas || personas.length === 0) {
    throw new Error('No active personas found');
  }

  logger.info('Starting battle loop', {
    personaCount: personas.length,
    batchSize,
    maxConcurrent,
    maxCost: MAX_SESSION_COST,
  });

  const results = [];
  let totalCost = 0;
  let killSwitchTriggered = false;

  // Process personas sequentially with optional concurrency (simplified approach)
  // For true concurrency, battles would need to be processed in parallel batches
  for (const persona of personas) {
    // Check budget before starting battle (throws error if exceeded)
    try {
      await checkBudget();
    } catch (error: any) {
      if (error?.message?.includes('Budget Limit Reached')) {
        logger.error('Budget limit reached, stopping battle loop', { error: error.message });
        killSwitchTriggered = true;
        break;
      }
      // Re-throw if it's a different error
      throw error;
    }

    // Check kill-switch before starting battle
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
      const result = await runBattle(persona.id);
      results.push(result);
      totalCost += result.cost;

      logger.info('Battle completed', {
        persona: persona.name,
        score: result.score.totalScore,
        cost: result.cost,
        totalCost,
        remaining: MAX_SESSION_COST - totalCost,
      });

      // Check kill-switch after battle
      if (totalCost >= MAX_SESSION_COST) {
        logger.warn('Kill-switch threshold reached after battle', { totalCost });
        killSwitchTriggered = true;
        break;
      }

      // Small delay between battles (rate limiting)
      if (delayBetweenBattles > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBattles));
      }
    } catch (error: any) {
      // Check if error is kill-switch related
      if (error?.message?.includes('Kill-switch')) {
        logger.error('Kill-switch activated during battle', { persona: persona.name, totalCost });
        killSwitchTriggered = true;
        break;
      }
      logger.error('Error in battle', { persona: persona.name, error });
      // Continue with next battle unless kill-switch
    }
  }

  // Process all personas in batches
  const allPersonas = personas;
  for (let i = 0; i < allPersonas.length && !killSwitchTriggered; i += batchSize) {
    const batch = allPersonas.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);

    if (killSwitchTriggered) {
      break;
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const personaIds = args.length > 0 ? args : undefined;

  runBattleLoop(personaIds)
    .then((results) => {
      console.log(`\n✅ Completed ${results.length} battles`);
      console.log(`Total cost: $${results.reduce((sum, r) => sum + r.cost, 0).toFixed(2)}`);
      console.log(`Average score: ${(results.reduce((sum, r) => sum + r.score.totalScore, 0) / results.length).toFixed(1)}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error running battle loop:', error);
      process.exit(1);
    });
}

export { runBattle, runBattleLoop, checkKillSwitch, MAX_SESSION_COST };
