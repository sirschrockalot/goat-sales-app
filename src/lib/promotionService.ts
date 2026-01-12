/**
 * Promotion Service
 * Flags high-score battles and promotes winning tactics to production
 * Tactical Promotion Hook: Points to Goat Sales App-Prod for immediate production updates
 */

import { getSupabaseClientForEnv, getEnvironmentConfig } from './env-manager';
import logger from './logger';
import * as fs from 'fs-extra';
import * as path from 'path';

const HIGH_SCORE_THRESHOLD = 90; // Score > 90 is considered "high-score"
const GOLDEN_SAMPLE_THRESHOLD = 95; // Score > 95 is considered "Golden Sample"

interface HighScoreBattle {
  id: string;
  persona_id: string;
  persona_name: string;
  referee_score: number;
  winning_rebuttal: string | null;
  transcript: string;
  math_defense_score: number;
  humanity_score: number;
  success_score: number;
  verbal_yes_to_memorandum: boolean;
}

interface Tactic {
  id: string;
  battle_id: string;
  tactic_text: string;
  is_synthetic: boolean;
  priority: number;
  promoted_at: string;
}

/**
 * Get golden samples (score > 95) - automatically suggested for promotion
 */
export async function getGoldenSamples(): Promise<HighScoreBattle[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: battles, error } = await supabaseAdmin
    .from('sandbox_battles')
    .select(`
      id,
      persona_id,
      referee_score,
      winning_rebuttal,
      transcript,
      math_defense_score,
      humanity_score,
      success_score,
      verbal_yes_to_memorandum,
      sandbox_personas!inner(name)
    `)
    .gt('referee_score', GOLDEN_SAMPLE_THRESHOLD)
    .order('referee_score', { ascending: false });

  if (error) {
    logger.error('Error fetching golden samples', { error });
    throw error;
  }

  return (battles || []).map((battle: any) => ({
    id: battle.id,
    persona_id: battle.persona_id,
    persona_name: battle.sandbox_personas?.name || 'Unknown',
    referee_score: battle.referee_score,
    winning_rebuttal: battle.winning_rebuttal,
    transcript: battle.transcript,
    math_defense_score: battle.math_defense_score,
    humanity_score: battle.humanity_score,
    success_score: battle.success_score,
    verbal_yes_to_memorandum: battle.verbal_yes_to_memorandum,
  }));
}

/**
 * Get high-score battles (score > 90)
 */
export async function getHighScoreBattles(): Promise<HighScoreBattle[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: battles, error } = await supabaseAdmin
    .from('sandbox_battles')
    .select(`
      id,
      persona_id,
      referee_score,
      winning_rebuttal,
      transcript,
      math_defense_score,
      humanity_score,
      success_score,
      verbal_yes_to_memorandum,
      sandbox_personas!inner(name)
    `)
    .gt('referee_score', HIGH_SCORE_THRESHOLD)
    .order('referee_score', { ascending: false });

  if (error) {
    logger.error('Error fetching high-score battles', { error });
    throw error;
  }

  return (battles || []).map((battle: any) => ({
    id: battle.id,
    persona_id: battle.persona_id,
    persona_name: battle.sandbox_personas?.name || 'Unknown',
    referee_score: battle.referee_score,
    winning_rebuttal: battle.winning_rebuttal,
    transcript: battle.transcript,
    math_defense_score: battle.math_defense_score,
    humanity_score: battle.humanity_score,
    success_score: battle.success_score,
    verbal_yes_to_memorandum: battle.verbal_yes_to_memorandum,
  }));
}

/**
 * Extract winning rebuttal from a battle
 */
export function extractWinningRebuttal(battle: HighScoreBattle): string | null {
  if (battle.winning_rebuttal) {
    return battle.winning_rebuttal;
  }

  // If no explicit winning rebuttal, try to extract from transcript
  // Look for the moment where the persona agrees or the closer overcomes an objection
  const transcript = battle.transcript;
  const closerMessages = transcript
    .split('\n\n')
    .filter((line) => line.startsWith('CLOSER:'))
    .map((line) => line.replace('CLOSER:', '').trim());

  // Find the rebuttal that likely won (usually near the end, before agreement)
  if (closerMessages.length > 0) {
    // Return the last 2-3 closer messages as they likely contain the winning move
    const lastMessages = closerMessages.slice(-3).join(' ');
    return lastMessages.length > 500 ? lastMessages.substring(0, 500) + '...' : lastMessages;
  }

  return null;
}

