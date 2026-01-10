/**
 * Badges API
 * Handles badge fetching and unlocking
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get user badges
    const { data: badges, error } = await supabaseAdmin
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching badges:', error);
      return NextResponse.json(
        { error: 'Failed to fetch badges' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      badges: badges || [],
    });
  } catch (error) {
    console.error('Error in GET /api/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { badgeType, badgeName, badgeDescription, metadata } = body;

    if (!badgeType || !badgeName) {
      return NextResponse.json(
        { error: 'badgeType and badgeName are required' },
        { status: 400 }
      );
    }

    // Check if badge already exists
    const { data: existing } = await supabaseAdmin
      .from('badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Badge already unlocked',
        badge: existing,
      });
    }

    // Insert new badge
    const { data: badge, error } = await supabaseAdmin
      .from('badges')
      .insert({
        user_id: userId,
        badge_type: badgeType,
        badge_name: badgeName,
        badge_description: badgeDescription || '',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating badge:', error);
      return NextResponse.json(
        { error: 'Failed to create badge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      badge,
    });
  } catch (error) {
    console.error('Error in POST /api/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
