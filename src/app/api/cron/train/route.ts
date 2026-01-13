/**
 * Vercel Cron Job: Autonomous Training
 * Triggers autonomous battle loop with concurrency control
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getEnvironmentConfig } from '@/lib/env-manager';
import { getAppConfig } from '@/lib/config';

// assertSandboxMode will be imported dynamically or we'll use env-manager's assertEnvironment

// Configuration
const DEFAULT_BATCH_SIZE = 5; // Number of battles per cron execution
const MAX_BATCH_SIZE = 10; // Maximum allowed batch size
const MAX_EXECUTION_TIME_MS = 50_000; // 50 seconds (Vercel free tier limit is 10s, pro is 60s)

interface TrainingBatchResult {
  battlesCompleted: number;
  totalCost: number;
  averageScore: number;
  batchId: string;
  completedAt: string;
  errors: string[];
}

/**
 * Notify Tactical Scout that a batch has completed
 * Triggers a scan for new breakthroughs
 */
async function notifyTacticalScout(batchResult: TrainingBatchResult): Promise<void> {
  try {
    const scoutUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Option 1: Trigger breakthrough scan via API
    const scanResponse = await fetch(`${scoutUrl}/api/cron/scout-scan`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    });

    if (scanResponse.ok) {
      const scanData = await scanResponse.json();
      logger.info('Tactical Scout scan triggered', {
        batchId: batchResult.batchId,
        processed: scanData.processed || 0,
      });
    }

    // Option 2: Check for new breakthroughs
    const breakthroughsResponse = await fetch(`${scoutUrl}/api/sandbox/breakthroughs?status=pending_review`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (breakthroughsResponse.ok) {
      const data = await breakthroughsResponse.json();
      logger.info('Tactical Scout notified of batch completion', {
        batchId: batchResult.batchId,
        battlesCompleted: batchResult.battlesCompleted,
        newBreakthroughs: data.unreadCount || 0,
        totalBreakthroughs: data.total || 0,
      });

      // Send Slack notification if there are new breakthroughs
      if (data.unreadCount > 0 && process.env.SLACK_WEBHOOK_URL) {
        const slackMessage = {
          text: `🎯 Training Batch Complete - ${data.unreadCount} New Breakthrough${data.unreadCount > 1 ? 's' : ''} Detected`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Training Batch Complete*\n\n*Batch ID:* ${batchResult.batchId}\n*Battles Completed:* ${batchResult.battlesCompleted}\n*Average Score:* ${batchResult.averageScore.toFixed(1)}/100\n*New Breakthroughs:* ${data.unreadCount}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Review Breakthroughs',
                  },
                  url: `${scoutUrl}/admin/training-monitor`,
                  style: 'primary',
                },
              ],
            },
          ],
        };

        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage),
        }).catch((error) => {
          logger.warn('Failed to send Slack notification', { error });
        });
      }
    }
  } catch (error) {
    logger.warn('Failed to notify Tactical Scout', { error, batchId: batchResult.batchId });
    // Don't fail the cron job if notification fails
  }
}

/**
 * Run training batch with concurrency control
 */
