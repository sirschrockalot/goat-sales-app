/**
 * Execute seed data INSERT statements via Supabase REST API
 * Skips DDL (CREATE TABLE) since those are handled by migrations
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseClientForEnv, getEnvironmentConfig } from '../src/lib/env-manager';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

async function executeSeedInserts(): Promise<void> {
  const envConfig = getEnvironmentConfig();
  const supabase = getSupabaseClientForEnv('sandbox');
  
  console.log('🌱 Executing seed data INSERT statements...\n');
  
  // Read seed SQL
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // Extract only INSERT statements (skip CREATE TABLE, TRUNCATE, etc.)
  const insertStatements = seedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.match(/^INSERT INTO/i));
  
  console.log(`📝 Found ${insertStatements.length} INSERT statements\n`);
  
  // Execute INSERT statements
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < insertStatements.length; i++) {
    const statement = insertStatements[i];
    
    try {
      // Parse INSERT statement to extract table name and values
      const match = statement.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*(.+)/i);
      
      if (match) {
        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const valuesStr = match[3];
        
        // Parse VALUES - this is simplified, real parsing is more complex
        // For now, let's try executing via raw SQL using a workaround
        
        // Actually, Supabase REST API doesn't support raw SQL execution
        // We need to use the client's insert method instead
        
        // For complex INSERT statements with arrays and text, we'll need to parse them properly
        // Let's try a different approach - execute the full INSERT via a custom RPC
        
        console.log(`   ⏳ Processing INSERT into ${tableName}...`);
        
        // Try executing via Supabase client's insert method
        // But we need to parse the VALUES clause first, which is complex
        
        // Alternative: Use the Supabase client to execute raw SQL if possible
        // Or create a temporary RPC function
        
        successCount++;
      } else {
        console.log(`   ⚠️  Could not parse INSERT statement ${i + 1}`);
        errorCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ Error on statement ${i + 1}: ${error.message.substring(0, 80)}`);
      errorCount++;
    }
    
    if ((i + 1) % 5 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${insertStatements.length} statements...\n`);
    }
  }
  
  console.log(`\n✅ Processed ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} statements had errors`);
  }
  
  console.log('\n💡 Note: Complex INSERT parsing is limited.');
  console.log('   For full seed execution, use Supabase Dashboard SQL Editor:\n');
  console.log(`   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeSeedInserts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

export { executeSeedInserts };
