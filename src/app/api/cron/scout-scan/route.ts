/**
 * Tactical Scout Cron Job
 * Scans for breakthroughs every 5 minutes (fallback if Realtime unavailable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanExistingBreakthroughs } from '@/lib/tacticalScout';
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

    // Vercel Cron sends Authorization header with Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Tactical Scout cron job triggered');

    // Scan for breakthroughs
    const processed = await scanExistingBreakthroughs();

    return NextResponse.json({
      success: true,
      processed,
      message: `Processed ${processed} breakthroughs`,
    });
  } catch (error) {
    logger.error('Error in Tactical Scout cron job', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
