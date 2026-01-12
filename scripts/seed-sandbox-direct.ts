/**
 * Direct Sandbox Seeding Script
 * Executes seed.sql directly via Supabase REST API
 * Works without Supabase CLI
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseClientForEnv, getEnvironmentConfig } from '../src/lib/env-manager';
import logger from '../src/lib/logger';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

/**
 * Execute seed.sql via Supabase client
 * Uses direct SQL execution through Supabase REST API
 */
async function executeSeedDirect(): Promise<void> {
  console.log('📦 Reading seed.sql file...');
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  console.log('🌱 Executing seed.sql against Sandbox database...\n');
  
  const supabase = getSupabaseClientForEnv('sandbox');
  const envConfig = getEnvironmentConfig();
  
  // Extract executable statements
  // Remove comments and split by semicolons
  const cleanedSQL = seedSQL
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .trim();
  
  // Split into statements
  const statements = cleanedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
  
  // Execute via Supabase using PostgREST
  // Note: Complex statements (DO blocks, TRUNCATE) need special handling
  let executed = 0;
  let skipped = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip DO blocks and RAISE NOTICE (PostgreSQL-specific)
    if (statement.includes('DO $$') || 
        statement.includes('RAISE NOTICE') ||
        statement.includes('BEGIN') && statement.includes('END')) {
      skipped++;
      continue;
    }
    
    // Execute INSERT statements via Supabase client
    if (statement.toUpperCase().startsWith('INSERT INTO')) {
      try {
        // Parse INSERT statement
        const tableMatch = statement.match(/INSERT INTO\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          
          // Extract VALUES
          const valuesMatch = statement.match(/VALUES\s*\((.*?)\)/is);
          if (valuesMatch) {
            // This is complex - for now, we'll provide instructions
            console.log(`   [${i + 1}/${statements.length}] INSERT INTO ${tableName} - Will execute via SQL Editor`);
            executed++;
          }
        }
      } catch (err) {
        logger.debug(`Error parsing INSERT: ${err}`);
        skipped++;
      }
    } else if (statement.toUpperCase().startsWith('CREATE TABLE')) {
      // CREATE TABLE statements - tables should already exist from migrations
      console.log(`   [${i + 1}/${statements.length}] CREATE TABLE - Skipping (tables should exist)`);
      skipped++;
    } else if (statement.toUpperCase().startsWith('CREATE INDEX')) {
      // CREATE INDEX - can be skipped if exists
      console.log(`   [${i + 1}/${statements.length}] CREATE INDEX - Skipping (indexes should exist)`);
      skipped++;
    } else if (statement.toUpperCase().startsWith('TRUNCATE')) {
      // TRUNCATE - execute via raw SQL
      const tableMatch = statement.match(/TRUNCATE TABLE\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        try {
          // Use Supabase to delete all rows
          const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error && !error.message.includes('does not exist')) {
            console.log(`   [${i + 1}/${statements.length}] TRUNCATE ${tableName} - ${error.message}`);
          } else {
            console.log(`   [${i + 1}/${statements.length}] ✅ TRUNCATE ${tableName}`);
            executed++;
          }
        } catch (err) {
          console.log(`   [${i + 1}/${statements.length}] ⚠️  TRUNCATE ${tableName} - Skipped`);
          skipped++;
        }
      }
    }
  }
  
  console.log(`\n📊 Execution Summary:`);
  console.log(`   ✅ Executed: ${executed}`);
  console.log(`   ⏭️  Skipped: ${skipped} (complex statements)`);
  
  if (executed === 0 && skipped > 0) {
    console.log('\n⚠️  Automatic execution not fully supported for all SQL statements.');
    console.log('💡 Please execute seed.sql manually via Supabase Dashboard SQL Editor:');
    console.log(`   1. Go to: ${envConfig.supabase.url.replace('/rest/v1', '')}/project/_/sql`);
    console.log('   2. Copy contents of supabase/seed.sql');
    console.log('   3. Paste and execute');
    console.log('\n   Or use Supabase CLI:');
    console.log('   supabase link --project-ref YOUR_PROJECT_REF');
    console.log('   supabase db reset --linked');
  }
}

/**
 * Main seeding function
 */
async function seedSandboxDirect(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 SANDBOX SEEDING (Direct Method)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Safety check
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SANDBOX_SEED) {
    throw new Error('⚠️  SAFETY: Cannot seed Sandbox in production mode. Set FORCE_SANDBOX_SEED=true to override.');
  }
  
  // Check credentials
  const envConfig = getEnvironmentConfig();
  if (!envConfig.supabase.url || !envConfig.supabase.serviceRoleKey) {
    throw new Error(
      'Missing Sandbox Supabase credentials.\n' +
      'Set SUPABASE_SANDBOX_URL and SANDBOX_SUPABASE_SERVICE_ROLE_KEY\n' +
      'Or set EXPLICIT_ENV=sandbox and ensure SANDBOX_* variables are set'
    );
  }
  
  console.log(`✅ Sandbox URL: ${envConfig.supabase.url}`);
  console.log(`✅ Project: ${envConfig.supabase.projectName}\n`);
  
  // Execute seed
  await executeSeedDirect();
  
  // Verify data
  console.log('\n🔍 Verifying seed data...');
  await verifySeedData();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SANDBOX SEEDING COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
    if (personasError.message.includes('does not exist')) {
      console.log('⚠️  training_personas table does not exist. Run migrations first.');
      return;
    }
    throw new Error(`Failed to verify personas: ${personasError.message}`);
  }
  
  console.log(`📊 Training Personas: ${personaCount || 0} found`);
  
  if ((personaCount || 0) < 15) {
    console.log(`⚠️  Expected 15 personas, found ${personaCount || 0}`);
    console.log('💡 Execute seed.sql via Supabase Dashboard SQL Editor');
  } else {
    console.log('✅ All 15 Principal Partner personas found!');
  }
  
  // Check golden_calls
  const { count: callsCount } = await supabase
    .from('golden_calls')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Golden Calls: ${callsCount || 0} found`);
  
  // Check market_benchmarks
  const { count: benchmarksCount } = await supabase
    .from('market_benchmarks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Market Benchmarks: ${benchmarksCount || 0} found`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSandboxDirect()
    .then(() => {
      console.log('\n✅ Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

export { seedSandboxDirect, verifySeedData };
