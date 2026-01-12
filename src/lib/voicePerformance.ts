/**
 * Voice Performance Analysis
 * Analyzes stability settings to find optimal ElevenLabs voice configuration
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';

const TARGET_CONTRACT_PRICE = 82700; // $82,700 - the target contract price

/**
 * Analyze voice performance for a given stability setting
 * Updates voice_performance_logs table with aggregated metrics
 */
export async function analyzeVoicePerformance(
  stabilityValue: number,
  humanityScore: number | null,
  contractSigned: boolean | null,
  finalOfferPrice: number | null
): Promise<void> {
  if (!supabaseAdmin) {
    logger.error('supabaseAdmin not initialized');
    return;
  }

  try {
    // Check if this stability resulted in a high-performing contract ($82,700)
    const isHighPerforming = contractSigned === true && 
                             finalOfferPrice !== null && 
                             Math.abs(finalOfferPrice - TARGET_CONTRACT_PRICE) < 100; // Within $100 of target

    // Get or create performance log entry for this stability
    const { data: existingLog, error: fetchError } = await supabaseAdmin
      .from('voice_performance_logs')
      .select('*')
      .eq('stability_setting', stabilityValue)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Error fetching voice performance log', { error: fetchError });
      return;
    }

    // Calculate new aggregated metrics
    const currentSampleSize = existingLog?.sample_size || 0;
    const currentAvgHumanity = existingLog?.avg_humanity_score || 0;
    const currentConversions = existingLog?.conversion_rate ? (existingLog.conversion_rate * currentSampleSize / 100) : 0;

    const newSampleSize = currentSampleSize + 1;
    const newAvgHumanity = humanityScore !== null
      ? ((currentAvgHumanity * currentSampleSize) + humanityScore) / newSampleSize
      : currentAvgHumanity;
    const newConversions = contractSigned === true ? currentConversions + 1 : currentConversions;
    const newConversionRate = (newConversions / newSampleSize) * 100;

    // Update or insert performance log
    if (existingLog) {
      // Update existing log
      const { error: updateError } = await supabaseAdmin
        .from('voice_performance_logs')
        .update({
          avg_humanity_score: newAvgHumanity,
          conversion_rate: newConversionRate,
          sample_size: newSampleSize,
          high_performing: isHighPerforming || existingLog.high_performing, // Keep flag if already set
          updated_at: new Date().toISOString(),
        })
        .eq('stability_setting', stabilityValue);

      if (updateError) {
        logger.error('Error updating voice performance log', { error: updateError });
      }
    } else {
      // Insert new log
      const { error: insertError } = await supabaseAdmin
        .from('voice_performance_logs')
        .insert({
          stability_setting: stabilityValue,
          avg_humanity_score: humanityScore,
          conversion_rate: contractSigned === true ? 100 : 0,
          sample_size: 1,
          high_performing: isHighPerforming,
        });

      if (insertError) {
        logger.error('Error inserting voice performance log', { error: insertError });
      }
    }
  } catch (error) {
    logger.error('Error in analyzeVoicePerformance', { error });
  }
}

/**
 * Get optimal stability setting from the last N calls
 * Returns the stability with the highest conversion rate and humanity score
 */
export async function getOptimalStability(sampleSize: number = 100): Promise<number | null> {
  if (!supabaseAdmin) {
    logger.error('supabaseAdmin not initialized');
    return null;
  }

  try {
    // Get performance logs for the last N calls
    const { data: logs, error } = await supabaseAdmin
      .from('voice_performance_logs')
      .select('*')
      .gte('sample_size', 10) // Only consider stability settings with at least 10 samples
      .order('conversion_rate', { ascending: false })
      .order('avg_humanity_score', { ascending: false })
      .limit(3);

    if (error) {
      logger.error('Error fetching optimal stability', { error });
      return null;
    }

    if (!logs || logs.length === 0) {
      return null;
    }

    // Return the stability with the highest combined score
    // Weight: 60% conversion rate, 40% humanity score
    const scoredLogs = logs.map(log => ({
      stability: log.stability_setting,
      score: (log.conversion_rate || 0) * 0.6 + (log.avg_humanity_score || 0) * 0.4,
    }));

    scoredLogs.sort((a, b) => b.score - a.score);
    return scoredLogs[0]?.stability || null;
  } catch (error) {
    logger.error('Error in getOptimalStability', { error });
    return null;
  }
}

/**
 * Get voice performance statistics for dashboard
 */
export async function getVoicePerformanceStats(): Promise<{
  logs: Array<{
    stability_setting: number;
    avg_humanity_score: number;
    conversion_rate: number;
    sample_size: number;
    high_performing: boolean;
  }>;
  optimalStability: number | null;
}> {
  if (!supabaseAdmin) {
    logger.error('supabaseAdmin not initialized');
    return { logs: [], optimalStability: null };
  }

  try {
    const { data: logs, error } = await supabaseAdmin
      .from('voice_performance_logs')
      .select('*')
      .order('stability_setting', { ascending: true });

    if (error) {
      logger.error('Error fetching voice performance stats', { error });
      return { logs: [], optimalStability: null };
    }

    const optimalStability = await getOptimalStability(100);

    return {
      logs: logs || [],
      optimalStability,
    };
  } catch (error) {
    logger.error('Error in getVoicePerformanceStats', { error });
    return { logs: [], optimalStability: null };
  }
}
