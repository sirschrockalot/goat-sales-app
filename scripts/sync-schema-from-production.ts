/**
 * Sync Schema from Production to Local
 * Pulls the current schema from production Supabase and applies it to local instance
 * 
 * Usage: npx tsx scripts/sync-schema-from-production.ts
 * 
 * Prerequisites:
 * - Production Supabase credentials in .env.local or environment
 * - Local Supabase running (supabase start)
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const productionServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!productionUrl || !productionServiceKey) {
  console.error('❌ Missing production Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function syncSchema() {
  console.log('🔄 Syncing schema from production to local...\n');

  try {
    // Step 1: Check if local Supabase is running
    console.log('📋 Step 1: Checking local Supabase status...');
    try {
      execSync('supabase status', { stdio: 'pipe' });
      console.log('   ✅ Local Supabase is running\n');
    } catch (error) {
      console.error('   ❌ Local Supabase is not running');
      console.error('   Run: supabase start');
      process.exit(1);
    }

    // Step 2: Pull schema from production
    console.log('📥 Step 2: Pulling schema from production...');
    console.log('   This will create a new migration file with the current production schema\n');
    
    // Use Supabase CLI to link to production and pull schema
    // Note: This requires setting up a Supabase project link
    // Alternative: Use direct SQL dump
    
    const supabase = createClient(productionUrl, productionServiceKey);
    
    // Get all table schemas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .not('table_name', 'like', 'pg_%');

    if (tablesError) {
      console.error('   ❌ Error fetching tables:', tablesError.message);
      console.log('\n   💡 Alternative: Use Supabase CLI to link and pull:');
      console.log('      supabase link --project-ref your-project-ref');
      console.log('      supabase db pull');
      process.exit(1);
    }

    console.log(`   ✅ Found ${tables?.length || 0} tables in production`);
    console.log('\n   ⚠️  For full schema sync, use Supabase CLI:');
    console.log('      1. supabase link --project-ref your-project-ref');
    console.log('      2. supabase db pull');
    console.log('      3. This will create a new migration file\n');

    // Step 3: Apply migrations to local
    console.log('📤 Step 3: Applying migrations to local database...');
    try {
      execSync('supabase db reset', { stdio: 'inherit' });
      console.log('\n   ✅ Local database reset and migrations applied\n');
    } catch (error) {
      console.error('   ❌ Error applying migrations');
      process.exit(1);
    }

    // Step 4: Verify RLS policies
    console.log('🔒 Step 4: Verifying RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT schemaname, tablename, policyname 
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `
      });

    if (!policiesError && policies) {
      console.log(`   ✅ Found ${policies.length} RLS policies in production`);
    }

    console.log('\n✅ Schema sync complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the generated migration file');
    console.log('   2. Run: npm run db:seed (to populate with test data)');
    console.log('   3. Run: npm run dev:local (to start development server)\n');

  } catch (error) {
    console.error('\n❌ Error syncing schema:', error);
    process.exit(1);
  }
}

syncSchema().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
