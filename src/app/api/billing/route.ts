/**
 * Billing API Route
 * Returns billing and usage data for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // For now, this is accessible to anyone (add auth in production)

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
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
