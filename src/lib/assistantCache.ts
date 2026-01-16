/**
 * VAPI Assistant Cache
 *
 * Caches VAPI assistants by configuration hash to avoid creating
 * duplicate assistants for identical configurations.
 *
 * Strategy:
 * 1. Generate a hash from cacheable configuration parameters
 * 2. Check if an assistant with that hash exists and is still valid
 * 3. If cached, use VAPI PATCH API to update dynamic content (sellerName, propertyAddress)
 * 4. If not cached, create new assistant and cache it
 *
 * Cacheable parameters (finite combinations):
 * - personaMode (acquisition, disposition)
 * - gauntletLevel (1-5 or null)
 * - difficulty (1-10, used when gauntletLevel is null)
 * - roleReversal (true, false)
 * - exitStrategy (fix_and_flip, buy_and_hold, creative_finance, null)
 * - propertyLocation (regional voice selection)
 * - apexLevel (standard, apex, battle-test)
 * - battleTestMode (true, false)
 *
 * Dynamic parameters (updated per-call via PATCH):
 * - sellerName
 * - propertyAddress
 * - neighborhoodContext
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from './supabase';
import logger from './logger';

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Maximum cache entries to prevent unbounded growth
const MAX_CACHE_ENTRIES = 500;

// Database row type for vapi_assistant_cache table
// (Table created via migration, not yet in generated Supabase types)
interface VapiAssistantCacheRow {
  id: string;
  assistant_id: string;
  config_hash: string;
  persona_mode: string;
  gauntlet_level: number | null;
  difficulty: number | null;
  role_reversal: boolean;
  exit_strategy: string | null;
  property_location: string | null;
  apex_level: string | null;
  battle_test_mode: boolean;
  created_at: string;
  last_used_at: string;
  use_count: number;
}

// Helper to get typed access to the cache table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCacheTable = () => supabaseAdmin?.from('vapi_assistant_cache' as any) as any;

export interface CacheableConfig {
  personaMode: 'acquisition' | 'disposition';
  gauntletLevel?: number | null;
  difficulty?: number | null;
  roleReversal?: boolean;
  exitStrategy?: string | null;
  propertyLocation?: string | null;
  apexLevel?: string | null;
  battleTestMode?: boolean;
}

export interface DynamicConfig {
  sellerName?: string;
  propertyAddress?: string;
  currentGate?: string;
  userId?: string;
}

export interface CachedAssistant {
  id: string;
  assistantId: string;
  configHash: string;
  personaMode: string;
  gauntletLevel: number | null;
  difficulty: number | null;
  roleReversal: boolean;
  exitStrategy: string | null;
  propertyLocation: string | null;
  apexLevel: string | null;
  battleTestMode: boolean;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
}

/**
 * Generate a deterministic hash from cacheable configuration
 */
export function generateConfigHash(config: CacheableConfig): string {
  // Normalize and sort config for consistent hashing
  const normalizedConfig = {
    personaMode: config.personaMode,
    gauntletLevel: config.gauntletLevel ?? null,
    difficulty: config.gauntletLevel ? null : (config.difficulty ?? null),
    roleReversal: config.roleReversal ?? false,
    exitStrategy: config.exitStrategy ?? null,
    // Normalize property location to region code for voice selection
    propertyLocation: normalizePropertyLocation(config.propertyLocation),
    apexLevel: config.apexLevel ?? 'standard',
    battleTestMode: config.battleTestMode ?? false,
  };

  const configString = JSON.stringify(normalizedConfig, Object.keys(normalizedConfig).sort());
  return createHash('sha256').update(configString).digest('hex').substring(0, 16);
}

/**
 * Normalize property location to a region code for consistent caching
 * This ensures "Dallas, TX" and "Dallas, Texas" map to the same cache entry
 */
function normalizePropertyLocation(location: string | null | undefined): string | null {
  if (!location) return null;

  const locationLower = location.toLowerCase();

  // Map to regional voice codes (based on voiceRegions.ts)
  if (locationLower.includes('texas') || locationLower.includes('tx') ||
      locationLower.includes('oklahoma') || locationLower.includes('ok')) {
    return 'southwest';
  }
  if (locationLower.includes('california') || locationLower.includes('ca') ||
      locationLower.includes('nevada') || locationLower.includes('nv') ||
      locationLower.includes('arizona') || locationLower.includes('az')) {
    return 'west';
  }
  if (locationLower.includes('florida') || locationLower.includes('fl') ||
      locationLower.includes('georgia') || locationLower.includes('ga') ||
      locationLower.includes('carolina')) {
    return 'southeast';
  }
  if (locationLower.includes('new york') || locationLower.includes('ny') ||
      locationLower.includes('new jersey') || locationLower.includes('nj') ||
      locationLower.includes('pennsylvania') || locationLower.includes('pa')) {
    return 'northeast';
  }
  if (locationLower.includes('illinois') || locationLower.includes('il') ||
      locationLower.includes('ohio') || locationLower.includes('oh') ||
      locationLower.includes('michigan') || locationLower.includes('mi')) {
    return 'midwest';
  }

  // Default region
  return 'default';
}

