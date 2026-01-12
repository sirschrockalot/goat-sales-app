/**
 * Promote Tactic API
 * Promotes a winning tactic from sandbox to production
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { promoteTactic } from '@/lib/promotionService';
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
    const { tacticId, battleId } = body;

    let actualTacticId = tacticId;

    // If battleId is provided, find the tactic for that battle
    if (battleId && !tacticId) {
      const { data: tactic, error: tacticError } = await supabaseAdmin
        .from('sandbox_tactics')
        .select('id')
        .eq('battle_id', battleId)
        .single();

      if (tacticError || !tactic) {
        // If no tactic exists, create one from the battle's winning rebuttal
        const { data: battle, error: battleError } = await supabaseAdmin
          .from('sandbox_battles')
          .select('winning_rebuttal, referee_score')
          .eq('id', battleId)
          .single();

        const battleData = battle as any;
        if (battleError || !battleData || !battleData.winning_rebuttal) {
          return NextResponse.json(
            { error: 'No winning rebuttal found for this battle' },
            { status: 404 }
          );
        }

        // Create tactic from battle
        const { data: newTactic, error: createError } = await (supabaseAdmin as any)
          .from('sandbox_tactics')
          .insert({
            battle_id: battleId,
            tactic_text: battleData.winning_rebuttal,
            is_synthetic: true,
            priority: 5,
            is_active: false,
          } as any)
          .select('id')
          .single();

        if (createError || !newTactic) {
          return NextResponse.json(
            { error: 'Failed to create tactic' },
            { status: 500 }
          );
        }

        actualTacticId = (newTactic as any).id;
      } else {
        actualTacticId = (tactic as any).id;
      }
    }

    if (!actualTacticId) {
      return NextResponse.json(
        { error: 'tacticId or battleId is required' },
        { status: 400 }
      );
    }

    // Promote the tactic
    await promoteTactic(actualTacticId);

    logger.info('Tactic promoted to production', { tacticId, userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Tactic promoted to production successfully',
    });
  } catch (error: any) {
    logger.error('Error promoting tactic', { error, message: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Failed to promote tactic' },
      { status: 500 }
    );
  }
}
