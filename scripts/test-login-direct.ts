import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Testing login with sarah.johnson@test.com...');
  console.log('Supabase URL:', supabaseUrl);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'sarah.johnson@test.com',
    password: 'testpassword123',
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('Error code:', error.status);
    return;
  }
  
  console.log('✅ Login successful!');
  console.log('User ID:', data.user?.id);
  console.log('User Email:', data.user?.email);
}

testLogin().catch(console.error);
