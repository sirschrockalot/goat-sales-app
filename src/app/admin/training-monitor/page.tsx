'use client';

/**
 * Training Monitor Page
 * Admin-only page for monitoring autonomous self-play sessions
 */

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrainingMonitor from '@/components/TrainingMonitor';
import { useAuth } from '@/contexts/AuthContext';

export default function TrainingMonitorPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, user, refreshProfile } = useAuth();

  // Try to refresh profile on mount to ensure admin status is up to date
  useEffect(() => {
    if (!authLoading && user) {
      refreshProfile();
    }
  }, [authLoading, user, refreshProfile]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      console.warn('User is not admin, redirecting. User:', user);
      router.push('/');
    }
  }, [isAdmin, authLoading, router, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-acquisition border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return <TrainingMonitor />;
}
