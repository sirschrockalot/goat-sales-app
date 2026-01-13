/**
 * Check Training Data
 * Verifies personas and battles exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
  });

  return env;
}

const env = loadEnvFile();
const supabaseUrl = process.env.SUPABASE_SANDBOX_URL || 
                    env.SUPABASE_SANDBOX_URL || 
                    process.env.SANDBOX_SUPABASE_URL ||
                    env.SANDBOX_SUPABASE_URL ||
                    process.env.NEXT_PUBLIC_SUPABASE_URL ||
                    env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceKey = process.env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY || 
                           env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY ||
                           process.env.SUPABASE_SERVICE_ROLE_KEY ||
                           env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTrainingData() {
  console.log('🔍 Checking Training Data\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check personas
  console.log('👥 Checking Sandbox Personas');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: personas, error: personasError, count: personaCount } = await supabase
    .from('sandbox_personas')
    .select('id, name, persona_type, is_active', { count: 'exact' })
    .limit(20);

  if (personasError) {
    console.error('   ❌ Error fetching personas:', personasError.message);
    if (personasError.message.includes('does not exist') || personasError.code === 'PGRST116') {
      console.log('   ⚠️  sandbox_personas table does not exist!');
      console.log('   💡 Run migrations to create the table');
    }
  } else {
    const activePersonas = personas?.filter(p => p.is_active) || [];
    console.log(`   Total Personas: ${personaCount || personas?.length || 0}`);
    console.log(`   Active Personas: ${activePersonas.length}`);
    
    if (activePersonas.length === 0) {
      console.log('   🚨 NO ACTIVE PERSONAS FOUND!');
      console.log('   ⚠️  Training cannot run without active personas');
      console.log('   💡 Create personas or activate existing ones');
    } else {
      console.log('\n   Sample active personas:');
      activePersonas.slice(0, 5).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name} (${p.persona_type})`);
      });
    }
  }
  console.log('');

  // Check battles
  console.log('🎯 Checking Sandbox Battles');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: battles, error: battlesError, count: battleCount } = await supabase
    .from('sandbox_battles')
    .select('id, persona_id, referee_score, cost_usd, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (battlesError) {
    console.error('   ❌ Error fetching battles:', battlesError.message);
    if (battlesError.message.includes('does not exist') || battlesError.code === 'PGRST116') {
      console.log('   ⚠️  sandbox_battles table does not exist!');
      console.log('   💡 Run migrations to create the table');
    }
  } else {
    console.log(`   Total Battles: ${battleCount || battles?.length || 0}`);
    
    if (!battles || battles.length === 0) {
      console.log('   ⚠️  NO BATTLES FOUND!');
      console.log('   💡 This could mean:');
      console.log('      1. Training hasn\'t run yet');
      console.log('      2. Training is running but battles aren\'t completing');
      console.log('      3. Battles are failing before being saved');
    } else {
      console.log('\n   Recent battles:');
      battles.forEach((b, i) => {
        const timeAgo = new Date(b.created_at);
        const now = new Date();
        const minutesAgo = Math.floor((now.getTime() - timeAgo.getTime()) / 60000);
        console.log(`      ${i + 1}. Score: ${b.referee_score || 'N/A'} | Cost: $${(b.cost_usd || 0).toFixed(4)} | ${minutesAgo}m ago`);
      });
    }
  }
  console.log('');

  // Check today's battles
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const { data: todayBattles, count: todayCount } = await supabase
    .from('sandbox_battles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart);

  console.log('📅 Today\'s Battles');
  console.log('─────────────────────────────────────────────────────\n');
  console.log(`   Battles Today: ${todayCount || 0}`);
  console.log('');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary');
  console.log('─────────────────────────────────────────────────────\n');

  const hasPersonas = (personaCount || 0) > 0;
  const hasActivePersonas = (personas?.filter(p => p.is_active).length || 0) > 0;
  const hasBattles = (battleCount || 0) > 0;
  const hasTodayBattles = (todayCount || 0) > 0;

  console.log(`   Personas: ${hasPersonas ? '✅' : '❌'} ${personaCount || 0} total`);
  console.log(`   Active Personas: ${hasActivePersonas ? '✅' : '❌'} ${personas?.filter(p => p.is_active).length || 0}`);
  console.log(`   Total Battles: ${hasBattles ? '✅' : '❌'} ${battleCount || 0}`);
  console.log(`   Today's Battles: ${hasTodayBattles ? '✅' : '❌'} ${todayCount || 0}`);
  console.log('');

  if (!hasActivePersonas) {
    console.log('🚨 ISSUE: No active personas found!');
    console.log('   Training cannot run without active personas.');
    console.log('   Solution: Create or activate personas in sandbox_personas table');
  } else if (!hasTodayBattles && hasBattles) {
    console.log('⚠️  ISSUE: Training ran but no battles today!');
    console.log('   This could mean:');
    console.log('   1. Training is running but battles are failing');
    console.log('   2. Battles are completing but not being saved');
    console.log('   3. Check Heroku logs for errors');
  } else if (!hasBattles) {
    console.log('⚠️  ISSUE: No battles found at all!');
    console.log('   Training may not have run successfully.');
    console.log('   Check Heroku logs for errors.');
  } else {
    console.log('✅ Training data looks good!');
  }
  console.log('');
}

checkTrainingData().catch(console.error);
