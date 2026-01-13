/**
 * Cron Job: Autonomous Training
 * Triggers autonomous battle loop with concurrency control
 * Can be triggered by Heroku Scheduler or manual API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getEnvironmentConfig } from '@/lib/env-manager';
import { getAppConfig } from '@/lib/config';
import { checkBudget } from '@/lib/budgetMonitor';
import { isKillSwitchActive } from '@/lib/killSwitchUtils';

// assertSandboxMode will be imported dynamically or we'll use env-manager's assertEnvironment

// Configuration
const DEFAULT_BATCH_SIZE = 5; // Number of battles per cron execution
const MAX_BATCH_SIZE = 10; // Maximum allowed batch size
// Heroku has a 30-second timeout for web requests, but we can use longer for background tasks
// For GET endpoint, we'll use 2.5 minutes to allow battles to complete
// Note: This may still timeout on Heroku, but will work better than 25 seconds
const MAX_EXECUTION_TIME_MS = 150_000; // 2.5 minutes (150 seconds)

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

  // Log immediately - even before any async operations
  console.log(`[TRAINING] Starting training batch ${batchId} with batchSize ${batchSize}`);
  logger.info('Starting training batch', { batchId, batchSize });

  try {
    // Verify environment
    const config = getEnvironmentConfig();
    console.log(`[TRAINING] Environment config: ${config.environment}, isProduction: ${config.isProduction}`);
    
    // Ensure we're in sandbox mode
    if (config.environment !== 'sandbox') {
      const errorMsg = `Training can only run in sandbox environment, got: ${config.environment}`;
      console.error(`[TRAINING] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Get app config for concurrency settings
    const appConfig = getAppConfig();

    // Import runBattleLoop from src/lib/training (compiled by Next.js)
    const { runBattleLoop } = await import('@/lib/training');
    
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

    // Check kill-switch before starting training
    if (isKillSwitchActive()) {
      logger.warn('Training blocked: Kill-switch is active');
      return NextResponse.json(
        {
          error: 'Training paused',
          message: 'Kill-switch is active. Training has been automatically paused due to budget limit or manual activation.',
          killSwitchActive: true,
        },
        { status: 503 }
      );
    }

    // Check budget before starting training
    try {
      await checkBudget();
    } catch (error: any) {
      if (error?.message?.includes('Budget Limit Reached')) {
        logger.error('Training blocked: Budget limit reached', { error: error.message });
        return NextResponse.json(
          {
            error: 'Budget limit reached',
            message: error.message,
            killSwitchActive: true, // Kill-switch was automatically activated
          },
          { status: 503 }
        );
      }
      throw error;
    }

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

    // Check kill-switch before starting training
    if (isKillSwitchActive()) {
      logger.warn('Training blocked: Kill-switch is active');
      return NextResponse.json(
        {
          error: 'Training paused',
          message: 'Kill-switch is active. Training has been automatically paused due to budget limit or manual activation.',
          killSwitchActive: true,
        },
        { status: 503 }
      );
    }

    // Check budget before starting training
    try {
      await checkBudget();
    } catch (error: any) {
      if (error?.message?.includes('Budget Limit Reached')) {
        logger.error('Training blocked: Budget limit reached', { error: error.message });
        return NextResponse.json(
          {
            error: 'Budget limit reached',
            message: error.message,
            killSwitchActive: true, // Kill-switch was automatically activated
          },
          { status: 503 }
        );
      }
      throw error;
    }

    // Run training in background to avoid timeout
    // Return immediately with "started" status
    console.log(`[TRAINING] POST endpoint reached, batchSize: ${batchSize}`);
    logger.info('POST training endpoint called', { batchSize });
    
    // Use Next.js waitUntil to keep background task alive
    const trainingPromise = runTrainingBatch(batchSize)
      .then((result) => {
        console.log(`[TRAINING] Background batch completed: ${result.battlesCompleted} battles, $${result.totalCost.toFixed(4)} cost`);
        logger.info('Background training batch completed', {
          batchId: result.batchId,
          battlesCompleted: result.battlesCompleted,
          totalCost: result.totalCost,
          errors: result.errors,
        });
        return result;
      })
      .catch((error) => {
        console.error(`[TRAINING] Background batch error:`, error);
        console.error(`[TRAINING] Error stack:`, error.stack);
        logger.error('Error in background training batch', {
          error: error.message || String(error),
          stack: error.stack,
          batchSize,
        });
        throw error;
      });

    // Try to use waitUntil if available (Next.js 13+)
    if (typeof (request as any).waitUntil === 'function') {
      (request as any).waitUntil(trainingPromise);
    } else {
      // Fallback: just start the promise (may be terminated when response is sent)
      trainingPromise.catch(() => {
        // Silently handle - already logged
      });
    }

    return NextResponse.json({
      success: true,
      batch: {
        battlesCompleted: 0,
        totalCost: 0,
        averageScore: 0,
        batchId: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        completedAt: new Date().toISOString(),
        errors: [],
      },
      message: `Training batch started (running in background). Check sandbox_battles table for results.`,
      status: 'started',
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
