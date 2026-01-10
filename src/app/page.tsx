'use client';

/**
 * Home Page - Sales Dojo
 * Main entry point matching the mockup design
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HomeScreen from '@/components/HomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  // Check if user needs onboarding
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Check if user needs onboarding
      const checkOnboarding = async () => {
        try {
          const supabase = createSupabaseClient();
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();

          // If onboarding not completed, redirect to onboarding page
          if (!profileError && profile && !profile.onboarding_completed) {
            router.push('/onboarding');
          }
        } catch (error) {
          // If error, allow user to proceed to home
          if (process.env.NODE_ENV === 'development') {
            console.error('Error checking onboarding:', error);
          }
        }
      };

      checkOnboarding();
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return <HomeScreen />;
}
