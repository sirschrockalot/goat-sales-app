/**
 * Kill Switch API
 * Stops all active autonomous battle loops in the sandbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

// In-memory flag to track kill-switch state
// In production, you might want to use Redis or a database
let killSwitchActive = false;
let killSwitchActivatedAt: Date | null = null;

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    return NextResponse.json({
      active: killSwitchActive,
      activatedAt: killSwitchActivatedAt,
    });
  } catch (error) {
    logger.error('Error checking kill-switch status', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // 'activate' or 'deactivate'

    if (action === 'activate') {
      killSwitchActive = true;
      killSwitchActivatedAt = new Date();

      // Send Slack alert if configured
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        const message = `🚨 KILL-SWITCH ACTIVATED\n\n` +
          `Activated by: ${user.email}\n` +
          `Time: ${killSwitchActivatedAt.toISOString()}\n` +
          `All autonomous battle loops will be stopped.`;

        fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        }).catch((error) => {
          logger.error('Error sending Slack alert', { error });
        });
      }

      logger.warn('Kill-switch activated', { userId: user.id, email: user.email });
    } else if (action === 'deactivate') {
      killSwitchActive = false;
      killSwitchActivatedAt = null;
      logger.info('Kill-switch deactivated', { userId: user.id });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      active: killSwitchActive,
      activatedAt: killSwitchActivatedAt,
      message: killSwitchActive
        ? 'Kill-switch activated. All autonomous loops will stop.'
        : 'Kill-switch deactivated. Autonomous loops can resume.',
    });
  } catch (error) {
    logger.error('Error toggling kill-switch', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export function to check kill-switch status (for use in autonomousBattle.ts)
export function isKillSwitchActive(): boolean {
  return killSwitchActive;
}
