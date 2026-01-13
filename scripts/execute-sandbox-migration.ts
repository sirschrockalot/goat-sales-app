/**
 * Execute migration on sandbox database
 * Runs the margin_integrity migration SQL directly on the sandbox Supabase database
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

// Extract project ref from URL
const url = new URL(supabaseUrl);
const projectRef = url.hostname.split('.')[0];

// Read migration SQL
const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20240101000037_add_margin_integrity.sql'),
  'utf-8'
);

async function executeMigration() {
  console.log('🔄 Executing Migration on Sandbox Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Project: ${projectRef}`);
  console.log(`Migration: 20240101000037_add_margin_integrity.sql\n`);

  // For Supabase, we need the database password for direct PostgreSQL connection
  // The service_role key is for REST API, not direct DB connections
  // Connection format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  
  const dbPassword = process.env.SANDBOX_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    console.log('⚠️  Database password not found in environment variables.\n');
    console.log('💡 To execute this migration automatically, you need the database password.\n');
    console.log('   Option 1: Add to .env.local:');
    console.log('   SANDBOX_DB_PASSWORD=your_database_password\n');
    console.log('   Option 2: Get password from Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/settings/database\n');
    console.log('   Look for "Connection string" → "Direct connection" → password\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Migration SQL (for manual execution):\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(migrationSQL);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Run this SQL in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n');
    process.exit(1);
  }

  // Construct connection string
  // Use direct connection (port 5432) for migrations
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  // Alternative: Try direct connection
  // const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Split SQL into statements and execute each
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      const statementPreview = statement.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${statementPreview}...`);

      try {
        await client.query(statement);
        console.log(`   ✅ Success\n`);
      } catch (error: any) {
        // Some errors are expected (e.g., IF NOT EXISTS when already exists)
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ⚠️  Already exists (skipping)\n`);
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          throw error;
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!\n');
    
    // Verify columns exist
    console.log('🔍 Verifying columns were created...\n');
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sandbox_battles' 
      AND column_name IN ('margin_integrity', 'calculated_profit');
    `;
    
    const result = await client.query(verifyQuery);
    
    if (result.rows.length === 2) {
      console.log('✅ Both columns verified:');
      result.rows.forEach((row: any) => {
        console.log(`   • ${row.column_name} (${row.data_type})`);
      });
      console.log('\n🎉 Migration verified! Training should now work.\n');
    } else {
      console.log(`⚠️  Expected 2 columns, found ${result.rows.length}`);
      result.rows.forEach((row: any) => {
        console.log(`   • ${row.column_name}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error executing migration:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Password authentication failed.');
      console.log('   Please verify the database password is correct.\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection failed. Trying alternative connection method...\n');
      console.log('   You may need to use the Supabase SQL Editor instead:');
      console.log('   https://supabase.com/dashboard/project/cwnvhhzzcjzhcaozazji/sql/new\n');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
