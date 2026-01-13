/**
 * Verify User Email and Promote to Admin
 * Finds user by email, verifies their email, and promotes to admin
 * 
 * Usage: npx tsx scripts/verify-and-promote-user.ts <email>
 * Example: npx tsx scripts/verify-and-promote-user.ts joel.schrock@presidentialdigs.com
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

// Also try .env.production for production Supabase
const prodEnvPath = path.join(process.cwd(), '.env.production');
if (fs.existsSync(prodEnvPath)) {
  const envFile = fs.readFileSync(prodEnvPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        // Only use if not already set and not a placeholder
        if (!process.env[key] && !value.includes('your-') && !value.includes('your_')) {
          process.env[key] = value;
        }
      }
    }
  });
}

// Use production Supabase URL from .env.local (commented out line)
const supabaseUrlFromLocal = fs.existsSync(envPath) 
  ? fs.readFileSync(envPath, 'utf-8').split('\n').find(line => line.includes('NEXT_PUBLIC_SUPABASE_URL') && line.includes('cwnvhhzzcjzhcaozazji'))
  : null;

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  // Extract from commented line in .env.local
  if (supabaseUrlFromLocal) {
    const match = supabaseUrlFromLocal.match(/https:\/\/[^\s]+/);
    if (match) {
      supabaseUrl = match[0];
      process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    }
  }
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`${cross} Missing required environment variables:`);
  console.error(`   - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.error(`   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}`);
  console.error(`\n   Please ensure these are set in .env.local or .env.production`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAndPromoteUser(email: string) {
  console.log(`${colors.bold}${colors.cyan}🐐 Verify User and Promote to Admin${colors.reset}\n`);
  console.log(`📧 Looking for user: ${email}\n`);

  try {
    // Step 1: Find user by email in auth.users
    console.log('🔍 Step 1: Finding user in Supabase Auth...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`${cross} Error listing users: ${listError.message}`);
      process.exit(1);
    }

    const user = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`${cross} User not found with email: ${email}`);
      console.error(`\n   Available users:`);
      users?.slice(0, 5).forEach((u: any) => {
        console.error(`   - ${u.email || 'No email'} (${u.id.substring(0, 8)}...)`);
      });
      process.exit(1);
    }

    console.log(`${checkmark} Found user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.created_at}`);

    // Step 2: Verify email if not already verified
    if (!user.email_confirmed_at) {
      console.log(`\n📧 Step 2: Verifying email...`);
      const { data: updatedUser, error: verifyError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          email_confirm: true,
        }
      );

      if (verifyError) {
        console.error(`${cross} Failed to verify email: ${verifyError.message}`);
        process.exit(1);
      }

      console.log(`${checkmark} Email verified successfully!`);
    } else {
      console.log(`\n${checkmark} Step 2: Email already verified`);
    }

    // Step 3: Check if profile exists
    console.log(`\n👤 Step 3: Checking profile...`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error(`${cross} Error checking profile: ${profileError.message}`);
      process.exit(1);
    }

    if (!profile) {
      console.log(`   ⚠️  Profile not found, creating one...`);
      const { data: newProfile, error: createError } = await (supabase as any)
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0] || 'User',
          is_admin: true,
          onboarding_completed: true,
        } as any)
        .select()
        .single();

      if (createError) {
        console.error(`${cross} Failed to create profile: ${createError.message}`);
        process.exit(1);
      }

      console.log(`${checkmark} Profile created with admin status!`);
    } else {
      console.log(`${checkmark} Profile found:`);
      console.log(`   Name: ${profile.name || 'Not set'}`);
      console.log(`   Admin: ${profile.is_admin ? 'Yes' : 'No'}`);

      // Step 4: Promote to admin and complete onboarding if not already
      const needsUpdate = !profile.is_admin || !profile.onboarding_completed;
      
      if (needsUpdate) {
        console.log(`\n👑 Step 4: Updating user status...`);
        const updateData: any = {};
        if (!profile.is_admin) {
          updateData.is_admin = true;
        }
        if (!profile.onboarding_completed) {
          updateData.onboarding_completed = true;
        }
        
        const { data: updatedProfile, error: updateError } = await (supabase as any)
          .from('profiles')
          .update(updateData as any)
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error(`${cross} Failed to update profile: ${updateError.message}`);
          process.exit(1);
        }

        if (!profile.is_admin) {
          console.log(`${checkmark} User promoted to admin successfully!`);
        }
        if (!profile.onboarding_completed) {
          console.log(`${checkmark} Onboarding marked as completed!`);
        }
      } else {
        console.log(`\n${checkmark} Step 4: User is already an admin and onboarding is completed`);
      }
    }

    // Success!
    console.log(`\n${colors.green}${colors.bold}✅ Success!${colors.reset}`);
    console.log(`\n${colors.bold}User Details:${colors.reset}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${colors.green}${colors.bold}YES${colors.reset}`);
    console.log(`   Admin Status: ${colors.green}${colors.bold}TRUE${colors.reset}`);
    console.log(`   Onboarding Completed: ${colors.green}${colors.bold}YES${colors.reset}`);
    console.log(`\n${colors.cyan}You can now log in at: https://goat-sales-app.vercel.app/login${colors.reset}`);
    console.log(`${colors.cyan}You should be able to access the app without being redirected to onboarding.${colors.reset}\n`);

  } catch (error) {
    console.error(`${cross} Unexpected error:`, error);
    process.exit(1);
  }
}

// Get email from command line args
const email = process.argv[2];

if (!email) {
  console.error(`${cross} Please provide an email address`);
  console.error(`\n   Usage: npx tsx scripts/verify-and-promote-user.ts <email>`);
  console.error(`   Example: npx tsx scripts/verify-and-promote-user.ts joel.schrock@presidentialdigs.com\n`);
  process.exit(1);
}

// Run the verification and promotion
verifyAndPromoteUser(email).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
