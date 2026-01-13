/**
 * Run migration on sandbox database
 * Executes the margin_integrity migration using direct PostgreSQL connection
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'pg';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

const supabaseUrl = process.env.SUPABASE_SANDBOX_URL || 'https://cwnvhhzzcjzhcaozazji.supabase.co';
const supabaseServiceKey = process.env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing SANDBOX_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const url = new URL(supabaseUrl);
const projectRef = url.hostname.split('.')[0];

// Read migration SQL
const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20240101000037_add_margin_integrity.sql'),
  'utf-8'
);

async function runMigration() {
  console.log('🔄 Running Migration on Sandbox Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Project: ${projectRef}`);
  console.log(`Migration: 20240101000037_add_margin_integrity.sql\n`);
  
  // For Supabase, we need the database password, not the service_role key
  // The service_role key is for REST API authentication
  // We need to construct a PostgreSQL connection string
  
  // Supabase connection format:
  // postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  // OR
  // postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  
  // Since we don't have the database password, we'll need to use the SQL Editor
  // But let's try to use the Supabase Management API or provide clear instructions
  
  console.log('📋 Migration SQL:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(migrationSQL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 To apply this migration to the sandbox database:\n');
  console.log('   Option 1: Supabase SQL Editor (Recommended)');
  console.log('   1. Open: https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new');
  console.log('   2. Copy and paste the SQL above');
  console.log('   3. Click "Run"\n');
  
  console.log('   Option 2: If you have the database password, we can use pg library');
  console.log('   (The service_role key is for REST API, not direct DB connections)\n');
  
  // Check if we can verify the migration was applied
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🔍 Checking current schema...\n');
  const { error } = await supabase
    .from('sandbox_battles')
    .select('margin_integrity, calculated_profit')
    .limit(0);
  
  if (error) {
    if (error.message.includes('column') && (error.message.includes('does not exist') || error.message.includes('not found'))) {
      console.log('❌ Columns do not exist - migration needs to be run\n');
      console.log('   Please run the SQL above in the Supabase SQL Editor.\n');
    } else {
      console.log(`⚠️  Error: ${error.message}\n`);
    }
  } else {
    console.log('✅ Columns already exist! Migration may have been applied.\n');
  }
}

runMigration().catch(console.error);
