/**
 * Daily Audit Cron Job
 * Runs daily audit and sends summary to Slack
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Cron jobs require Authorization header with Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Daily audit cron job triggered');

    // Dynamically import dailyAuditor from root scripts (server-side only)
    const dailyAuditorModule = await (Function('return import("../../../scripts/dailyAuditor.js")')()) as any;
    const { generateDailyAudit, sendSlackSummary } = dailyAuditorModule;

    // Generate audit summary
    const summary = await generateDailyAudit();

    // Send to Slack
    await sendSlackSummary(summary);

    return NextResponse.json({
      success: true,
      summary: {
        date: summary.date,
        billing: summary.billing,
        performance: summary.performance,
        coachNote: summary.coachNote,
      },
      message: 'Daily audit completed and sent to Slack',
    });
  } catch (error: any) {
    logger.error('Error in daily audit cron job', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
