/**
 * Budget Monitor Service
 * Tracks real-time costs for OpenAI, Vapi, and ElevenLabs during autonomous training
 * Implements daily hard cap and kill switch functionality
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';

// Daily hard cap for training (USD)
export const DAILY_TRAINING_CAP = 15.0;

// Cost rates (2026 pricing)
export const COST_RATES = {
  // OpenAI
  openai: {
    'gpt-4o-mini': {
      input: 0.15 / 1_000_000, // $0.15 per 1M input tokens
      output: 0.6 / 1_000_000, // $0.60 per 1M output tokens
    },
    'gpt-4o': {
      input: 2.5 / 1_000_000, // $2.50 per 1M input tokens
      output: 10.0 / 1_000_000, // $10.00 per 1M output tokens
    },
  },
  // Vapi (including telephony and TTS)
  vapi: {
    perMinute: 0.18, // $0.18 per minute
  },
  // ElevenLabs Turbo v2.5
  elevenlabs: {
    perMinute: 0.07, // $0.07 per minute
  },
} as const;

// Throttling threshold (20% of daily cap)
const THROTTLING_THRESHOLD = DAILY_TRAINING_CAP * 0.2; // $3.00

export interface CostBreakdown {
  provider: 'openai' | 'vapi' | 'elevenlabs';
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMinutes?: number;
  cost: number;
}

export interface BudgetStatus {
  dailySpend: number;
  remaining: number;
  percentageUsed: number;
  isThrottled: boolean;
  isExceeded: boolean;
}

/**
 * Calculate OpenAI cost from token usage
 */
export function calculateOpenAICost(
  model: 'gpt-4o-mini' | 'gpt-4o',
  inputTokens: number,
  outputTokens: number
): number {
  const rates = COST_RATES.openai[model];
  return inputTokens * rates.input + outputTokens * rates.output;
}

/**
 * Calculate Vapi cost from duration
 */
export function calculateVapiCost(durationMinutes: number): number {
  return durationMinutes * COST_RATES.vapi.perMinute;
}

/**
 * Calculate ElevenLabs cost from duration
 */
export function calculateElevenLabsCost(durationMinutes: number): number {
  return durationMinutes * COST_RATES.elevenlabs.perMinute;
}

/**
 * Get today's total spend from billing_logs
 */
export async function getTodaySpend(): Promise<number> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for budget check');
    return 0;
  }

  try {
    // Get start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Sum all costs from today with env='sandbox'
    const { data, error } = await supabaseAdmin
      .from('billing_logs')
      .select('cost')
      .eq('env', 'sandbox')
      .gte('created_at', todayStart);

    if (error) {
      logger.error('Error fetching today spend', { error });
      return 0;
    }

    const totalSpend = ((data as any[]) || []).reduce((sum: number, log: any) => sum + (log.cost || 0), 0);
    return totalSpend;
  } catch (error) {
    logger.error('Error calculating today spend', { error });
    return 0;
  }
}

/**
 * Check budget status
 */
export async function getBudgetStatus(): Promise<BudgetStatus> {
  const dailySpend = await getTodaySpend();
  const remaining = Math.max(0, DAILY_TRAINING_CAP - dailySpend);
  const percentageUsed = (dailySpend / DAILY_TRAINING_CAP) * 100;
  const isThrottled = dailySpend >= THROTTLING_THRESHOLD;
  const isExceeded = dailySpend >= DAILY_TRAINING_CAP;

  return {
    dailySpend,
    remaining,
    percentageUsed,
    isThrottled,
    isExceeded,
  };
}

/**
 * Kill Switch: Check if budget limit is reached
 * Throws error if limit exceeded
 */
export async function checkBudget(): Promise<void> {
  const status = await getBudgetStatus();

  if (status.isExceeded) {
    const message = `🚨 BUDGET LIMIT REACHED - TRAINING PAUSED\n\n` +
      `Daily Spend: $${status.dailySpend.toFixed(2)}\n` +
      `Daily Cap: $${DAILY_TRAINING_CAP.toFixed(2)}\n` +
      `Training has been paused to prevent overspending.`;

    logger.error('Budget limit reached', {
      dailySpend: status.dailySpend,
      dailyCap: DAILY_TRAINING_CAP,
    });

    // Send urgent Slack alert
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚨 BUDGET LIMIT REACHED',
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Daily Spend:*\n$${status.dailySpend.toFixed(2)}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Daily Cap:*\n$${DAILY_TRAINING_CAP.toFixed(2)}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Percentage Used:*\n${status.percentageUsed.toFixed(1)}%`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Status:*\nTraining Paused`,
                  },
                ],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Training has been automatically paused to prevent overspending. Review budget and adjust daily cap if needed.',
                },
              },
            ],
          }),
        });
      } catch (error) {
        logger.error('Error sending Slack alert', { error });
      }
    }

    throw new Error(`Budget Limit Reached. Training Paused. Daily spend: $${status.dailySpend.toFixed(2)} / $${DAILY_TRAINING_CAP.toFixed(2)}`);
  }

  // Log warning if approaching limit
  if (status.isThrottled) {
    logger.warn('Budget throttling active', {
      dailySpend: status.dailySpend,
      threshold: THROTTLING_THRESHOLD,
      remaining: status.remaining,
    });
  }
}

