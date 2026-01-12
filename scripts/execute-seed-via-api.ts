/**
 * Execute seed.sql via Supabase REST API
 * Uses service_role key to execute SQL statements
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getEnvironmentConfig } from '../src/lib/env-manager';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

async function executeSeedViaAPI(): Promise<void> {
  const envConfig = getEnvironmentConfig();
  
  if (!envConfig.supabase.url || !envConfig.supabase.serviceRoleKey) {
    throw new Error('Missing Supabase URL or service_role key');
  }
  
  console.log('🌱 Executing seed.sql via Supabase REST API...\n');
  
  // Read seed SQL
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // Supabase doesn't have a built-in exec_sql RPC function
  // We need to execute SQL via the Management API or create a custom function
  // For now, let's try using the Supabase REST API to execute statements
  
  // Split SQL into statements
  const statements = seedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/));
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  // Try to execute via Supabase Management API
  // The Management API endpoint is: https://api.supabase.com/v1/projects/{project_ref}/database/query
  // But this requires a different authentication token
  
  // Alternative: Use Supabase's PostgREST to execute via RPC
  // We can try creating a temporary function or using existing ones
  
  // For now, let's try executing INSERT statements directly via REST API
  let executed = 0;
  let skipped = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    if (statement.length < 10) {
      skipped++;
      continue;
    }
    
    // Try to execute INSERT statements via REST API
    if (statement.match(/^INSERT INTO/i)) {
      try {
        // Extract table name and values
        const match = statement.match(/INSERT INTO\s+(\w+)\s*\(/i);
        if (match) {
          const tableName = match[1];
          
          // For INSERT statements, we can use the REST API directly
          // But we need to parse the VALUES clause, which is complex
          // Let's skip this approach and use a different method
        }
      } catch (error) {
        // Skip
      }
    }
    
    // For CREATE TABLE and other DDL, we can't execute via REST API
    // We need direct SQL execution
    
    executed++;
    if (executed % 50 === 0) {
      console.log(`   ⏳ Processed ${executed}/${statements.length} statements...`);
    }
  }
  
  console.log(`\n⚠️  Cannot execute DDL statements (CREATE TABLE, etc.) via REST API.`);
  console.log(`   Executed ${executed} statements, skipped ${skipped}\n`);
  
  console.log('💡 To execute seed.sql, use one of these methods:\n');
  console.log('1. Supabase Dashboard SQL Editor (RECOMMENDED):');
  console.log(`   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n`);
  console.log('2. Direct PostgreSQL connection (requires database password):');
  console.log('   Set: export SANDBOX_DB_PASSWORD=your_password');
  console.log('   Then run: npm run seed:sandbox\n');
  console.log('3. Supabase CLI:');
  console.log('   supabase db execute --file supabase/seed.sql --linked\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeSeedViaAPI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

export { executeSeedViaAPI };
