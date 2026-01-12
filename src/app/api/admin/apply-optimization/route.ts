/**
 * Apply AI Optimization API
 * Applies a suggested prompt tweak to a Vapi Assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
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
    const { optimizationId, assistantId } = body;

    if (!optimizationId || !assistantId) {
      return NextResponse.json(
        { error: 'optimizationId and assistantId are required' },
        { status: 400 }
      );
    }

    // Get the optimization details
    const { data: optimization, error: optError } = await supabaseAdmin
      .from('ai_optimizations')
      .select('*')
      .eq('id', optimizationId)
      .single();

    if (optError || !optimization) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 }
      );
    }

    // Get Vapi secret key
    const vapiSecretKey = process.env.VAPI_SECRET_KEY;
    if (!vapiSecretKey) {
      return NextResponse.json(
        { error: 'VAPI_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch current assistant from Vapi
    const assistantResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      logger.error('Error fetching assistant from Vapi', { error: errorText, assistantId });
      return NextResponse.json(
        { error: 'Failed to fetch assistant from Vapi' },
        { status: 500 }
      );
    }

    const assistant = await assistantResponse.json();

    // Extract current system prompt
    const currentPrompt = assistant.model?.messages?.[0]?.content || '';

    // Apply the suggested tweak (simple append for now - could be more sophisticated)
    // In a production system, you might want to parse and intelligently merge the prompt
    const updatedPrompt = `${currentPrompt}\n\n[OPTIMIZATION APPLIED ${new Date().toISOString()}]\n${(optimization as any).suggested_prompt_tweak}`;

    // Update the assistant via Vapi API
    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          ...assistant.model,
          messages: [
            {
              role: 'system',
              content: updatedPrompt,
            },
          ],
        },
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      logger.error('Error updating assistant', { error: errorText, assistantId, optimizationId });
      return NextResponse.json(
        { error: 'Failed to update assistant in Vapi' },
        { status: 500 }
      );
    }

    // Mark optimization as applied
    const { error: updateError } = await (supabaseAdmin as any)
      .from('ai_optimizations')
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
      })
      .eq('id', optimizationId);

    if (updateError) {
      logger.error('Error marking optimization as applied', { error: updateError, optimizationId });
      // Don't fail the request - the assistant was updated successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Optimization applied successfully',
      optimizationId,
      assistantId,
    });
  } catch (error) {
    logger.error('Error applying optimization', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
