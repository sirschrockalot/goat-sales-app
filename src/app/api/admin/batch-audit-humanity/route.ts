/**
 * Batch Audit Humanity Grades API
 * Triggers batch audit of battles without humanity grades
 * Runs on the server (Heroku) with correct database connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

// Inline vocal soul auditor functions (since scripts/ may not be available in production)
// These match the logic from scripts/vocalSoulAuditor.ts

interface ProsodyFeatures {
  pitchVariance: number;
  rhythmVariability: number;
  jitter: number;
  shimmer: number;
  pauseFrequency: number;
  averagePauseDuration: number;
  speechRate: number;
  pitchRange: number;
}

const ERIC_CLINE_GOLD_STANDARD = {
  pitchVariance: 0.75,
  rhythmVariability: 0.82,
  jitter: 0.45,
  shimmer: 0.38,
  averagePauseDuration: 1.2,
  speechRate: 145,
  pitchRange: 8.5,
  textureDensityTarget: 12,
};

function analyzeTranscriptProsody(transcript: string): ProsodyFeatures {
  const pauseMatches = transcript.match(/\[pause\]|\[long pause\]|\[slight pause\]/gi) || [];
  const textureMatches = transcript.match(/\[uh\]|\[um\]|\[sigh\]|\[thinking\.\.\.\]|\[well\.\.\.\]|\[I mean\.\.\.\]/gi) || [];
  const acousticCues = transcript.match(/\[sigh\]|\[clears throat\]|\[soft chuckle\]|\[quick inhale\]/gi) || [];
  
  const words = transcript.split(/\s+/).length;
  const duration = Math.max(1, words / 150);
  
  const hasTextures = textureMatches.length > 0;
  const textureRatio = textureMatches.length / Math.max(1, words / 10);
  
  return {
    pitchVariance: hasTextures ? Math.min(0.8, 0.5 + textureRatio * 0.3) : 0.4,
    rhythmVariability: hasTextures ? Math.min(0.85, 0.5 + textureRatio * 0.35) : 0.45,
    jitter: acousticCues.length > 0 ? 0.45 : (hasTextures ? 0.35 : 0.25),
    shimmer: hasTextures ? 0.38 : 0.28,
    pauseFrequency: (pauseMatches.length / duration) * 60,
    averagePauseDuration: pauseMatches.length > 0 ? 1.2 : 0.6,
    speechRate: (words / duration) * 60,
    pitchRange: hasTextures ? 7.5 : 5.0,
  };
}

function compareToGoldStandard(aiFeatures: ProsodyFeatures & { textureDensity?: number }) {
  const pitchVarianceGap = Math.abs(aiFeatures.pitchVariance - ERIC_CLINE_GOLD_STANDARD.pitchVariance);
  const rhythmGap = Math.abs(aiFeatures.rhythmVariability - ERIC_CLINE_GOLD_STANDARD.rhythmVariability);
  const jitterGap = Math.abs(aiFeatures.jitter - ERIC_CLINE_GOLD_STANDARD.jitter);
  const shimmerGap = Math.abs(aiFeatures.shimmer - ERIC_CLINE_GOLD_STANDARD.shimmer);
  const pauseDurationGap = Math.abs(aiFeatures.averagePauseDuration - ERIC_CLINE_GOLD_STANDARD.averagePauseDuration);
  
  const textureDensity = aiFeatures.textureDensity || 0;
  const textureDensityGap = Math.abs(textureDensity - ERIC_CLINE_GOLD_STANDARD.textureDensityTarget);

  const pitchScore = (1 - pitchVarianceGap) * 25;
  const rhythmScore = (1 - rhythmGap) * 25;
  const jitterScore = (1 - jitterGap) * 15;
  const shimmerScore = (1 - shimmerGap) * 15;
  const pauseScore = (1 - Math.min(pauseDurationGap / 1.0, 1)) * 10;
  const textureScore = (1 - Math.min(textureDensityGap / 12, 1)) * 10;

  const humanityGrade = Math.round(
    pitchScore + rhythmScore + jitterScore + shimmerScore + pauseScore + textureScore
  );

  const closenessToCline = Math.round(
    (1 - (
      pitchVarianceGap * 0.2 +
      rhythmGap * 0.2 +
      jitterGap * 0.15 +
      shimmerGap * 0.15 +
      pauseDurationGap * 0.1 +
      textureDensityGap / 12 * 0.2
    )) * 100
  );

  return {
    humanityGrade,
    pitchVarianceGap,
    rhythmGap,
    jitterGap,
    turnLatencyGap: pauseDurationGap,
    textureDensity,
    textureDensityGap,
    closenessToCline,
    recommendations: [] as string[],
  };
}

async function auditVocalSoul(transcript: string, battleId: string) {
  const prosodyFeatures = analyzeTranscriptProsody(transcript);
  
  const textureMatches = transcript.match(/\[uh\]|\[um\]|\[sigh\]|\[thinking\.\.\.\]|\[well\.\.\.\]|\[I mean\.\.\.\]|\[pause\]|\[long pause\]/gi) || [];
  const words = transcript.split(/\s+/).length;
  const duration = Math.max(1, words / 150);
  const textureDensity = (textureMatches.length / duration) * 60;
  
  const enhancedProsody = {
    ...prosodyFeatures,
    textureDensity,
  };

  const gapReport = compareToGoldStandard(enhancedProsody);

  if (battleId && supabaseAdmin) {
    await supabaseAdmin
      .from('sandbox_battles')
      .update({
        humanity_grade: gapReport.humanityGrade,
        closeness_to_cline: gapReport.closenessToCline,
        prosody_features: prosodyFeatures as any,
        robotic_gap_report: gapReport as any,
      } as any)
      .eq('id', battleId);
  }

  return gapReport;
}

async function checkAndInjectFeedback(humanityGrade: number): Promise<boolean> {
  if (humanityGrade >= 85) {
    return false;
  }

  const textureFrequencyIncrease = 0.1;
  
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('sandbox_config')
      .upsert({
        key: 'acoustic_texture_frequency',
        value: JSON.stringify({ 
          base: 0.3,
          adjusted: 0.3 + textureFrequencyIncrease,
          sessionsRemaining: 50,
          reason: `Humanity grade ${humanityGrade} below 85`,
        }),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });
  }

  return true;
}

interface Battle {
  id: string;
  transcript: string;
  referee_score: number;
  humanity_grade: number | null;
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50;
    const minScore = body.minScore || 0;
    const dryRun = body.dryRun || false;

    logger.info('Starting batch humanity grade audit via API', { limit, minScore, dryRun, userId: user.id });

    // Fetch battles without humanity grades
    const { data: battles, error } = await supabaseAdmin
      .from('sandbox_battles')
      .select('id, transcript, referee_score, humanity_grade')
      .is('humanity_grade', null)
      .gte('referee_score', minScore)
      .not('transcript', 'is', null)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching battles', { error });
      return NextResponse.json(
        { error: 'Failed to fetch battles', details: error.message },
        { status: 500 }
      );
    }

    if (!battles || battles.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        audited: 0,
        errors: 0,
        message: 'No battles found to audit',
      });
    }

    logger.info(`Found ${battles.length} battles to audit`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        total: battles.length,
        audited: 0,
        errors: 0,
        dryRun: true,
        battleIds: battles.map((b) => b.id),
        message: `DRY RUN: Would audit ${battles.length} battles`,
      });
    }

    // Audit each battle
    let audited = 0;
    let errors = 0;
    const results: Array<{
      battleId: string;
      success: boolean;
      humanityGrade?: number;
      error?: string;
    }> = [];

    for (const battle of battles) {
      try {
        if (!battle.transcript || battle.transcript.trim().length === 0) {
          logger.warn('Skipping battle with empty transcript', { battleId: battle.id });
          errors++;
          results.push({
            battleId: battle.id,
            success: false,
            error: 'Empty transcript',
          });
          continue;
        }

        logger.info(`Auditing battle ${battle.id}`, {
          battleId: battle.id,
          score: battle.referee_score,
          transcriptLength: battle.transcript.length,
        });

        // Audit the battle (transcript-only, no audio file needed)
        const auditResult = await auditVocalSoul(
          battle.transcript,
          battle.id
        );

        logger.info('Audit complete', {
          battleId: battle.id,
          humanityGrade: auditResult.humanityGrade,
          closenessToCline: auditResult.closenessToCline,
        });

        // Check if feedback injection is needed
        if (auditResult.humanityGrade < 85) {
          await checkAndInjectFeedback(auditResult.humanityGrade);
          logger.info('Feedback injected', {
            battleId: battle.id,
            humanityGrade: auditResult.humanityGrade,
          });
        }

        audited++;
        results.push({
          battleId: battle.id,
          success: true,
          humanityGrade: auditResult.humanityGrade,
        });

        // Small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error('Error auditing battle', {
          battleId: battle.id,
          error,
        });
        errors++;
        results.push({
          battleId: battle.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate statistics
    const grades = results
      .filter((r) => r.success && r.humanityGrade !== undefined)
      .map((r) => r.humanityGrade!);

    const avgHumanityGrade = grades.length > 0
      ? grades.reduce((sum, g) => sum + g, 0) / grades.length
      : 0;
    const minGrade = grades.length > 0 ? Math.min(...grades) : 0;
    const maxGrade = grades.length > 0 ? Math.max(...grades) : 0;

    const summary = {
      success: true,
      total: battles.length,
      audited,
      errors,
      statistics: {
        averageHumanityGrade: Math.round(avgHumanityGrade * 10) / 10,
        minGrade,
        maxGrade,
      },
      results: results.slice(0, 20), // Return first 20 results to avoid huge response
    };

    logger.info('Batch audit complete', summary);

    return NextResponse.json(summary);
  } catch (error) {
    logger.error('Error in batch audit API', { error });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