/**
 * Look up a cached assistant by configuration hash
 */
export async function getCachedAssistant(configHash: string): Promise<CachedAssistant | null> {
  if (!supabaseAdmin) {
    logger.warn('Supabase admin client not available for cache lookup');
    return null;
  }

  try {
    const { data, error } = await getCacheTable()
      .select('*')
      .eq('config_hash', configHash)
      .single();

    if (error || !data) {
      return null;
    }

    const cacheEntry = data as VapiAssistantCacheRow;

    // Check if cache entry is still valid (within TTL)
    const createdAt = new Date(cacheEntry.created_at).getTime();
    const now = Date.now();

    if (now - createdAt > CACHE_TTL_MS) {
      logger.info('Cache entry expired', { configHash, ageHours: ((now - createdAt) / (60 * 60 * 1000)).toFixed(1) });
      // Don't delete here - let cleanup job handle it
      return null;
    }

    // Update last_used_at and use_count
    await getCacheTable()
      .update({
        last_used_at: new Date().toISOString(),
        use_count: (cacheEntry.use_count || 0) + 1,
      })
      .eq('id', cacheEntry.id);

    return {
      id: cacheEntry.id,
      assistantId: cacheEntry.assistant_id,
      configHash: cacheEntry.config_hash,
      personaMode: cacheEntry.persona_mode,
      gauntletLevel: cacheEntry.gauntlet_level,
      difficulty: cacheEntry.difficulty,
      roleReversal: cacheEntry.role_reversal,
      exitStrategy: cacheEntry.exit_strategy,
      propertyLocation: cacheEntry.property_location,
      apexLevel: cacheEntry.apex_level,
      battleTestMode: cacheEntry.battle_test_mode,
      createdAt: cacheEntry.created_at,
      lastUsedAt: cacheEntry.last_used_at,
      useCount: cacheEntry.use_count,
    };
  } catch (error) {
    logger.error('Error looking up cached assistant', { error, configHash });
    return null;
  }
}

/**
 * Cache a newly created assistant
 */
export async function cacheAssistant(
  assistantId: string,
  config: CacheableConfig,
  configHash: string
): Promise<void> {
  if (!supabaseAdmin) {
    logger.warn('Supabase admin client not available for caching');
    return;
  }

  try {
    // Check cache size and cleanup if needed
    const { count } = await getCacheTable()
      .select('*', { count: 'exact', head: true });

    if (count && count >= MAX_CACHE_ENTRIES) {
      await cleanupOldestEntries(Math.floor(MAX_CACHE_ENTRIES * 0.1)); // Remove 10%
    }

    // Insert new cache entry
    const { error } = await getCacheTable()
      .upsert({
        assistant_id: assistantId,
        config_hash: configHash,
        persona_mode: config.personaMode,
        gauntlet_level: config.gauntletLevel ?? null,
        difficulty: config.difficulty ?? null,
        role_reversal: config.roleReversal ?? false,
        exit_strategy: config.exitStrategy ?? null,
        property_location: normalizePropertyLocation(config.propertyLocation),
        apex_level: config.apexLevel ?? 'standard',
        battle_test_mode: config.battleTestMode ?? false,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        use_count: 1,
      }, {
        onConflict: 'config_hash',
      });

    if (error) {
      logger.error('Error caching assistant', { error, configHash });
    } else {
      logger.info('Assistant cached successfully', { assistantId, configHash });
    }
  } catch (error) {
    logger.error('Error caching assistant', { error, configHash });
  }
}

/**
 * Remove oldest cache entries by last_used_at
 */
async function cleanupOldestEntries(count: number): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    // Get oldest entries
    const { data: oldestEntries } = await getCacheTable()
      .select('id')
      .order('last_used_at', { ascending: true })
      .limit(count);

    if (oldestEntries && oldestEntries.length > 0) {
      const idsToDelete = (oldestEntries as { id: string }[]).map(e => e.id);
      await getCacheTable()
        .delete()
        .in('id', idsToDelete);

      logger.info('Cleaned up old cache entries', { count: idsToDelete.length });
    }
  } catch (error) {
    logger.error('Error cleaning up cache entries', { error });
  }
}

