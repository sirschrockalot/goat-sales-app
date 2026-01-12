/**
 * Generate instructions for executing seed.sql via Supabase Dashboard
 * Provides the exact SQL to copy/paste into SQL Editor
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

async function generateInstructions(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SEED SQL EXECUTION INSTRUCTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  console.log('✅ Step 1: Open Supabase Dashboard SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n');
  
  console.log('✅ Step 2: Copy the seed.sql contents below:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(seedSQL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Step 3: Paste into SQL Editor and click "Run"\n');
  
  console.log('✅ Step 4: Verify with: npm run seed:verify\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateInstructions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { generateInstructions };
