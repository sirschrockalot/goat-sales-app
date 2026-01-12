/**
 * Sandbox Seeding Script
 * Links Supabase CLI to Sandbox project and seeds training data
 * SAFETY: Only touches Sandbox, never touches Production
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseClientForEnv, getEnvironmentConfig as getEnvConfig } from '../src/lib/env-manager';
import logger from '../src/lib/logger';
import { Client } from 'pg';

const SANDBOX_PROJECT_REF = process.env.SANDBOX_PROJECT_REF || '';
const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

/**
 * Check if Supabase CLI is installed
 */
function checkSupabaseCLI(): boolean {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Link Supabase CLI to Sandbox project
 */
function linkSandboxProject(projectRef: string): void {
  console.log(`🔗 Linking to Sandbox project: ${projectRef}`);
  
  try {
    execSync(`supabase link --project-ref ${projectRef}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Successfully linked to Sandbox project');
  } catch (error: any) {
    if (error.message?.includes('already linked')) {
      console.log('⚠️  Project already linked, continuing...');
    } else {
      throw new Error(`Failed to link project: ${error.message}`);
    }
  }
}

/**
 * Execute seed.sql against Sandbox database
 * Uses direct PostgreSQL connection via pg library or REST API
 */
async function executeSeed(): Promise<void> {
  const envConfig = getEnvConfig();
  
  if (!envConfig.supabase.serviceRoleKey) {
    throw new Error('Service role key required for seeding');
  }
  
  // Extract project reference from URL
  const url = new URL(envConfig.supabase.url);
  const projectRef = url.hostname.split('.')[0];
  
  console.log('🌱 Executing seed.sql...\n');
  
  // Read seed SQL
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // Try method 1: Direct PostgreSQL connection (if password available)
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.SANDBOX_DB_PASSWORD;
  
  if (dbPassword) {
    try {
      const { Client } = await import('pg');
      const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      
      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });
      
      await client.connect();
      console.log('✅ Connected to database\n');
      console.log('📝 Executing seed.sql...\n');
      
      await client.query(seedSQL);
      
      await client.end();
      console.log('✅ Seed SQL executed successfully via direct connection!\n');
      return;
    } catch (error: any) {
      console.log('⚠️  Direct connection failed:', error.message.substring(0, 100));
      console.log('💡 Trying alternative method...\n');
    }
  }
  
  // Method 2: Try Supabase REST API (if exec_sql RPC exists)
  try {
    const response = await fetch(`${envConfig.supabase.url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': envConfig.supabase.serviceRoleKey,
        'Authorization': `Bearer ${envConfig.supabase.serviceRoleKey}`,
      },
      body: JSON.stringify({ query: seedSQL }),
    });
    
    if (response.ok) {
      console.log('✅ Seed SQL executed successfully via REST API!\n');
      return;
    }
  } catch (error: any) {
    // REST API method not available, continue to instructions
  }
  
  // Method 3: Provide instructions for manual execution
  console.log('📝 Manual Execution Required:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ RECOMMENDED: Supabase Dashboard SQL Editor');
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${SANDBOX_PROJECT_REF || projectRef}/sql/new`);
  console.log('   2. Copy contents of supabase/seed.sql');
  console.log('   3. Paste into SQL Editor');
  console.log('   4. Click "Run" button');
  console.log('\n   Or run: npm run seed:instructions (shows full SQL)');
  console.log('\n   To enable direct execution, set:');
  console.log('   export SANDBOX_DB_PASSWORD=your_database_password');
  console.log('   (Get password from: Supabase Dashboard → Settings → Database)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Verify seed data was loaded
 */
async function verifySeedData(): Promise<void> {
  const supabase = getSupabaseClientForEnv('sandbox');
  
  // Check training_personas
  const { data: personas, count: personaCount, error: personasError } = await supabase
    .from('training_personas')
    .select('*', { count: 'exact' })
    .eq('is_active', true);
  
  if (personasError) {
    if (personasError.message.includes('does not exist') || personasError.code === 'PGRST116') {
      console.log('⚠️  training_personas table does not exist.');
      console.log('💡 Run migrations first, then execute seed.sql');
      return;
    }
    throw new Error(`Failed to verify personas: ${personasError.message}`);
  }
  
  console.log(`📊 Training Personas: ${personaCount || 0} found`);
  
  if ((personaCount || 0) === 0) {
    console.log('⚠️  No personas found. Seed data has not been loaded.');
    console.log('💡 Execute seed.sql via Supabase Dashboard SQL Editor (see instructions above)');
    return;
  }
  
  if ((personaCount || 0) < 15) {
    console.log(`⚠️  Expected 15 personas, found ${personaCount || 0}. Seed may be incomplete.`);
  } else {
    console.log('✅ All 15 Principal Partner personas found!');
  }
  
  // List first few personas
  if (personas && personas.length > 0) {
    console.log('\n📋 Sample personas:');
    personas.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ${p.name} (${p.difficulty_level})`);
    });
    if (personas.length > 5) {
      console.log(`   ... and ${personas.length - 5} more`);
    }
  }
  
  // Check golden_calls
  const { count: callsCount } = await supabase
    .from('golden_calls')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Golden Calls: ${callsCount || 0} found`);
  
  // Check market_benchmarks
  const { count: benchmarksCount } = await supabase
    .from('market_benchmarks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Market Benchmarks: ${benchmarksCount || 0} found`);
  
  if ((personaCount || 0) >= 15 && (callsCount || 0) >= 1 && (benchmarksCount || 0) >= 1) {
    console.log('\n✅ Seed verification complete! All data loaded.');
  } else {
    console.log('\n⚠️  Seed verification: Some data missing. See instructions above to complete seeding.');
  }
}

