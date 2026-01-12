/**
 * Execute seed.sql directly via PostgreSQL connection
 * Uses pg library to connect and execute SQL
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { getEnvironmentConfig } from '../src/lib/env-manager';

const SEED_FILE_PATH = join(process.cwd(), 'supabase', 'seed.sql');

async function executeSeedDirect(): Promise<void> {
  const envConfig = getEnvironmentConfig();
  
  if (!envConfig.supabase.url || !envConfig.supabase.serviceRoleKey) {
    throw new Error('Missing Supabase URL or service_role key');
  }
  
  // Extract project reference from URL
  const url = new URL(envConfig.supabase.url);
  const projectRef = url.hostname.split('.')[0];
  
  console.log('🌱 Executing seed.sql via direct PostgreSQL connection...\n');
  console.log(`📦 Project: ${projectRef}\n`);
  
  // Read seed SQL
  const seedSQL = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // For Supabase, we need the database password, not the service_role key
  // The service_role key is for REST API, not direct DB connections
  // However, we can try using the Supabase connection pooler with the service_role key
  // or we need to get the actual database password from the user
  
  // Try to construct connection string
  // Supabase connection format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // But we need the actual database password, which is different from service_role key
  
  // Alternative: Use Supabase REST API to execute SQL via a custom RPC
  // Or use the Management API if available
  
  // For now, let's try using the service_role key with the REST API
  // We can execute SQL by creating a temporary function or using exec_sql if it exists
  
  console.log('💡 Attempting to execute via Supabase REST API...\n');
  
  try {
    // Try using Supabase's ability to execute SQL via RPC
    // Some Supabase projects have an exec_sql function
    
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
    } else {
      const errorText = await response.text();
      console.log('⚠️  REST API execution not available:', errorText.substring(0, 200));
      console.log('\n💡 Using alternative method...\n');
    }
  } catch (error: any) {
    console.log('⚠️  REST API method failed:', error.message);
    console.log('\n💡 Trying direct PostgreSQL connection...\n');
  }
  
  // Alternative: Try direct PostgreSQL connection
  // We need the database password - let's check if it's in env vars
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.SANDBOX_DB_PASSWORD;
  
  if (!dbPassword) {
    console.log('❌ Database password not found in environment variables.');
    console.log('💡 To execute seed SQL directly, you need the database password.');
    console.log('   Get it from: Supabase Dashboard → Settings → Database → Connection string\n');
    console.log('   Then set: export SANDBOX_DB_PASSWORD=your_password\n');
    console.log('   OR execute seed.sql via Dashboard SQL Editor:\n');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    throw new Error('Database password required for direct connection');
  }
  
  // Construct connection string
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Execute seed SQL
    console.log('📝 Executing seed.sql...\n');
    await client.query(seedSQL);
    
    console.log('✅ Seed SQL executed successfully!\n');
  } catch (error: any) {
    console.error('❌ Error executing seed SQL:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeSeedDirect()
    .then(() => {
      console.log('🎉 Seed execution complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed execution failed:', error.message);
      process.exit(1);
    });
}

export { executeSeedDirect };
