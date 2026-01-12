/**
 * Approve Evolution API
 * Approves a pending prompt evolution and updates the Vapi assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { updateVapiAssistantPrompt } from '@/lib/vapiControl';
import logger from '@/lib/logger';

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

    if (profileError || !profile || !(profile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { evolutionId, editedPrompt } = body;

    if (!evolutionId) {
      return NextResponse.json(
        { error: 'evolutionId is required' },
        { status: 400 }
      );
    }

    // Get the evolution
    const { data: evolution, error: evolutionError } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('id', evolutionId)
      .single();

    if (evolutionError || !evolution) {
      return NextResponse.json(
        { error: 'Evolution not found' },
        { status: 404 }
      );
    }

    const evolutionData = evolution as any;
    if (evolutionData.status !== 'pending_review') {
      return NextResponse.json(
        { error: 'Evolution is not pending review' },
        { status: 400 }
      );
    }

    // Use edited prompt if provided, otherwise use the original
    const promptToApply = editedPrompt || evolutionData.prompt_text;

    // Deactivate all previous active versions for this assistant
    await (supabaseAdmin as any)
      .from('prompt_versions')
      .update({ 
        is_active: false,
        status: 'active', // Keep status as active for history
      } as any)
      .eq('assistant_id', evolutionData.assistant_id)
      .eq('is_active', true);

    // Update the evolution to active
    const { error: updateError } = await (supabaseAdmin as any)
      .from('prompt_versions')
      .update({
        status: 'active',
        is_active: true,
        applied_by: user.id,
        applied_at: new Date().toISOString(),
        ...(editedPrompt && { prompt_text: editedPrompt, changes_summary: `${evolutionData.changes_summary} (Edited by admin)` }),
      } as any)
      .eq('id', evolutionId);

    if (updateError) {
      logger.error('Error updating evolution status', { error: updateError, evolutionId });
      return NextResponse.json(
        { error: 'Failed to update evolution status' },
        { status: 500 }
      );
    }

    // Update Vapi Assistant
    try {
      await updateVapiAssistantPrompt(evolutionData.assistant_id, promptToApply);
    } catch (vapiError) {
      logger.error('Error updating Vapi assistant', { error: vapiError, assistantId: evolutionData.assistant_id, evolutionId });
      // Rollback the status update
      await (supabaseAdmin as any)
        .from('prompt_versions')
        .update({ status: 'pending_review', is_active: false } as any)
        .eq('id', evolutionId);
      
      return NextResponse.json(
        { error: 'Failed to update Vapi assistant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Evolution approved and applied successfully',
      evolutionId,
    });
  } catch (error) {
    logger.error('Error approving evolution', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