async function runTrainingBatch(batchSize: number): Promise<TrainingBatchResult> {
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const errors: string[] = [];

  logger.info('Starting training batch', { batchId, batchSize });

  try {
    // Verify environment
    const config = getEnvironmentConfig();
    // Ensure we're in sandbox mode
    if (config.environment !== 'sandbox') {
      throw new Error('Training can only run in sandbox environment');
    }

    // Get app config for concurrency settings
    const appConfig = getAppConfig();

    // Dynamically import runBattleLoop from root scripts (server-side only)
    // Use path resolution that works in both dev and production
    const path = await import('path');
    const projectRoot = process.cwd();
    // Try .js first (compiled), then .ts (if tsx/ts-node available)
    const autonomousBattlePath = path.join(projectRoot, 'scripts', 'autonomousBattle.js');
    let autonomousBattleModule: any;
    try {
      autonomousBattleModule = await import(autonomousBattlePath);
    } catch (error) {
      // Fallback to .ts if .js not found (development)
      const tsPath = path.join(projectRoot, 'scripts', 'autonomousBattle.ts');
      autonomousBattleModule = await import(tsPath);
    }
    const { runBattleLoop } = autonomousBattleModule;
    
    // Run battle loop with batch size limit and concurrency control
    const results = await runBattleLoop(undefined, batchSize, {
      batchSize,
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_BATTLES || '3', 10),
      delayBetweenBattles: parseInt(process.env.DELAY_BETWEEN_BATTLES_MS || '1000', 10),
    });

    const totalCost = results.reduce((sum: number, r: any) => sum + r.cost, 0);
    const averageScore =
      results.length > 0
        ? results.reduce((sum: number, r: any) => sum + r.score.totalScore, 0) / results.length
        : 0;

    const batchResult: TrainingBatchResult = {
      battlesCompleted: results.length,
      totalCost,
      averageScore,
      batchId,
      completedAt: new Date().toISOString(),
      errors,
    };

    const executionTime = Date.now() - startTime;
    logger.info('Training batch complete', {
      batchId,
      battlesCompleted: results.length,
      totalCost,
      averageScore,
      executionTimeMs: executionTime,
    });

    // Notify Tactical Scout
    await notifyTacticalScout(batchResult);

    return batchResult;
  } catch (error: any) {
    logger.error('Error in training batch', { batchId, error });
    errors.push(error.message || String(error));

    return {
      battlesCompleted: 0,
      totalCost: 0,
      averageScore: 0,
      batchId,
      completedAt: new Date().toISOString(),
      errors,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron sends Authorization header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Vercel Cron sends Authorization header with Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', { authHeader: authHeader ? 'present' : 'missing' });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get batch size from query params, config, or use default
    const { searchParams } = new URL(request.url);
    const appConfig = getAppConfig();
    const requestedBatchSize = parseInt(
      searchParams.get('batchSize') || String(appConfig.training.batchSize || DEFAULT_BATCH_SIZE),
      10
    );
    const batchSize = Math.min(Math.max(1, requestedBatchSize), appConfig.training.maxBatchSize || MAX_BATCH_SIZE);

    const maxExecutionTime = appConfig.training.maxExecutionTimeMs || MAX_EXECUTION_TIME_MS;

    logger.info('Training cron job triggered', { batchSize, maxExecutionTime });

    // Run training batch with timeout protection
    const batchPromise = runTrainingBatch(batchSize);
    const timeoutPromise = new Promise<TrainingBatchResult>((resolve) => {
      setTimeout(() => {
        logger.warn('Training batch timeout - returning partial results');
        resolve({
          battlesCompleted: 0,
          totalCost: 0,
          averageScore: 0,
          batchId: `timeout-${Date.now()}`,
          completedAt: new Date().toISOString(),
          errors: ['Execution timeout - batch may still be running'],
        });
      }, maxExecutionTime);
    });

    const batchResult = await Promise.race([batchPromise, timeoutPromise]);

    return NextResponse.json({
      success: true,
      batch: batchResult,
      message: `Training batch completed: ${batchResult.battlesCompleted} battles`,
    });
  } catch (error: any) {
    logger.error('Error in training cron job', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual triggering (with auth)
export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Verify authorization
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const appConfig = getAppConfig();
    const requestedBatchSize = body.batchSize || appConfig.training.batchSize || DEFAULT_BATCH_SIZE;
    const batchSize = Math.min(Math.max(1, requestedBatchSize), appConfig.training.maxBatchSize || MAX_BATCH_SIZE);

    logger.info('Training batch manually triggered', { batchSize });

    const batchResult = await runTrainingBatch(batchSize);

    return NextResponse.json({
      success: true,
      batch: batchResult,
      message: `Training batch completed: ${batchResult.battlesCompleted} battles`,
    });
  } catch (error: any) {
    logger.error('Error in manual training trigger', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