/**
 * Remove expired cache entries (older than TTL)
 */
export async function cleanupExpiredEntries(): Promise<number> {
  if (!supabaseAdmin) return 0;

  try {
    const expiryDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    const { data, error } = await getCacheTable()
      .delete()
      .lt('created_at', expiryDate)
      .select('id');

    if (error) {
      logger.error('Error cleaning up expired entries', { error });
      return 0;
    }

    const deletedCount = (data as { id: string }[] | null)?.length || 0;
    if (deletedCount > 0) {
      logger.info('Cleaned up expired cache entries', { count: deletedCount });
    }
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired entries', { error });
    return 0;
  }
}

/**
 * Verify a cached assistant still exists in VAPI
 */
export async function verifyCachedAssistant(assistantId: string): Promise<boolean> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;
  if (!vapiSecretKey) return false;

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    logger.error('Error verifying cached assistant', { error, assistantId });
    return false;
  }
}

/**
 * Update a cached assistant's dynamic content via VAPI PATCH API
 * This allows reusing assistants while customizing per-call content
 */
export async function updateAssistantDynamicContent(
  assistantId: string,
  dynamicConfig: DynamicConfig,
  baseSystemPrompt: string
): Promise<boolean> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;
  if (!vapiSecretKey) return false;

  try {
    // Build updated system prompt with dynamic content
    let updatedPrompt = baseSystemPrompt;

    if (dynamicConfig.sellerName) {
      updatedPrompt = updatedPrompt.replace(/\{SELLER_NAME\}/g, dynamicConfig.sellerName);
      updatedPrompt = updatedPrompt.replace(/the seller/gi, dynamicConfig.sellerName);
    }

    if (dynamicConfig.propertyAddress) {
      updatedPrompt = updatedPrompt.replace(/\{PROPERTY_ADDRESS\}/g, dynamicConfig.propertyAddress);
    }

    // Update first message with seller name if provided
    let firstMessage: string | undefined;
    if (dynamicConfig.sellerName) {
      firstMessage = `Hi ${dynamicConfig.sellerName}, this is... how are you doing today?`;
    }

    const updatePayload: any = {
      model: {
        messages: [
          {
            role: 'system',
            content: updatedPrompt,
          },
        ],
      },
    };

    if (firstMessage) {
      updatePayload.firstMessage = firstMessage;
    }

    // Update metadata with userId if provided
    if (dynamicConfig.userId) {
      updatePayload.metadata = {
        userId: dynamicConfig.userId,
      };
    }

    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to update assistant dynamic content', {
        assistantId,
        status: response.status,
        error: errorText,
      });
      return false;
    }

    logger.info('Updated assistant dynamic content', { assistantId });
    return true;
  } catch (error) {
    logger.error('Error updating assistant dynamic content', { error, assistantId });
    return false;
  }
}

/**
 * Invalidate a specific cache entry
 */
export async function invalidateCacheEntry(configHash: string): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    await getCacheTable()
      .delete()
      .eq('config_hash', configHash);

    logger.info('Cache entry invalidated', { configHash });
  } catch (error) {
    logger.error('Error invalidating cache entry', { error, configHash });
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  hitRate: number;
  avgUseCount: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}> {
  if (!supabaseAdmin) {
    return {
      totalEntries: 0,
      hitRate: 0,
      avgUseCount: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  try {
    const { data, count } = await getCacheTable()
      .select('use_count, created_at', { count: 'exact' })
      .order('created_at', { ascending: true });

    const entries = data as { use_count: number; created_at: string }[] | null;

    if (!entries || entries.length === 0) {
      return {
        totalEntries: 0,
        hitRate: 0,
        avgUseCount: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const totalUseCount = entries.reduce((sum, entry) => sum + (entry.use_count || 0), 0);
    const avgUseCount = totalUseCount / entries.length;

    // Hit rate: entries with use_count > 1 vs total
    const entriesWithReuse = entries.filter(e => (e.use_count || 0) > 1).length;
    const hitRate = entriesWithReuse / entries.length;

    return {
      totalEntries: count || entries.length,
      hitRate,
      avgUseCount,
      oldestEntry: entries[0]?.created_at || null,
      newestEntry: entries[entries.length - 1]?.created_at || null,
    };
  } catch (error) {
    logger.error('Error getting cache stats', { error });
    return {
      totalEntries: 0,
      hitRate: 0,
      avgUseCount: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}
