/**
 * Get Pending Evolutions
 * Fetches prompt versions that are pending admin review
 */

import logger from './logger';

export interface PendingEvolution {
  id: string;
  assistant_id: string;
  version_number: number;
  prompt_text: string;
  changes_summary: string | null;
  stories_added: string[] | null;
  applied_at: string;
  applied_by: string | null;
  status: 'pending_review' | 'active' | 'rejected' | 'draft';
  performance_metrics: Record<string, any> | null;
  created_at: string;
  // Computed fields
  current_prompt?: string; // Current active prompt for comparison
  story_details?: Array<{
    id: string;
    story_text: string;
    story_summary: string;
    engagement_rating: number;
    industry_niche: string;
  }>;
  impact_metrics?: {
    call_count: number;
    avg_goat_score: number;
    avg_humanity_score: number;
  };
}

/**
 * Get pending evolutions (status = 'pending_review')
 */
export async function getPendingEvolutions(): Promise<PendingEvolution[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    throw new Error('Database not available');
  }

  const { data, error } = await supabaseAdmin
    .from('prompt_versions')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching pending evolutions', { error });
    throw error;
  }

  // Enrich with additional data
  const enriched = await Promise.all(
    ((data as any[]) || []).map(async (evolution: any) => {
      // Get current active prompt for comparison
      const { data: currentVersion } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_text')
        .eq('assistant_id', evolution.assistant_id)
        .eq('status', 'active')
        .eq('is_active', true)
        .single();

      // Get story details if stories_added exists
      let storyDetails: any[] = [];
      if (evolution.stories_added && evolution.stories_added.length > 0) {
        const { data: stories } = await supabaseAdmin
          .from('story_library')
          .select('id, story_text, story_summary, engagement_rating, industry_niche, origin_call_id')
          .in('id', evolution.stories_added);
        storyDetails = stories || [];
      }

      // Get impact metrics from calls that triggered this evolution
      // Calculate from stories' origin_call_id
      let impactMetrics = {
        call_count: 0,
        avg_goat_score: 0,
        avg_humanity_score: 0,
      };

      if (storyDetails.length > 0) {
        const callIds = storyDetails
          .map(s => s.origin_call_id)
          .filter(Boolean) as string[];

        if (callIds.length > 0) {
          const { data: calls } = await supabaseAdmin
            .from('calls')
            .select('goat_score, metadata')
            .in('id', callIds);

          const callsData = (calls as any[]) || [];
          if (callsData.length > 0) {
            impactMetrics.call_count = callsData.length;
            impactMetrics.avg_goat_score = Math.round(
              callsData.reduce((sum: number, c: any) => sum + (c.goat_score || 0), 0) / callsData.length
            );
            const humanityScores = callsData
              .map((c: any) => (c.metadata as any)?.humanity_score)
              .filter((score): score is number => typeof score === 'number' && score > 0);
            
            if (humanityScores.length > 0) {
              impactMetrics.avg_humanity_score = Math.round(
                humanityScores.reduce((sum: number, score: number) => sum + score, 0) / humanityScores.length
              );
            }
          }
        }
      }

      return {
        ...evolution,
        current_prompt: (currentVersion as any)?.prompt_text || '',
        story_details: storyDetails,
        impact_metrics: impactMetrics,
      } as PendingEvolution;
    })
  );

  return enriched;
}

/**
 * Get version history for an assistant
 */
export async function getVersionHistory(assistantId: string): Promise<PendingEvolution[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    throw new Error('Database not available');
  }

  const { data, error } = await supabaseAdmin
    .from('prompt_versions')
    .select('*')
    .eq('assistant_id', assistantId)
    .order('version_number', { ascending: false });

  if (error) {
    logger.error('Error fetching version history', { error });
    throw error;
  }

  return ((data as any[]) || []) as PendingEvolution[];
}
