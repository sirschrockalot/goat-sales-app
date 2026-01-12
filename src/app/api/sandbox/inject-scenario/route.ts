/**
 * Scenario Injection API
 * Injects a raw objection and triggers brute-force battles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { injectAndBruteForce } from '@/lib/scenarioInjector';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { rawObjection, sellerPersona } = body;

    if (!rawObjection || typeof rawObjection !== 'string' || rawObjection.trim().length === 0) {
      return NextResponse.json(
        { error: 'rawObjection is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    logger.info('Scenario injection requested', { userId: user.id, rawObjection });

    // Inject scenario and start brute-force loop
    const result = await injectAndBruteForce(rawObjection, sellerPersona);

    return NextResponse.json({
      success: true,
      scenarioId: result.scenarioId,
      status: result.status,
      message: 'Scenario injected. Brute-force loop started.',
    });
  } catch (error: any) {
    logger.error('Error injecting scenario', { error, message: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Failed to inject scenario' },
      { status: 500 }
    );
  }
}
