/**
 * Verify Seed Data
 * Checks if training_personas table contains the expected Principal Partner personas
 */

import { getSupabaseClientForEnv } from '../src/lib/env-manager';
import logger from '../src/lib/logger';

async function verifySeed(): Promise<void> {
  console.log('🔍 Verifying Sandbox seed data...\n');

  try {
    // Use LOCAL environment for verification (seed.sql runs on local)
    const supabase = getSupabaseClientForEnv('local');

    // Check training_personas table
    const { data: personas, error: personasError, count } = await supabase
      .from('training_personas')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (personasError) {
      console.error('❌ Error querying training_personas:', personasError.message);
      console.log('\n💡 The table may not exist. Run the seed script first.');
      process.exit(1);
    }

    const personaCount = count || personas?.length || 0;

    console.log(`📊 Training Personas: ${personaCount} found`);
    
    if (personaCount === 0) {
      console.log('\n⚠️  No personas found. Seed data has NOT been loaded.');
      console.log('💡 Run: npm run seed:sandbox');
      process.exit(1);
    }

    if (personaCount < 50) {
      console.log(`\n⚠️  Expected 50 personas, found ${personaCount}. Seed may be incomplete.`);
    } else {
      console.log('✅ All 50 Killer Personas found!');
    }

    // Check margin pressure traits
    const { data: marginData, error: marginError } = await supabase
      .from('training_personas')
      .select('negotiation_style, target_profit_zone, lowest_acceptable_price')
      .not('negotiation_style', 'is', null);

    if (!marginError && marginData) {
      const yellowZoneCount = marginData.filter((p: any) => p.target_profit_zone === 'yellow').length;
      const grinderCount = marginData.filter((p: any) => p.negotiation_style === 'grinder').length;
      const fairValueCount = marginData.filter((p: any) => p.negotiation_style === 'fair_value').length;
      
      console.log(`\n📊 Margin Pressure Traits:`);
      console.log(`   Yellow Zone Personas: ${yellowZoneCount} (target: 18, ${Math.round(yellowZoneCount/50*100)}%)`);
      console.log(`   Grinder Style: ${grinderCount}`);
      console.log(`   Fair Value Style: ${fairValueCount}`);
      
      if (yellowZoneCount >= 18) {
        console.log('   ✅ Yellow Zone coverage meets target (35%+)');
      }
    }

    // List persona names
    if (personas && personas.length > 0) {
      console.log('\n📋 Personas loaded:');
      personas.forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. ${p.name} (${p.difficulty_level})`);
      });
    }

    // Check golden_calls table
    const { data: goldenCalls, error: callsError, count: callsCount } = await supabase
      .from('golden_calls')
      .select('*', { count: 'exact' });

    if (!callsError) {
      console.log(`\n📊 Golden Calls: ${callsCount || goldenCalls?.length || 0} found`);
    }

    // Check market_benchmarks table
    const { data: benchmarks, error: benchmarksError, count: benchmarksCount } = await supabase
      .from('market_benchmarks')
      .select('*', { count: 'exact' });

    if (!benchmarksError) {
      console.log(`📊 Market Benchmarks: ${benchmarksCount || benchmarks?.length || 0} found`);
    }

    console.log('\n✅ Seed verification complete!');
    
    if (personaCount >= 50) {
      console.log('🎉 All 50 Killer Personas loaded! Sandbox is ready for tiered profit zone training!');
    } else if (personaCount >= 15) {
      console.log('🎉 Sandbox is ready for autonomous training!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { verifySeed };
