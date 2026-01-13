/**
 * Persona Performance Analytics API
 * Returns success rates and difficulty metrics for each persona
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

    // Fetch all personas with their battle statistics
    const { data: personas, error: personasError } = await supabaseAdmin
      .from('sandbox_personas')
      .select('id, name, persona_type, description')
      .eq('is_active', true);

    if (personasError) {
      logger.error('Error fetching personas', { error: personasError });
      return NextResponse.json(
        { error: 'Failed to fetch personas' },
        { status: 500 }
      );
    }

    // Fetch battle statistics for each persona
    const analytics = await Promise.all(
      ((personas as any[]) || []).map(async (persona: any) => {
        const { data: battles, error: battlesError } = await supabaseAdmin
          .from('sandbox_battles')
          .select('referee_score, verbal_yes_to_memorandum, verbal_yes_to_price, document_status, success_score, technical_assistance_score')
          .eq('persona_id', persona.id);

        const battlesData = (battles as any[]) || [];
        if (battlesError || battlesData.length === 0) {
          return {
            personaId: persona.id,
            personaName: persona.name,
            personaType: persona.persona_type,
            totalBattles: 0,
            successRate: 0,
            averageScore: 0,
            verbalYesCount: 0,
            averageSuccessScore: 0,
          };
        }

        const totalBattles = battlesData.length;
        
        // NEW SUCCESS CRITERIA: Signature-First Model
        // Success requires BOTH: verbal_yes_to_price === true AND document_status = 'completed'
        const primarySuccessCount = battlesData.filter((b: any) => b.verbal_yes_to_price).length;
        const ultimateSuccessCount = battlesData.filter((b: any) => b.document_status === 'completed').length;
        
        // Calculate success rate: BOTH criteria must be met
        // A battle is successful ONLY if verbal_yes_to_price === true AND signature_status === 'completed'
        const successfulBattles = battlesData.filter(
          (b: any) => b.verbal_yes_to_price === true && b.document_status === 'completed'
        ).length;
        
        const successRate = totalBattles > 0 ? (successfulBattles / totalBattles) * 100 : 0;
        
        // Legacy: Keep verbal_yes_to_memorandum for backward compatibility
        const verbalYesMemorandumCount = battlesData.filter((b: any) => b.verbal_yes_to_memorandum).length;
        
        const averageScore =
          battlesData.reduce((sum: number, b: any) => sum + (b.referee_score || 0), 0) / totalBattles;
        const averageSuccessScore =
          battlesData.reduce((sum: number, b: any) => sum + (b.success_score || 0), 0) / totalBattles;
        const averageTechnicalAssistance =
          battlesData.reduce((sum: number, b: any) => sum + (b.technical_assistance_score || 0), 0) / totalBattles;

        return {
          personaId: persona.id,
          personaName: persona.name,
          personaType: persona.persona_type,
          totalBattles,
          successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal - BOTH criteria required
          averageScore: Math.round(averageScore * 10) / 10,
          verbalYesCount: primarySuccessCount, // Primary Success count (price agreement)
          ultimateSuccessCount, // Ultimate Success count (signed contracts)
          successfulBattles, // Battles that met BOTH criteria
          averageSuccessScore: Math.round(averageSuccessScore * 10) / 10,
          averageTechnicalAssistance: Math.round(averageTechnicalAssistance * 10) / 10,
          // Legacy fields for backward compatibility
          verbalYesMemorandumCount,
        };
      })
    );

    // Sort by success rate (lowest first = hardest to close)
    analytics.sort((a, b) => a.successRate - b.successRate);

    return NextResponse.json({
      analytics,
      totalPersonas: analytics.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/sandbox/persona-analytics', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
