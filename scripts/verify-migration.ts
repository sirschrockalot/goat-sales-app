import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

async function verifyMigration() {
  console.log('🔍 Verifying Migration Status...\n');
  
  const { error } = await supabase
    .from('sandbox_battles')
    .select('margin_integrity, calculated_profit')
    .limit(0);
  
  if (error) {
    if (error.message.includes('column') && (error.message.includes('does not exist') || error.message.includes('not found'))) {
      console.log('❌ Migration NOT applied - columns do not exist\n');
      console.log('   Please run the migration SQL in Supabase SQL Editor\n');
      return false;
    } else {
      console.log(`⚠️  Error: ${error.message}\n`);
      return false;
    }
  } else {
    console.log('✅ Migration APPLIED - columns exist!\n');
    console.log('   The training system should now work correctly.\n');
    return true;
  }
}

verifyMigration();
