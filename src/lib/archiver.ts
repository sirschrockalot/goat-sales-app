/**
 * Smart Archiver - Intelligent Database Pruning
 * 
 * Archives old training data while protecting high-value knowledge
 * 
 * Features:
 * - Protected tags: GOLDEN_KNOWLEDGE, PRIVATE_PORTAL, APEX_LOGIC
 * - Stay-Hot Logic: Protected data never archived
 * - Manual Override: is_permanent_knowledge flag
 * - Archive to call_logs_archive table
 * - Reduces Supabase storage costs
 */

// supabaseAdmin imported dynamically
import logger from './logger';

// Protected tags that prevent archiving
export const PROTECTED_TAGS = ['GOLDEN_KNOWLEDGE', 'PRIVATE_PORTAL', 'APEX_LOGIC'] as const;

// Archive configuration
const ARCHIVE_CONFIG = {
  ageThresholdDays: 30, // Archive calls older than 30 days
  batchSize: 100, // Process in batches to avoid timeouts
};

export interface ArchiveStats {
  totalProcessed: number;
  protected: number;
  archived: number;
  errors: number;
  protectedReasons: {
    hasProtectedTag: number;
    isPermanentKnowledge: number;
  };
}

/**
 * Check if a record has any protected tags in metadata
 */
function hasProtectedTag(metadata: any): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  // Check if metadata has a protected_tags array
  if (Array.isArray(metadata.protected_tags)) {
    return metadata.protected_tags.some((tag: string) =>
      PROTECTED_TAGS.includes(tag as typeof PROTECTED_TAGS[number])
    );
  }

  // Fallback: Check if metadata contains any protected tags as strings
  const metadataString = JSON.stringify(metadata).toUpperCase();
  
  return PROTECTED_TAGS.some(tag => 
    metadataString.includes(tag.toUpperCase())
  );
}

/**
 * Check if a record should be protected from archiving
 */
function isProtected(record: any): { protected: boolean; reason: string } {
  // Rule 1: Manual override flag
  if (record.is_permanent_knowledge === true) {
    return { protected: true, reason: 'is_permanent_knowledge flag set' };
  }

  // Rule 2: Protected tags in metadata
  if (hasProtectedTag(record.metadata)) {
    return { protected: true, reason: 'Contains protected tag in metadata' };
  }

  return { protected: false, reason: 'No protection' };
}

/**
 * Archive a single call record
 */
async function archiveCallRecord(call: any): Promise<boolean> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return false;
  }

  try {
    // Insert into archive table
    const { error: archiveError } = await (supabaseAdmin as any)
      .from('call_logs_archive')
      .insert({
        id: call.id,
        user_id: call.user_id,
        transcript: call.transcript,
        goat_score: call.goat_score,
        recording_url: call.recording_url,
        persona_mode: call.persona_mode,
        persona_id: call.persona_id,
        logic_gates: call.logic_gates,
        call_status: call.call_status,
        rebuttal_of_the_day: call.rebuttal_of_the_day,
        script_adherence: call.script_adherence,
        metadata: call.metadata,
        contract_signed: call.contract_signed,
        suggested_buy_price: call.suggested_buy_price,
        final_offer_price: call.final_offer_price,
        price_variance: call.price_variance,
        test_stability_value: call.test_stability_value,
        script_hidden_duration: call.script_hidden_duration,
        created_at: call.created_at,
        updated_at: call.updated_at,
        ended_at: call.ended_at,
        original_id: call.id,
        archive_reason: `Age > ${ARCHIVE_CONFIG.ageThresholdDays} days, no protected tags`,
      } as any);

    if (archiveError) {
      logger.error('Error archiving call', { callId: call.id, error: archiveError });
      return false;
    }

    // Delete from original table after successful archive
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('calls')
      .delete()
      .eq('id', call.id);

    if (deleteError) {
      logger.error('Error deleting archived call', { callId: call.id, error: deleteError });
      // Archive was successful, but deletion failed - this is recoverable
      return true; // Still count as archived
    }

    return true;
  } catch (error) {
    logger.error('Error archiving call', { callId: call.id, error });
    return false;
  }
}

/**
 * Get records eligible for archiving
 */
async function getEligibleRecords(limit: number = ARCHIVE_CONFIG.batchSize): Promise<any[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_CONFIG.ageThresholdDays);

  // Get old records that are not protected
  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('*')
    .lt('created_at', cutoffDate.toISOString())
    .eq('is_permanent_knowledge', false) // Exclude permanent knowledge
    .eq('call_status', 'ended') // Only archive completed calls
    .limit(limit)
    .order('created_at', { ascending: true }); // Archive oldest first

  if (error) {
    logger.error('Error fetching eligible records', { error });
    return [];
  }

  return data || [];
}

/**
 * Run the archiving process
 */
