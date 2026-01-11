/**
 * Promote User to Admin
 * Promotes the first user in the profiles table to admin status
 * 
 * Usage: npx tsx scripts/promote-to-admin.ts [user-id]
 * 
 * If no user-id is provided, it will promote the first user found.
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const checkmark = `${colors.green}✓${colors.reset}`;
const cross = `${colors.red}✗${colors.reset}`;

// Load environment variables from .env.local
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
  console.error(`${cross} Missing required environment variables:`);
  console.error(`   - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.error(`   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function promoteToAdmin(userId?: string) {
  console.log(`${colors.bold}${colors.cyan}🐐 Promote User to Admin${colors.reset}\n`);

  try {
    let targetUserId = userId;

    // If no user ID provided, find the first user
    if (!targetUserId) {
      console.log('🔍 Finding first user in profiles table...');
      const { data: users, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (findError || !users) {
        console.error(`${cross} No users found in profiles table.`);
        console.error(`   Error: ${findError?.message || 'No users exist'}`);
        console.error(`\n   Please sign up at http://localhost:3000/login first.`);
        process.exit(1);
      }

      targetUserId = users.id;
      console.log(`${checkmark} Found user: ${targetUserId.substring(0, 8)}...`);
    } else {
      // Verify user exists
      console.log(`🔍 Verifying user exists: ${targetUserId}...`);
      const { data: user, error: verifyError } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', targetUserId)
        .maybeSingle();

      if (verifyError || !user) {
        console.error(`${cross} User not found: ${targetUserId}`);
        console.error(`   Error: ${verifyError?.message || 'User does not exist'}`);
        process.exit(1);
      }

      if (user.is_admin) {
        console.log(`${colors.yellow}⚠${colors.reset}  User is already an admin.`);
        process.exit(0);
      }
    }

    // Get user email from auth.users for display
    let userEmail = 'unknown@example.com';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      if (authUser?.user?.email) {
        userEmail = authUser.user.email;
      }
    } catch (error) {
      // Ignore if we can't get email
    }

    // Promote to admin
    console.log(`\n📝 Promoting user to admin...`);
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', targetUserId)
      .select('id, is_admin')
      .single();

    if (updateError) {
      console.error(`${cross} Failed to promote user: ${updateError.message}`);
      process.exit(1);
    }

    if (!data || !data.is_admin) {
      console.error(`${cross} Update completed but is_admin is still false.`);
      process.exit(1);
    }

    // Success!
    console.log(`${checkmark} User promoted to admin successfully!`);
    console.log(`\n${colors.bold}User Details:${colors.reset}`);
    console.log(`   ID: ${targetUserId}`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   Admin Status: ${colors.green}${colors.bold}TRUE${colors.reset}`);
    
    console.log(`\n${colors.green}${colors.bold}✅ Success! You can now run the smoke test.${colors.reset}`);
    console.log(`   Run: ${colors.cyan}npx tsx scripts/launch-day-smoketest.ts${colors.reset}\n`);

  } catch (error) {
    console.error(`${cross} Unexpected error:`, error);
    process.exit(1);
  }
}

// Get user ID from command line args
const userId = process.argv[2];

// Run the promotion
promoteToAdmin(userId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