/**
 * Promote a tactic to production
 * Appends the winning tactic to production_base_prompt.txt with synthetic tags
 * Tactical Promotion Hook: Updates PROD Supabase immediately when "Blessed"
 */
export async function promoteTactic(tacticId: string): Promise<void> {
  const envConfig = getEnvironmentConfig();
  const { supabaseAdmin } = await import('./supabase');
  
  // Use PROD Supabase for promotion (Tactical Promotion Hook)
  const prodSupabase = getSupabaseClientForEnv('prod');
  const sandboxSupabase = supabaseAdmin || getSupabaseClientForEnv('sandbox');

  if (!sandboxSupabase) {
    throw new Error('Sandbox Supabase client not available');
  }

  // Get tactic from SANDBOX database
  const { data: tactic, error: tacticError } = await sandboxSupabase
    .from('sandbox_tactics')
    .select('*, sandbox_battles!inner(*)')
    .eq('id', tacticId)
    .single();

  if (tacticError || !tactic) {
    throw new Error(`Tactic not found: ${tacticId}`);
  }

  // Get base prompt file
  const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
  if (!(await fs.pathExists(basePromptPath))) {
    throw new Error('base_prompt.txt not found. Cannot promote tactic.');
  }

  const basePrompt = await fs.readFile(basePromptPath, 'utf-8');

  // Append tactic with synthetic tags
  const tacticSection = `

# SYNTHETIC TACTIC (AUTO-PROMOTED FROM SANDBOX)
# is_synthetic: true
# priority: ${tactic.priority}
# promoted_at: ${tactic.promoted_at}
# battle_id: ${tactic.battle_id}

${tactic.tactic_text}

# END SYNTHETIC TACTIC
`;

  const updatedPrompt = basePrompt + tacticSection;

  // Write back to file (local/version control)
  await fs.writeFile(basePromptPath, updatedPrompt, 'utf-8');

  // TACTICAL PROMOTION HOOK: Update PROD Supabase immediately
  // Store promoted tactic in PROD database for immediate production use
  try {
    const { error: prodError } = await prodSupabase
      .from('sandbox_tactics')
      .upsert({
        id: tactic.id,
        battle_id: tactic.battle_id,
        tactic_text: tactic.tactic_text,
        is_synthetic: true,
        priority: tactic.priority,
        is_active: true,
        promoted_at: new Date().toISOString(),
        // Store in PROD for immediate production system access
        metadata: {
          promoted_from: 'sandbox',
          promoted_at: new Date().toISOString(),
          environment: 'prod',
        },
      }, {
        onConflict: 'id',
      });

    if (prodError) {
      logger.error('Error promoting tactic to PROD Supabase', { error: prodError });
      // Continue even if PROD update fails - file was updated
    } else {
      logger.info('✅ Tactic promoted to PROD Supabase (Goat Sales App-Prod)', {
        tacticId,
        prodProject: envConfig.supabase.projectName,
      });
    }
  } catch (error) {
    logger.error('Error updating PROD Supabase', { error });
    // Continue even if PROD update fails - file was updated
  }

  // Mark tactic as promoted in SANDBOX database
  const { error: updateError } = await (sandboxSupabase as any)
    .from('sandbox_tactics')
    .update({ is_active: true } as any)
    .eq('id', tacticId);

  if (updateError) {
    logger.error('Error updating tactic status in SANDBOX', { error: updateError });
    // Don't throw - the file and PROD were updated, just log the DB error
  }

  logger.info('Tactic promoted to production', {
    tacticId,
    battleId: tactic.battle_id,
    priority: tactic.priority,
    prodUpdated: true,
  });
}

/**
 * Flag high-score battles and extract tactics
 */
export async function flagHighScoreBattles(): Promise<Tactic[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    throw new Error('Database not available');
  }

  const highScoreBattles = await getHighScoreBattles();
  logger.info('Found high-score battles', { count: highScoreBattles.length });

  const tactics: Tactic[] = [];

  for (const battle of highScoreBattles) {
    const winningRebuttal = extractWinningRebuttal(battle);

    if (!winningRebuttal) {
      logger.warn('No winning rebuttal found for battle', { battleId: battle.id });
      continue;
    }

    // Check if tactic already exists for this battle
    const { data: existingTactic } = await supabaseAdmin
      .from('sandbox_tactics')
      .select('id')
      .eq('battle_id', battle.id)
      .single();

    if (existingTactic) {
      logger.info('Tactic already exists for battle', { battleId: battle.id });
      continue;
    }

    // Create tactic record
    const { data: tactic, error: tacticError } = await (supabaseAdmin as any)
      .from('sandbox_tactics')
      .insert({
        battle_id: battle.id,
        tactic_text: winningRebuttal,
        is_synthetic: true,
        priority: 5, // Default priority for Prompt Merger
        is_active: false, // Not promoted yet
      } as any)
      .select()
      .single();

    if (tacticError) {
      logger.error('Error creating tactic', { battleId: battle.id, error: tacticError });
      continue;
    }

    tactics.push({
      id: tactic.id,
      battle_id: tactic.battle_id,
      tactic_text: tactic.tactic_text,
      is_synthetic: tactic.is_synthetic,
      priority: tactic.priority,
      promoted_at: tactic.promoted_at,
    });

    logger.info('Tactic extracted and flagged', {
      tacticId: tactic.id,
      battleId: battle.id,
      score: battle.referee_score,
    });
  }

  return tactics;
}

