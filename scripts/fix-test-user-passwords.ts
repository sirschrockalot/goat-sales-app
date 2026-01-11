/**
 * Fix Test User Passwords
 * Resets passwords for all test users to ensure they can log in
 * 
 * Usage: npx tsx scripts/fix-test-user-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.development');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testUsers = [
  'sarah.johnson@test.com',
  'mike.chen@test.com',
  'emma.rodriguez@test.com',
  'david.kim@test.com',
  'lisa.thompson@test.com',
];

const testPassword = 'testpassword123';

async function fixPasswords() {
  console.log('🔧 Fixing test user passwords...\n');

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    console.log(`📋 Found ${users.length} total users\n`);

    let fixed = 0;
    let created = 0;
    let errors = 0;

    for (const email of testUsers) {
      const existingUser = users.find((u: any) => u.email === email);

      if (existingUser) {
        // User exists - update password
        console.log(`🔑 Resetting password for: ${email}`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            password: testPassword,
            email_confirm: true, // Ensure email is confirmed
          }
        );

        if (updateError) {
          console.error(`   ✗ Error: ${updateError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Password reset successful`);
          fixed++;
        }
      } else {
        // User doesn't exist - create them
        console.log(`➕ Creating user: ${email}`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: testPassword,
          email_confirm: true,
          user_metadata: {
            name: email.split('@')[0].replace('.', ' '),
          },
        });

        if (createError) {
          console.error(`   ✗ Error: ${createError.message}`);
          errors++;
        } else if (newUser?.user) {
          console.log(`   ✅ User created successfully`);
          created++;

          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: newUser.user.id,
              email: email,
              name: email.split('@')[0].replace('.', ' '),
              is_admin: email === 'sarah.johnson@test.com',
              assigned_path: email.includes('emma') || email.includes('lisa') ? 'dispositions' : 'acquisitions',
              gauntlet_level: 5,
              experience_points: 2000,
              onboarding_completed: true,
            }, { onConflict: 'id' });

          if (profileError) {
            console.error(`   ⚠️  Profile creation error: ${profileError.message}`);
          } else {
            console.log(`   ✅ Profile created`);
          }
        }
      }
    }

    console.log('\n✅ Password fix complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   - Passwords reset: ${fixed}`);
    console.log(`   - Users created: ${created}`);
    console.log(`   - Errors: ${errors}\n`);
    console.log('🔐 All test users now have password: testpassword123\n');

  } catch (error) {
    console.error('\n❌ Error fixing passwords:', error);
    process.exit(1);
  }
}

fixPasswords().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
