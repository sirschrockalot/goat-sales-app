/**
 * Nightly Autonomous Evolution Cron Job
 * Analyzes breakthroughs from the day and evolves prompts for next training cycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClientForEnv } from '@/lib/env-manager';
import logger from '@/lib/logger';
import { getGoldenSamples } from '@/lib/promotionService';

export const maxDuration = 60;

/**
 * Nightly evolution process
 * 1. Analyze today's breakthroughs (score >= 95)
 * 2. Extract winning patterns
 * 3. Update training configs for next cycle
 */
async function runNightlyEvolution(): Promise<{
  breakthroughsAnalyzed: number;
  configsUpdated: number;
  evolutionComplete: boolean;
}> {
  logger.info('🌙 Starting nightly autonomous evolution...');

  // Ensure we're in SANDBOX mode for training
  const sandboxSupabase = getSupabaseClientForEnv('sandbox');

  // Get today's breakthroughs
  const goldenSamples = await getGoldenSamples();
  logger.info('Found golden samples for evolution', { count: goldenSamples.length });

  // Analyze patterns (simplified - in production would use GPT-4o for analysis)
  let configsUpdated = 0;

  if (goldenSamples.length > 0) {
    // Update acoustic texture frequency based on humanity scores
    const avgHumanityScore = goldenSamples.reduce((sum, g) => sum + (g.humanity_score || 0), 0) / goldenSamples.length;
    
    if (avgHumanityScore < 85) {
      // Increase texture frequency if humanity is low
      const { error } = await sandboxSupabase
        .from('sandbox_config')
        .upsert({
          key: 'acoustic_texture_frequency',
          value: '0.4', // Increase from default 0.3
          description: 'Increased texture frequency due to low humanity scores',
        }, {
          onConflict: 'key',
        });

      if (!error) {
        configsUpdated++;
        logger.info('Updated acoustic texture frequency', { newValue: '0.4' });
      }
    }
  }

  logger.info('Nightly evolution complete', {
    breakthroughsAnalyzed: goldenSamples.length,
    configsUpdated,
  });

  return {
    breakthroughsAnalyzed: goldenSamples.length,
    configsUpdated,
    evolutionComplete: true,
  };
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runNightlyEvolution();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Nightly evolution error', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Same as GET for manual triggers
  return GET(request);
}
