/**
 * Closer Stats API
 * Fetches leaderboard data for closers (total deals, margin retention)
 */

import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

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

    if (profileError || !profile || !(profile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'deals';

    // Query calls with contract_signed = true
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select(`
        id,
        user_id,
        contract_signed,
        suggested_buy_price,
        final_offer_price,
        price_variance,
        goat_score,
        created_at,
        profiles:user_id (
          id,
          name,
          email
        )
      `)
      .eq('contract_signed', true)
      .not('final_offer_price', 'is', null)
      .order('created_at', { ascending: false });

    if (callsError) {
      logger.error('Error fetching calls', { error: callsError });
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: 500 }
      );
    }

    // Aggregate by user
    const userStats = new Map<string, any>();

    (calls || []).forEach((call: any) => {
      const userId = call.user_id;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user_id: userId,
          name: call.profiles?.name || 'Unknown',
          email: call.profiles?.email || 'unknown@example.com',
          total_locked_deals: 0,
          total_variance: 0,
          variance_count: 0,
          total_contract_value: 0,
          total_goat_score: 0,
          score_count: 0,
          deals: [],
        });
      }

      const stats = userStats.get(userId);
      stats.total_locked_deals++;
      stats.total_contract_value += call.final_offer_price || 0;
      
      if (call.price_variance !== null) {
        stats.total_variance += call.price_variance;
        stats.variance_count++;
      }
      
      if (call.goat_score !== null) {
        stats.total_goat_score += call.goat_score;
        stats.score_count++;
      }

      stats.deals.push({
        id: call.id,
        final_offer_price: call.final_offer_price,
        suggested_buy_price: call.suggested_buy_price,
        price_variance: call.price_variance,
        goat_score: call.goat_score,
        created_at: call.created_at,
      });
    });

    // Calculate averages and format
    const stats = Array.from(userStats.values()).map((stat) => ({
      ...stat,
      avg_margin_retention: stat.variance_count > 0
        ? stat.total_variance / stat.variance_count
        : null,
      avg_goat_score: stat.score_count > 0
        ? Math.round(stat.total_goat_score / stat.score_count)
        : 0,
      deals: stat.deals.slice(0, 10), // Limit to 10 most recent
    }));

    // Sort
    if (sortBy === 'deals') {
      stats.sort((a, b) => b.total_locked_deals - a.total_locked_deals);
    } else {
      stats.sort((a, b) => {
        const aMargin = a.avg_margin_retention ?? 999;
        const bMargin = b.avg_margin_retention ?? 999;
        // Lower variance is better (negative = good)
        return aMargin - bMargin;
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Error in closer stats API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
