/**
 * Sync training_personas to sandbox_personas
 * Ensures all personas are available in sandbox_personas for battle training
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getSupabaseClientForEnv } from '../src/lib/env-manager';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

const syncSQL = `
-- Sync training_personas to sandbox_personas
INSERT INTO sandbox_personas (name, description, persona_type, system_prompt, characteristics, attack_patterns, is_active)
SELECT 
  tp.name,
  tp.archetype || ' - ' || array_to_string(tp.pain_points, ', '),
  tp.archetype,
  tp.system_prompt,
  to_jsonb(tp.personality_traits),
  to_jsonb(tp.attack_patterns),
  tp.is_active
FROM training_personas tp
WHERE NOT EXISTS (
  SELECT 1 FROM sandbox_personas sp WHERE sp.name = tp.name
);
`;

async function syncPersonas() {
  console.log('🔄 Syncing training_personas to sandbox_personas...\n');
  
  const supabase = getSupabaseClientForEnv('sandbox');
  
  // Check current counts
  const { count: trainingCount } = await supabase
    .from('training_personas')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: sandboxCount } = await supabase
    .from('sandbox_personas')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log(`📊 Current counts:`);
  console.log(`   training_personas: ${trainingCount || 0}`);
  console.log(`   sandbox_personas: ${sandboxCount || 0}\n`);
  
  // Execute sync via RPC or direct SQL
  // Since Supabase REST API doesn't support arbitrary SQL, we'll use a workaround
  // We'll fetch training_personas and insert into sandbox_personas
  
  const { data: trainingPersonas, error: fetchError } = await supabase
    .from('training_personas')
    .select('*')
    .eq('is_active', true);
  
  if (fetchError) {
    console.error('❌ Error fetching training_personas:', fetchError.message);
    process.exit(1);
  }
  
  if (!trainingPersonas || trainingPersonas.length === 0) {
    console.log('⚠️  No training_personas found');
    process.exit(1);
  }
  
  console.log(`📝 Syncing ${trainingPersonas.length} personas...\n`);
  
  let synced = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const tp of trainingPersonas) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('sandbox_personas')
      .select('id')
      .eq('name', tp.name)
      .single();
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Insert new persona
    const { error: insertError } = await supabase
      .from('sandbox_personas')
      .insert({
        name: tp.name,
        description: `${tp.archetype} - ${Array.isArray(tp.pain_points) ? tp.pain_points.join(', ') : ''}`,
        persona_type: tp.archetype,
        system_prompt: tp.system_prompt || '',
        characteristics: Array.isArray(tp.personality_traits) ? tp.personality_traits : [],
        attack_patterns: Array.isArray(tp.attack_patterns) ? tp.attack_patterns : [],
        is_active: tp.is_active,
      });
    
    if (insertError) {
      console.error(`   ❌ Error syncing ${tp.name}: ${insertError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Synced: ${tp.name}`);
      synced++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Sync complete!`);
  console.log(`   Synced: ${synced}`);
  console.log(`   Skipped (already exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Verify final count
  const { count: finalCount } = await supabase
    .from('sandbox_personas')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log(`📊 Final sandbox_personas count: ${finalCount || 0}\n`);
}

syncPersonas().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
