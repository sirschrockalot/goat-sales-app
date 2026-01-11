/**
 * Toggle Permanent Knowledge API
 * Sets or unsets the is_permanent_knowledge flag for a call
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const callId = params.id;
    const body = await request.json();
    const { is_permanent_knowledge } = body;

    if (typeof is_permanent_knowledge !== 'boolean') {
      return NextResponse.json(
        { error: 'is_permanent_knowledge must be a boolean' },
        { status: 400 }
      );
    }

    // Update the call record
    const { error: updateError } = await supabaseAdmin
      .from('calls')
      .update({ is_permanent_knowledge })
      .eq('id', callId);

    if (updateError) {
      console.error('Error updating permanent knowledge flag:', updateError);
      return NextResponse.json(
        { error: 'Failed to update call' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      callId,
      is_permanent_knowledge,
    });
  } catch (error) {
    console.error('Error in permanent knowledge API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
