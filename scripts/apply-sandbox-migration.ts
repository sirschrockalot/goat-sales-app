/**
 * Apply migration to sandbox database
 * Executes the margin_integrity migration SQL on the sandbox Supabase instance
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read migration SQL
const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20240101000037_add_margin_integrity.sql'),
  'utf-8'
);

async function checkColumns() {
  console.log('🔍 Checking if columns already exist...\n');
  
  // Try to query the columns - if they exist, query will succeed
  const { error } = await supabase
    .from('sandbox_battles')
    .select('margin_integrity, calculated_profit')
    .limit(0);
  
  if (error) {
    if (error.message.includes('column') && (error.message.includes('does not exist') || error.message.includes('not found'))) {
      console.log('❌ Columns do not exist - migration needs to be run\n');
      return false;
    } else {
      console.log(`⚠️  Error checking: ${error.message}\n`);
      return false;
    }
  } else {
    console.log('✅ Columns already exist!\n');
    return true;
  }
}

async function runMigration() {
  console.log('🔄 Applying Migration to Sandbox Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Migration: 20240101000037_add_margin_integrity.sql\n');
  
  // Check if columns already exist
  const columnsExist = await checkColumns();
  
  if (columnsExist) {
    console.log('✅ Migration already applied - columns exist!\n');
    return;
  }
  
  console.log('📋 Migration SQL:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(migrationSQL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 Supabase REST API does not support arbitrary SQL execution.');
  console.log('   Please run this migration via Supabase SQL Editor:\n');
  console.log('   1. Open: https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new');
  console.log('   2. Copy and paste the SQL above');
  console.log('   3. Click "Run"\n');
  console.log('   After running, the training will work successfully!\n');
}

runMigration().catch(console.error);
