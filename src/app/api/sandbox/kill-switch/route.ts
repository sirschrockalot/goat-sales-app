/**
 * Kill Switch API
 * Stops all active autonomous battle loops in the sandbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';
import { getKillSwitchStatus, setKillSwitchActive } from '@/lib/killSwitchUtils';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const status = getKillSwitchStatus();
    return NextResponse.json({
      active: status.active,
      activatedAt: status.activatedAt,
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
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // 'activate' or 'deactivate'

    if (action === 'activate') {
      setKillSwitchActive(true);
      const status = getKillSwitchStatus();

      // Send Slack alert if configured
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        const message = `🚨 KILL-SWITCH ACTIVATED\n\n` +
          `Activated by: ${user.email}\n` +
          `Time: ${status.activatedAt?.toISOString()}\n` +
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
      setKillSwitchActive(false);
      logger.info('Kill-switch deactivated', { userId: user.id });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    const status = getKillSwitchStatus();
    return NextResponse.json({
      success: true,
      active: status.active,
      activatedAt: status.activatedAt,
      message: status.active
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

// Note: isKillSwitchActive function moved to a separate utility file
// to avoid Next.js route export restrictions
// Import it from @/lib/killSwitchUtils if needed
