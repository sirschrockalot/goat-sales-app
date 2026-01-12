/**
 * Billing API Route
 * Returns billing and usage data for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import {
  getElevenLabsBalance,
  getTwilioBalance,
  getVapiUsage,
  calculateBurnRate,
  getDailySpend,
  getTopSpenders,
  checkBudgetThresholds,
  getSupabaseUsage,
  getVercelUsage,
  getInfrastructureCosts,
  getProfitMargin,
} from '@/lib/billingService';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    const [
      elevenLabsBalance,
      twilioBalance,
      vapiUsage,
      burnRate,
      dailySpend,
      topSpenders,
      budgetCheck,
      supabaseUsage,
      vercelUsage,
      infrastructureCosts,
      profitMargin,
    ] = await Promise.all([
      getElevenLabsBalance(),
      getTwilioBalance(),
      getVapiUsage(),
      calculateBurnRate(),
      getDailySpend(),
      getTopSpenders(10),
      checkBudgetThresholds(),
      getSupabaseUsage(),
      getVercelUsage(),
      getInfrastructureCosts(),
      getProfitMargin(),
    ]);

    return NextResponse.json({
      credits: {
        elevenlabs: elevenLabsBalance,
        twilio: twilioBalance,
      },
      usage: {
        vapi: vapiUsage,
        burnRate,
        dailySpend,
      },
      infrastructure: {
        supabase: supabaseUsage,
        vercel: vercelUsage,
        costs: infrastructureCosts,
      },
      profitMargin,
      topSpenders,
      budgetCheck,
    });
  } catch (error) {
    logger.error('Error fetching billing data', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
