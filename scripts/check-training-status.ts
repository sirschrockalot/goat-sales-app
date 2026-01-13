/**
 * Quick Training Status Check
 * Shows current training status, budget, and recent activity
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

async function getTodaySpend(): Promise<number> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const { data, error } = await supabase
    .from('billing_logs')
    .select('cost')
    .eq('env', 'sandbox')
    .gte('created_at', todayStart);

  if (error) {
    return 0;
  }

  return (data || []).reduce((sum, log) => sum + (parseFloat(log.cost) || 0), 0);
}

async function getRecentBattles(limit: number = 10) {
  const { data, error } = await supabase
    .from('sandbox_battles')
    .select('id, persona_id, referee_score, cost_usd, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data || [];
}

async function checkTrainingStatus() {
  console.log('📊 Training Status Check\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Budget Status
  const todaySpend = await getTodaySpend();
  const dailyCap = 15.0;
  const remaining = Math.max(0, dailyCap - todaySpend);
  const percentageUsed = (todaySpend / dailyCap) * 100;
  const isThrottled = todaySpend >= 3.0;
  const isExceeded = todaySpend >= dailyCap;

  console.log('💰 Budget Status');
  console.log('─────────────────────────────────────────────────────\n');
  console.log(`   Daily Cap: $${dailyCap.toFixed(2)}`);
  console.log(`   Today's Spend: $${todaySpend.toFixed(4)}`);
  console.log(`   Remaining: $${remaining.toFixed(4)}`);
  console.log(`   Percentage Used: ${percentageUsed.toFixed(2)}%`);
  console.log(`   Throttled: ${isThrottled ? '✅ YES (using GPT-4o-Mini)' : '❌ NO (using GPT-4o)'}`);
  console.log(`   Exceeded: ${isExceeded ? '🚨 YES' : '✅ NO'}`);
  console.log('');

  // Recent Battles
  const recentBattles = await getRecentBattles(10);
  
  console.log('🎯 Recent Battles');
  console.log('─────────────────────────────────────────────────────\n');
  
  if (recentBattles.length > 0) {
    console.log(`   Last ${recentBattles.length} battles:\n`);
    recentBattles.forEach((battle: any, i: number) => {
      const timeAgo = new Date(battle.created_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - timeAgo.getTime()) / 60000);
      const cost = parseFloat(battle.cost_usd) || 0;
      const score = battle.referee_score || 0;
      
      console.log(`   ${i + 1}. Score: ${score.toFixed(1)}/100 | Cost: $${cost.toFixed(4)} | ${minutesAgo}m ago`);
    });
    
    const avgScore = recentBattles.reduce((sum, b) => sum + (b.referee_score || 0), 0) / recentBattles.length;
    const avgCost = recentBattles.reduce((sum, b) => sum + (parseFloat(b.cost_usd) || 0), 0) / recentBattles.length;
    const totalBattles = recentBattles.length;
    
    console.log(`\n   Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`   Average Cost: $${avgCost.toFixed(4)} per battle`);
    console.log(`   Total Battles Today: ${totalBattles} (last 10 shown)`);
  } else {
    console.log('   ℹ️  No recent battles found');
  }
  console.log('');

  // Training Status
  console.log('⚙️  Training Status');
  console.log('─────────────────────────────────────────────────────\n');
  
  if (isExceeded) {
    console.log('   🚨 Budget exceeded - Training is blocked');
    console.log('   💡 Kill-switch should be active');
  } else if (isThrottled) {
    console.log('   ⚡ Training active (throttled mode)');
    console.log('   ✅ Using GPT-4o-Mini for cost efficiency');
    console.log('   ✅ Training continues with lower quality scoring');
  } else {
    console.log('   ✅ Training active (full quality)');
    console.log('   ✅ Using GPT-4o for high-quality scoring');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkTrainingStatus().catch(console.error);
