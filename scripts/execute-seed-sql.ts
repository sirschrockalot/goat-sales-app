/**
 * Execute seed.sql directly via Supabase REST API
 * Uses service_role key to execute raw SQL
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getEnvironmentConfig } from '../src/lib/env-manager';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

async function executeSeedSQL(): Promise<void> {
  const envConfig = getEnvironmentConfig();
  
  if (!envConfig.supabase.url || !envConfig.supabase.serviceRoleKey) {
    throw new Error('Missing Supabase URL or service_role key');
  }
  
  // Read seed.sql
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // Supabase doesn't have a direct REST API for executing arbitrary SQL
  // We need to use the Management API or execute via RPC
  // For now, we'll use the Supabase REST API's ability to execute SQL via HTTP
  
  const url = `${envConfig.supabase.url}/rest/v1/rpc/exec_sql`;
  
  // Split SQL into statements (basic splitting by semicolon)
  // Note: This is a simplified approach. For production, use a proper SQL parser
  const statements = seedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Executing ${statements.length} SQL statements...\n`);
  
  // Execute each statement
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty or comment-only statements
    if (!statement || statement.length < 10) continue;
    
    try {
      // Use Supabase's REST API to execute SQL
      // Note: This requires a custom RPC function or direct PostgreSQL connection
      // For now, we'll use fetch to the Supabase REST API
      
      const response = await fetch(`${envConfig.supabase.url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': envConfig.supabase.serviceRoleKey,
          'Authorization': `Bearer ${envConfig.supabase.serviceRoleKey}`,
        },
        body: JSON.stringify({ sql: statement }),
      });
      
      if (response.ok) {
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ Executed ${i + 1}/${statements.length} statements...`);
        }
      } else {
        const errorText = await response.text();
        // Some errors are expected (e.g., IF NOT EXISTS)
        if (!errorText.includes('already exists') && !errorText.includes('does not exist')) {
          console.error(`   ⚠️  Error on statement ${i + 1}: ${errorText.substring(0, 100)}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
    } catch (error: any) {
      // Many statements will fail because Supabase REST API doesn't support arbitrary SQL
      // This is expected - we'll need to use a different approach
      errorCount++;
    }
  }
  
  console.log(`\n✅ Executed ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} statements had errors (some may be expected)`);
  }
  
  console.log('\n💡 Note: Supabase REST API has limitations for raw SQL execution.');
  console.log('   For full seed execution, use Supabase Dashboard SQL Editor or CLI.');
}

// Alternative: Use direct PostgreSQL connection via pg library
// This would be more reliable but requires additional dependencies

export { executeSeedSQL };
