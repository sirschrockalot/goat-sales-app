/**
 * Model Switcher - Cost Optimization Engine
 * 
 * Selects between GPT-4o (Premium) and GPT-4o-Mini (Budget) based on:
 * - Current daily spend
 * - Session type (Routine Training vs Apex Battle-Test)
 * 
 * Features:
 * - Budget guardrails (force Mini at 80% of daily cap)
 * - Session-based optimization (Routine Training always uses Mini)
 * - Apex Battle-Test uses Premium when under budget
 */

import { getDailySpend } from './billingService';

export type SessionType = 'Routine Training' | 'Apex Battle-Test' | 'Live Deal' | 'Roleplay' | 'Unknown';
export type ModelChoice = 'gpt-4o' | 'gpt-4o-mini';

export interface ModelSelection {
  model: ModelChoice;
  reason: string;
  dailySpend: number;
  threshold: number;
  sessionType: SessionType;
}

// Budget thresholds
const DAILY_BUDGET_CAP = 150; // $150/day kill switch
const BUDGET_GUARDRAIL_THRESHOLD = 120; // $120/day (80% of cap) - force Mini

/**
 * Get optimal model based on daily spend and session type
 */
export async function getOptimalModel(
  sessionType: SessionType = 'Unknown',
  battleTestMode?: boolean
): Promise<ModelSelection> {
  // Determine actual session type
  let actualSessionType: SessionType = sessionType;
  
  if (battleTestMode) {
    actualSessionType = 'Apex Battle-Test';
  } else if (sessionType === 'Unknown') {
    // Default to Routine Training if not specified
    actualSessionType = 'Routine Training';
  }

  // Get current daily spend
  const dailySpend = await getDailySpend();
  const currentSpend = dailySpend.total;

  // Threshold Logic 1: Budget Guardrail (80% of daily cap)
  // If daily spend > $120, force GPT-4o-Mini regardless of session type
  if (currentSpend >= BUDGET_GUARDRAIL_THRESHOLD) {
    return {
      model: 'gpt-4o-mini',
      reason: `Budget Guardrail Active: Daily spend ($${currentSpend.toFixed(2)}) exceeds 80% threshold ($${BUDGET_GUARDRAIL_THRESHOLD})`,
      dailySpend: currentSpend,
      threshold: BUDGET_GUARDRAIL_THRESHOLD,
      sessionType: actualSessionType,
    };
  }

  // Threshold Logic 2: Routine Training always uses Mini
  // Saves 94% on token costs for routine practice sessions
  if (actualSessionType === 'Routine Training') {
    return {
      model: 'gpt-4o-mini',
      reason: `Routine Training Session: Using Mini to save 94% on token costs`,
      dailySpend: currentSpend,
      threshold: BUDGET_GUARDRAIL_THRESHOLD,
      sessionType: actualSessionType,
    };
  }

  // Threshold Logic 3: Apex Battle-Test uses Premium when under budget
  // Maximum IQ for high-stakes training scenarios
  if (actualSessionType === 'Apex Battle-Test') {
    return {
      model: 'gpt-4o',
      reason: `Apex Battle-Test: Using Premium GPT-4o for maximum IQ (under budget: $${currentSpend.toFixed(2)} < $${BUDGET_GUARDRAIL_THRESHOLD})`,
      dailySpend: currentSpend,
      threshold: BUDGET_GUARDRAIL_THRESHOLD,
      sessionType: actualSessionType,
    };
  }

  // Threshold Logic 4: Live Deal uses Premium (critical sessions)
  if (actualSessionType === 'Live Deal') {
    return {
      model: 'gpt-4o',
      reason: `Live Deal: Using Premium GPT-4o for critical real-world scenarios`,
      dailySpend: currentSpend,
      threshold: BUDGET_GUARDRAIL_THRESHOLD,
      sessionType: actualSessionType,
    };
  }

  // Default: Roleplay and Unknown sessions use Mini (cost optimization)
  return {
    model: 'gpt-4o-mini',
    reason: `Default Cost Optimization: Using Mini for ${actualSessionType} session (spend: $${currentSpend.toFixed(2)})`,
    dailySpend: currentSpend,
    threshold: BUDGET_GUARDRAIL_THRESHOLD,
    sessionType: actualSessionType,
  };
}

/**
 * Determine session type from call parameters
 */
export function determineSessionType(
  battleTestMode?: boolean,
  apexLevel?: number,
  gauntletLevel?: number,
  roleReversal?: boolean
): SessionType {
  // Apex Battle-Test: High-stakes training with Elliott/Cline pressure
  if (battleTestMode || apexLevel) {
    return 'Apex Battle-Test';
  }

  // Routine Training: Standard gauntlet or roleplay sessions
  if (gauntletLevel || roleReversal) {
    return 'Routine Training';
  }

  // Default: Unknown (will default to Routine Training in getOptimalModel)
  return 'Unknown';
}

/**
 * Get cost savings percentage when using Mini vs Premium
 */
export function getCostSavings(model: ModelChoice): number {
  // GPT-4o-Mini is approximately 94% cheaper than GPT-4o
  // Based on OpenAI pricing: Mini ~$0.15/1M input tokens, GPT-4o ~$2.50/1M input tokens
  return model === 'gpt-4o-mini' ? 94 : 0;
}

/**
 * Format model selection for logging
 */
export function formatModelSelectionForLogging(selection: ModelSelection): {
  model_used: string;
  reason_for_selection: string;
  daily_spend: number;
  session_type: string;
} {
  return {
    model_used: selection.model,
    reason_for_selection: selection.reason,
    daily_spend: selection.dailySpend,
    session_type: selection.sessionType,
  };
}
