'use client';

/**
 * Training Monitor Page
 * Admin-only page for monitoring autonomous self-play sessions
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrainingMonitor from '@/components/TrainingMonitor';
import { useAuth } from '@/contexts/AuthContext';

export default function TrainingMonitorPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

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
