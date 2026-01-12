'use client';

/**
 * Home Page - Sales Dojo
 * Main entry point matching the mockup design
 */

export const dynamic = 'force-dynamic';

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
    // Don't do anything while auth is still loading
    if (loading) {
      return;
    }

    // Prevent infinite loops by checking if we're already on the target page
    if (!user) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.push('/login');
      }
      return;
    }

    // Check if user needs onboarding
    const checkOnboarding = async () => {
      try {
        const { createSupabaseClient } = await import('@/lib/supabase');
        const supabase = createSupabaseClient();
        if (!supabase) {
          // Supabase client not available, skip onboarding check
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // If onboarding not completed, redirect to onboarding page
        // But only if we're not already on the onboarding page
        if (!profileError && profile && !profile.onboarding_completed) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding') {
            router.push('/onboarding');
          }
        }
      } catch (error) {
        // If error, allow user to proceed to home
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking onboarding:', error);
        }
      }
    };

    checkOnboarding();
  }, [user, loading]);

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