/**
 * Check if throttling should be enabled (within 20% of limit)
 */
export async function shouldThrottle(): Promise<boolean> {
  const status = await getBudgetStatus();
  return status.isThrottled;
}

/**
 * Log cost to billing_logs table
 */
export async function logCost(
  costBreakdown: CostBreakdown,
  metadata?: {
    battleId?: string;
    personaId?: string;
    sessionId?: string;
    [key: string]: any;
  }
): Promise<void> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for cost logging');
    return;
  }

  try {
    const { error } = await (supabaseAdmin as any)
      .from('billing_logs')
      .insert({
        provider: costBreakdown.provider,
        model: costBreakdown.model || null,
        input_tokens: costBreakdown.inputTokens || null,
        output_tokens: costBreakdown.outputTokens || null,
        duration_minutes: costBreakdown.durationMinutes || null,
        cost: costBreakdown.cost,
        env: 'sandbox',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      } as any);

    if (error) {
      logger.error('Error logging cost', { error, costBreakdown });
    } else {
      logger.info('Cost logged', {
        provider: costBreakdown.provider,
        cost: costBreakdown.cost,
        metadata,
      });
    }
  } catch (error) {
    logger.error('Error logging cost', { error, costBreakdown });
  }
}

/**
 * Get budget summary for dashboard
 */
export async function getBudgetSummary(): Promise<{
  todaySpend: number;
  dailyCap: number;
  remaining: number;
  percentageUsed: number;
  isThrottled: boolean;
  isExceeded: boolean;
  breakdown: {
    openai: number;
    vapi: number;
    elevenlabs: number;
  };
}> {
  const status = await getBudgetStatus();

  if (!supabaseAdmin) {
    return {
      todaySpend: status.dailySpend,
      dailyCap: DAILY_TRAINING_CAP,
      remaining: status.remaining,
      percentageUsed: status.percentageUsed,
      isThrottled: status.isThrottled,
      isExceeded: status.isExceeded,
      breakdown: {
        openai: 0,
        vapi: 0,
        elevenlabs: 0,
      },
    };
  }

  try {
    // Get start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Get breakdown by provider
    const { data, error } = await supabaseAdmin
      .from('billing_logs')
      .select('provider, cost')
      .eq('env', 'sandbox')
      .gte('created_at', todayStart);

    if (error) {
      logger.error('Error fetching budget breakdown', { error });
      return {
        todaySpend: status.dailySpend,
        dailyCap: DAILY_TRAINING_CAP,
        remaining: status.remaining,
        percentageUsed: status.percentageUsed,
        isThrottled: status.isThrottled,
        isExceeded: status.isExceeded,
        breakdown: {
          openai: 0,
          vapi: 0,
          elevenlabs: 0,
        },
      };
    }

    const breakdown = {
      openai: 0,
      vapi: 0,
      elevenlabs: 0,
    };

    ((data as any[]) || []).forEach((log: any) => {
      if (log.provider === 'openai') {
        breakdown.openai += log.cost || 0;
      } else if (log.provider === 'vapi') {
        breakdown.vapi += log.cost || 0;
      } else if (log.provider === 'elevenlabs') {
        breakdown.elevenlabs += log.cost || 0;
      }
    });

    return {
      todaySpend: status.dailySpend,
      dailyCap: DAILY_TRAINING_CAP,
      remaining: status.remaining,
      percentageUsed: status.percentageUsed,
      isThrottled: status.isThrottled,
      isExceeded: status.isExceeded,
      breakdown,
    };
  } catch (error) {
    logger.error('Error getting budget summary', { error });
    return {
      todaySpend: status.dailySpend,
      dailyCap: DAILY_TRAINING_CAP,
      remaining: status.remaining,
      percentageUsed: status.percentageUsed,
      isThrottled: status.isThrottled,
      isExceeded: status.isExceeded,
      breakdown: {
        openai: 0,
        vapi: 0,
        elevenlabs: 0,
      },
    };
  }
}
