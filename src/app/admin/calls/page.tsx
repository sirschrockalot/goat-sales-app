'use client';

/**
 * Admin Calls View
 * Shows filtered call history for a specific user
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';

interface Call {
  id: string;
  goat_score: number;
  created_at: string;
  persona_mode: string;
  rebuttal_of_the_day: string | null;
}

export default function AdminCallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, loading: authLoading } = useAuth();
  const userId = searchParams?.get('userId') || null;
  const [calls, setCalls] = useState<Call[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!userId) {
      router.push('/admin/dashboard');
      return;
    }

    const fetchCalls = async () => {
      try {
        const response = await fetch(`/api/admin/calls?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setCalls(data.calls || []);
          setUserName(data.userName || 'Unknown User');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching calls:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [userId, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-400">Loading calls...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">Access Denied</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4 text-gray-400 active:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2">Call History</h1>
          <p className="text-gray-400">{userName}</p>
        </div>

        <div className="space-y-4">
          {calls.length > 0 ? (
            calls.map((call, index) => (
              <motion.div
                key={call.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-[#22C55E]/30 transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                onClick={() => router.push(`/calls/${call.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="text-3xl font-bold"
                      style={{
                        color: call.goat_score >= 90 ? '#22C55E' : call.goat_score >= 80 ? '#3B82F6' : '#EAB308',
                      }}
                    >
                      {call.goat_score}
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(call.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{call.persona_mode}</div>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                {call.rebuttal_of_the_day && call.rebuttal_of_the_day !== 'None' && (
                  <div className="mt-4 p-3 rounded-lg border border-[#22C55E]/30" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <div className="text-xs text-[#22C55E] mb-1 font-semibold">Rebuttal of the Day</div>
                    <div className="text-sm italic">"{call.rebuttal_of_the_day}"</div>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-12">No calls found</div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