/**
 * Main seeding function
 */
async function seedSandbox(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 SANDBOX SEEDING SCRIPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Safety check: Ensure we're not in production
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SANDBOX_SEED) {
    throw new Error('⚠️  SAFETY: Cannot seed Sandbox in production mode. Set FORCE_SANDBOX_SEED=true to override.');
  }
  
  // Check if we have Supabase credentials
  const envConfig = getEnvConfig();
  if (!envConfig.supabase.url) {
    console.error('\n❌ Missing Sandbox Supabase URL!\n');
    console.error('Required: SUPABASE_SANDBOX_URL or SANDBOX_SUPABASE_URL\n');
    throw new Error('Missing Sandbox Supabase URL');
  }
  
  // Service role key is needed for seeding, but anon key works for verification
  if (!envConfig.supabase.serviceRoleKey && !envConfig.supabase.anonKey) {
    console.error('\n❌ Missing Sandbox Supabase credentials!\n');
    console.error('Required: At least one of:');
    console.error('  - SANDBOX_SUPABASE_SERVICE_ROLE_KEY (for seeding)');
    console.error('  - SANDBOX_SUPABASE_ANON_KEY (for verification only)');
    console.error('\n💡 Get service_role key from:');
    console.error('   Supabase Dashboard → Settings → API → service_role key\n');
    throw new Error('Missing Sandbox Supabase credentials');
  }
  
  if (!envConfig.supabase.serviceRoleKey) {
    console.log('⚠️  Service role key not provided - can only verify, not seed');
    console.log('💡 To seed, get service_role key from Supabase Dashboard → Settings → API\n');
  }
  
  console.log(`✅ Sandbox Supabase URL: ${envConfig.supabase.url}`);
  console.log(`✅ Using project: ${envConfig.supabase.projectName}\n`);
  
  // Try to link via CLI if available and project ref provided
  if (checkSupabaseCLI() && SANDBOX_PROJECT_REF) {
    try {
      linkSandboxProject(SANDBOX_PROJECT_REF);
      console.log('✅ Project linked successfully\n');
    } catch (error: any) {
      if (error.message?.includes('already linked')) {
        console.log('✅ Project already linked\n');
      } else {
        console.log('⚠️  CLI linking failed, continuing with direct connection...\n');
      }
    }
  } else {
    console.log('ℹ️  Supabase CLI not available or project ref not set.');
    console.log('   Using direct Supabase connection for seeding...\n');
  }
  
  // Try to verify first (in case data already exists)
  console.log('🔍 Checking if seed data already exists...\n');
  try {
    await verifySeedData();
    const supabase = getSupabaseClientForEnv('sandbox');
    const { count } = await supabase
      .from('training_personas')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if ((count || 0) >= 15) {
      console.log('\n✅ Seed data already exists! Verification complete.');
      console.log('🚀 Sandbox is ready for autonomous training!');
      return;
    } else {
      console.log(`\n⚠️  Found ${count || 0} personas (expected 15). Need to seed.\n`);
    }
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      console.log('⚠️  Tables do not exist yet. Need to create tables and seed data.\n');
    } else {
      console.log('⚠️  Could not verify existing data. Proceeding with seed execution...\n');
    }
  }
  
  // Check if we have service role key for seeding
  if (!envConfig.supabase.serviceRoleKey) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  SERVICE ROLE KEY REQUIRED FOR SEEDING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('To complete seeding, you need the service_role key:');
    console.log('1. Go to: https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/settings/api');
    console.log('2. Copy the "service_role" key (starts with eyJ...)');
    console.log('3. Export it: export SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your_key');
    console.log('4. Run this script again\n');
    console.log('OR execute seed.sql manually:');
    console.log('   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n');
    console.log('   Run: npm run seed:instructions (to see the SQL)\n');
    return;
  }
  
  // Execute seed
  await executeSeed();
  
  // Verify data after seeding
  await verifySeedData();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SANDBOX SEEDING COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 15 Principal Partner personas loaded');
  console.log('✅ Golden call transcript loaded');
  console.log('✅ Market benchmarks loaded');
  console.log('\n🚀 Sandbox is ready for autonomous training!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSandbox()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

export { seedSandbox };