/**
 * Auto-save golden samples (score > 95) for promotion
 */
export async function autoSaveGoldenSamples(): Promise<{
  saved: number;
  suggested: number;
}> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Get golden samples
  const goldenSamples = await getGoldenSamples();
  logger.info('Found golden samples', { count: goldenSamples.length });

  let saved = 0;
  let suggested = 0;

  for (const battle of goldenSamples) {
    const winningRebuttal = extractWinningRebuttal(battle);

    if (!winningRebuttal) {
      logger.warn('No winning rebuttal found for golden sample', { battleId: battle.id });
      continue;
    }

    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from('sandbox_tactics')
      .select('id')
      .eq('battle_id', battle.id)
      .single();

    if (existing) {
      continue; // Already saved
    }

    // Save as golden sample with higher priority
    const { data: tactic, error: tacticError } = await (supabaseAdmin as any)
      .from('sandbox_tactics')
      .insert({
        battle_id: battle.id,
        tactic_text: winningRebuttal,
        is_synthetic: true,
        priority: 8, // Higher priority for golden samples (out of 10)
        is_active: false, // Not auto-promoted, needs review
        is_golden_sample: true,
        suggested_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (tacticError) {
      logger.error('Error saving golden sample', { battleId: battle.id, error: tacticError });
      continue;
    }

    saved++;
    suggested++;

    logger.info('Golden sample saved', {
      tacticId: tactic.id,
      battleId: battle.id,
      score: battle.referee_score,
      priority: 8,
    });
  }

  logger.info('Golden sample auto-save complete', {
    saved,
    suggested,
  });

  return {
    saved,
    suggested,
  };
}

/**
 * Auto-promote tactics from high-score battles
 * This can be run periodically to promote winning tactics
 */
export async function autoPromoteHighScoreTactics(): Promise<{
  flagged: number;
  promoted: number;
}> {
  // First, auto-save golden samples
  const goldenResult = await autoSaveGoldenSamples();
  logger.info('Golden samples processed', goldenResult);

  // Then, flag high-score battles
  const tactics = await flagHighScoreBattles();
  logger.info('Flagged tactics from high-score battles', { count: tactics.length });

  // Then, promote them (you might want to add manual review here)
  let promoted = 0;
  for (const tactic of tactics) {
    try {
      await promoteTactic(tactic.id);
      promoted++;
    } catch (error) {
      logger.error('Error promoting tactic', { tacticId: tactic.id, error });
    }
  }

  logger.info('Auto-promotion complete', {
    flagged: tactics.length,
    promoted,
    goldenSamples: goldenResult.saved,
  });

  return {
    flagged: tactics.length,
    promoted,
  };
}

/**
 * Get all promoted tactics
 */
export async function getPromotedTactics(): Promise<Tactic[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: tactics, error } = await supabaseAdmin
    .from('sandbox_tactics')
    .select('*')
    .eq('is_active', true)
    .order('promoted_at', { ascending: false });

  if (error) {
    logger.error('Error fetching promoted tactics', { error });
    throw error;
  }

  return (tactics || []) as Tactic[];
}

/**
 * Get tactics ready for promotion (high-score battles, not yet promoted)
 */
export async function getTacticsReadyForPromotion(): Promise<Tactic[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: tactics, error } = await supabaseAdmin
    .from('sandbox_tactics')
    .select('*, sandbox_battles!inner(referee_score)')
    .eq('is_active', false)
    .gt('sandbox_battles.referee_score', HIGH_SCORE_THRESHOLD)
    .order('sandbox_battles.referee_score', { ascending: false });

  if (error) {
    logger.error('Error fetching tactics ready for promotion', { error });
    throw error;
  }

  return (tactics || []) as Tactic[];
}
