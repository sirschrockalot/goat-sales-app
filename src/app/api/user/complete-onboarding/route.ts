/**
 * Complete Onboarding API
 * Marks the user's onboarding as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from request cookies/headers
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update profile to mark onboarding as completed
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed',
    });
  } catch (error) {
    console.error('Error in POST /api/user/complete-onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
