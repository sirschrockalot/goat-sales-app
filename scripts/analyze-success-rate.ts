/**
 * Analyze why success rate is 0%
 * Checks verbal_yes_to_memorandum values in recent battles
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

async function analyzeSuccessRate() {
  console.log('📊 Analyzing Success Rate (0% Issue)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const supabase = getSupabaseClientForEnv('sandbox');
  
  // Check recent battles
  const { data: battles, error } = await supabase
    .from('sandbox_battles')
    .select('id, referee_score, verbal_yes_to_memorandum, success_score, created_at, persona_id')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  if (!battles || battles.length === 0) {
    console.log('⚠️  No battles found');
    process.exit(1);
  }
  
  console.log(`Total battles analyzed: ${battles.length}\n`);
  
  const verbalYesCount = battles.filter(b => b.verbal_yes_to_memorandum).length;
  const avgScore = battles.reduce((sum, b) => sum + (b.referee_score || 0), 0) / battles.length;
  const avgSuccessScore = battles.reduce((sum, b) => sum + (b.success_score || 0), 0) / battles.length;
  
  console.log('📈 Overall Statistics:');
  console.log(`   Verbal Yes Count: ${verbalYesCount} of ${battles.length}`);
  console.log(`   Success Rate: ${((verbalYesCount / battles.length) * 100).toFixed(1)}%`);
  console.log(`   Average Referee Score: ${avgScore.toFixed(1)}/100`);
  console.log(`   Average Success Score: ${avgSuccessScore.toFixed(1)}/10\n`);
  
  // Check by persona
  const personaMap = new Map<string, any[]>();
  battles.forEach(b => {
    const personaId = b.persona_id;
    if (!personaMap.has(personaId)) {
      personaMap.set(personaId, []);
    }
    personaMap.get(personaId)!.push(b);
  });
  
  console.log('👥 Per-Persona Breakdown:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Get persona names
  const personaIds = Array.from(personaMap.keys());
  const { data: personas } = await supabase
    .from('sandbox_personas')
    .select('id, name')
    .in('id', personaIds);
  
  const personaNameMap = new Map((personas || []).map(p => [p.id, p.name]));
  
  for (const [personaId, personaBattles] of personaMap.entries()) {
    const personaName = personaNameMap.get(personaId) || 'Unknown';
    const verbalYes = personaBattles.filter(b => b.verbal_yes_to_memorandum).length;
    const personaSuccessRate = (verbalYes / personaBattles.length) * 100;
    const personaAvgScore = personaBattles.reduce((sum, b) => sum + (b.referee_score || 0), 0) / personaBattles.length;
    const personaAvgSuccess = personaBattles.reduce((sum, b) => sum + (b.success_score || 0), 0) / personaBattles.length;
    
    console.log(`📌 ${personaName}:`);
    console.log(`   Battles: ${personaBattles.length}`);
    console.log(`   Verbal Yes: ${verbalYes} (${personaSuccessRate.toFixed(1)}%)`);
    console.log(`   Avg Score: ${personaAvgScore.toFixed(1)}/100`);
    console.log(`   Avg Success Score: ${personaAvgSuccess.toFixed(1)}/10`);
    console.log('');
  }
  
  // Show sample battles
  console.log('📋 Sample Recent Battles:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  battles.slice(0, 10).forEach((b, i) => {
    const personaName = personaNameMap.get(b.persona_id) || 'Unknown';
    console.log(`${i + 1}. ${personaName}`);
    console.log(`   Score: ${b.referee_score || 0}/100`);
    console.log(`   Success Score: ${b.success_score || 0}/10`);
    console.log(`   Verbal Yes: ${b.verbal_yes_to_memorandum ? '✅ YES' : '❌ NO'}`);
    console.log(`   Created: ${new Date(b.created_at).toLocaleString()}`);
    console.log('');
  });
  
  // Analysis
  console.log('🔍 Analysis:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (verbalYesCount === 0) {
    console.log('❌ ROOT CAUSE: No battles have verbal_yes_to_memorandum = true');
    console.log('');
    console.log('Possible reasons:');
    console.log('1. AI is not successfully getting verbal agreement to Clause 17');
    console.log('2. Referee is too strict in determining what counts as "verbal yes"');
    console.log('3. AI is not explicitly asking for agreement to the Memorandum');
    console.log('4. Personas are too difficult and not agreeing to terms');
    console.log('5. Referee prompt may need adjustment to better detect verbal agreement');
    console.log('');
    console.log('💡 Recommendations:');
    console.log('   - Review referee feedback in recent battles');
    console.log('   - Check if AI is mentioning Clause 17/Memorandum in transcripts');
    console.log('   - Consider adjusting success criteria (e.g., use success_score >= 7 instead)');
    console.log('   - Review referee prompt to ensure it can detect implicit agreement');
  } else {
    console.log(`✅ Some battles have verbal yes (${verbalYesCount} of ${battles.length})`);
    console.log('   Success rate is low but not zero - AI is making progress');
  }
}

analyzeSuccessRate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
