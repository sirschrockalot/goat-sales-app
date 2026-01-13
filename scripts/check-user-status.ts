/**
 * Check User Status
 * Verifies user's admin status and profile data
 */

import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = 'https://cwnvhhzzcjzhcaozazji.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserStatus() {
  console.log('🔍 Checking user status...\n');

  // Find user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error:', listError.message);
    process.exit(1);
  }

  const user = users?.find((u: any) => u.email?.toLowerCase() === 'joel.schrock@presidentialdigs.com');
  
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  console.log('✅ User found:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Email Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, is_admin, onboarding_completed, name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile error:', profileError.message);
    process.exit(1);
  }

  console.log('\n📋 Profile Status:');
  console.log('   ID:', profile?.id);
  console.log('   Name:', profile?.name);
  console.log('   Email:', profile?.email);
  console.log('   is_admin:', profile?.is_admin ? '✅ TRUE' : '❌ FALSE');
  console.log('   onboarding_completed:', profile?.onboarding_completed ? '✅ TRUE' : '❌ FALSE');

  if (!profile?.is_admin) {
    console.log('\n⚠️  User is NOT an admin. This is why you\'re being redirected.');
    console.log('   Run: npx tsx scripts/verify-and-promote-user.ts joel.schrock@presidentialdigs.com');
  } else {
    console.log('\n✅ User is an admin. If you\'re still being redirected, try:');
    console.log('   1. Clear browser cache');
    console.log('   2. Log out and log back in');
    console.log('   3. Try incognito/private window');
  }
}

checkUserStatus().catch(console.error);