export async function runArchivingProcess(): Promise<ArchiveStats> {
  logger.info('Starting Smart Archiving Process');

  const stats: ArchiveStats = {
    totalProcessed: 0,
    protected: 0,
    archived: 0,
    errors: 0,
    protectedReasons: {
      hasProtectedTag: 0,
      isPermanentKnowledge: 0,
    },
  };

  let hasMore = true;
  let batchNumber = 0;

  while (hasMore) {
    batchNumber++;
    logger.info(`Processing archiving batch ${batchNumber}`);

    // Get eligible records
    const eligibleRecords = await getEligibleRecords(ARCHIVE_CONFIG.batchSize);

    if (eligibleRecords.length === 0) {
      hasMore = false;
      logger.info('No more records to process');
      break;
    }

    logger.debug(`Found ${eligibleRecords.length} eligible records for archiving`);

    // Process each record
    for (const record of eligibleRecords) {
      stats.totalProcessed++;

      // Check if protected
      const protection = isProtected(record);

      if (protection.protected) {
        stats.protected++;
        
        if (protection.reason.includes('is_permanent_knowledge')) {
          stats.protectedReasons.isPermanentKnowledge++;
        } else if (protection.reason.includes('protected tag')) {
          stats.protectedReasons.hasProtectedTag++;
        }

        logger.debug(`Protected record from archiving`, { callId: record.id, reason: protection.reason });
        continue;
      }

      // Archive the record
      const archived = await archiveCallRecord(record);

      if (archived) {
        stats.archived++;
        logger.info(`Archived call record`, { callId: record.id });
      } else {
        stats.errors++;
        logger.error(`Error archiving record`, { callId: record.id });
      }
    }

    // If we got fewer records than batch size, we're done
    if (eligibleRecords.length < ARCHIVE_CONFIG.batchSize) {
      hasMore = false;
    }

    // Small delay between batches to avoid overwhelming the database
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  logger.info('Archiving Statistics', {
    totalProcessed: stats.totalProcessed,
    protected: stats.protected,
    archived: stats.archived,
    errors: stats.errors,
    protectedByTag: stats.protectedReasons.hasProtectedTag,
    protectedByFlag: stats.protectedReasons.isPermanentKnowledge,
  });

  return stats;
}

/**
 * Tag a call record with a protected tag
 */
export async function tagAsProtected(
  callId: string,
  tag: typeof PROTECTED_TAGS[number]
): Promise<boolean> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return false;
  }

  try {
    // Get current metadata
    const { data: call, error: fetchError } = await supabaseAdmin
      .from('calls')
      .select('metadata')
      .eq('id', callId)
      .single();

    const callData = call as any;
    if (fetchError || !callData) {
      logger.error('Error fetching call for tagging', { callId, error: fetchError });
      return false;
    }

    // Add protected tag to metadata
    const currentMetadata = callData.metadata || {};
    const tags = currentMetadata.protected_tags || [];
    
    if (!tags.includes(tag)) {
      tags.push(tag);
    }

    const updatedMetadata = {
      ...currentMetadata,
      protected_tags: tags,
    };

    // Update record
    const { error: updateError } = await (supabaseAdmin as any)
      .from('calls')
      .update({ metadata: updatedMetadata } as any)
      .eq('id', callId);

    if (updateError) {
      logger.error('Error tagging call', { callId, error: updateError });
      return false;
    }

    logger.info(`Tagged call with protected tag`, { callId, tag });
    return true;
  } catch (error) {
    logger.error('Error tagging call', { callId, error });
    return false;
  }
}

/**
 * Set is_permanent_knowledge flag for a call
 */
export async function setPermanentKnowledge(callId: string, isPermanent: boolean): Promise<boolean> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { error } = await (supabaseAdmin as any)
      .from('calls')
      .update({ is_permanent_knowledge: isPermanent } as any)
      .eq('id', callId);

    if (error) {
      logger.error('Error setting permanent knowledge flag', { callId, error });
      return false;
    }

    logger.info(`Set is_permanent_knowledge flag`, { callId, isPermanent });
    return true;
  } catch (error) {
    logger.error('Error setting permanent knowledge flag', { error });
    return false;
  }
}

/**
 * Get archive statistics
 */
export async function getArchiveStats(): Promise<{
  totalCalls: number;
  archivedCalls: number;
  protectedCalls: number;
  oldestUnprotectedCall: string | null;
}> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return {
      totalCalls: 0,
      archivedCalls: 0,
      protectedCalls: 0,
      oldestUnprotectedCall: null,
    };
  }

  try {
    const [totalResult, archivedResult, protectedResult, oldestResult] = await Promise.all([
      // Total calls
      (supabaseAdmin as any)
        .from('calls')
        .select('id', { count: 'exact', head: true }),
      
      // Archived calls
      (supabaseAdmin as any)
        .from('call_logs_archive')
        .select('id', { count: 'exact', head: true }),
      
      // Protected calls
      (supabaseAdmin as any)
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .or('is_permanent_knowledge.eq.true,metadata->protected_tags.not.is.null'),
      
      // Oldest unprotected call
      (supabaseAdmin as any)
        .from('calls')
        .select('created_at')
        .eq('is_permanent_knowledge', false)
        .eq('call_status', 'ended')
        .order('created_at', { ascending: true })
        .limit(1)
        .single(),
    ]);

    const totalCalls = totalResult.count || 0;
    const archivedCalls = archivedResult.count || 0;
    const protectedCalls = protectedResult.count || 0;
    const oldestUnprotectedCall = oldestResult.data?.created_at || null;

    return {
      totalCalls,
      archivedCalls,
      protectedCalls,
      oldestUnprotectedCall,
    };
  } catch (error) {
    logger.error('Error getting archive stats', { error });
    return {
      totalCalls: 0,
      archivedCalls: 0,
      protectedCalls: 0,
      oldestUnprotectedCall: null,
    };
  }
}
