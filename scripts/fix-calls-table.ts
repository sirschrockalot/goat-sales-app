/**
 * Script to manually add missing columns to calls table
 * This fixes schema cache issues
 */

import * as path from 'path';
import * as fs from 'fs';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const sql = `
ALTER TABLE calls ADD COLUMN IF NOT EXISTS persona_id TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS persona_mode TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_status TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS rebuttal_of_the_day TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS script_adherence JSONB;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS metadata JSONB;
`;

async function fixTable() {
  try {
    console.log('🔧 Adding missing columns to calls table...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Try alternative: use PostgREST query
      console.log('Trying alternative method...');
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef) {
        console.log('\n📋 Please run this SQL in your Supabase Dashboard:');
        console.log('   Go to: SQL Editor');
        console.log('   Then paste and run:');
        console.log('\n' + sql);
        console.log('\nOr run: supabase db execute "' + sql.replace(/\n/g, ' ') + '"');
      }
      throw new Error(`Failed to execute SQL: ${response.status}`);
    }

    console.log('✅ Successfully added missing columns!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Manual fix required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run this SQL:');
    console.log('\n' + sql);
  }
}

fixTable();
