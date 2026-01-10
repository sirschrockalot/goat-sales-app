'use client';

/**
 * Manager Dashboard
 * Admin view for tracking team performance and curating rebuttals
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Phone, 
  TrendingUp, 
  Target, 
  Award, 
  ArrowLeft,
  CheckCircle,
  Users,
  BarChart3
} from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalCallsToday: number;
  averageTeamScore: number;
  topObjection: string;
  totalClinches: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  dailyStreak: number;
  totalCalls: number;
  averageScore: number;
}

interface ObjectionTrend {
  objection: string;
  count: number;
}

interface Rebuttal {
  id: string | null;
  callId: string;
  rebuttalText: string;
  score: number;
  userName: string;
  createdAt: string;
  isVerified: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [objectionTrends, setObjectionTrends] = useState<ObjectionTrend[]>([]);
  const [rebuttals, setRebuttals] = useState<Rebuttal[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leaderboardRes, objectionsRes, rebuttalsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/leaderboard'),
          fetch('/api/admin/objections'),
          fetch('/api/admin/rebuttals'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          setLeaderboard(leaderboardData.leaderboard || []);
        }

        if (objectionsRes.ok) {
          const objectionsData = await objectionsRes.json();
          setObjectionTrends(objectionsData.trends || []);
        }

        if (rebuttalsRes.ok) {
          const rebuttalsData = await rebuttalsRes.json();
          setRebuttals(rebuttalsData.rebuttals || []);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching dashboard data:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleVerifyRebuttal = async (rebuttalId: string) => {
    try {
      const response = await fetch('/api/admin/rebuttals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebuttalId }),
      });

      if (response.ok) {
        setRebuttals((prev) =>
          prev.map((r) => (r.id === rebuttalId ? { ...r, isVerified: true } : r))
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error verifying rebuttal:', error);
      }
    }
  };

  const handleViewCalls = (userId: string) => {
    router.push(`/admin/calls?userId=${userId}`);
  };

  // Show loading or redirect if not admin
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // If not admin, show access denied (will redirect via useEffect)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">Access Denied</div>
          <div className="text-gray-400">You don't have permission to view this page.</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-gray-400 active:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">Manager Dashboard</h1>
          <p className="text-gray-400">Team performance & rebuttal curation</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Phone}
            label="Total Calls Today"
            value={stats?.totalCallsToday || 0}
            color="#22C55E"
          />
          <MetricCard
            icon={TrendingUp}
            label="Average Team Score"
            value={`${stats?.averageTeamScore || 0}/100`}
            color="#3B82F6"
          />
          <MetricCard
            icon={Target}
            label="Top Objection"
            value={stats?.topObjection || 'None'}
            color="#EAB308"
          />
          <MetricCard
            icon={Award}
            label="Total Clinches"
            value={stats?.totalClinches || 0}
            color="#22C55E"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leaderboard */}
          <div
            className="rounded-2xl p-6 border border-white/10"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6" style={{ color: '#22C55E' }} />
              <h2 className="text-2xl font-bold">Team Leaderboard</h2>
            </div>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((rep, index) => (
                  <motion.div
                    key={rep.userId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl border border-white/10 flex items-center justify-between"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                        <span className="font-semibold">{rep.name}</span>
                        {rep.dailyStreak > 0 && (
                          <span className="text-xs px-2 py-1 rounded bg-[#22C55E]/20 text-[#22C55E]">
                            🔥 {rep.dailyStreak} day streak
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {rep.totalCalls} calls • Avg: {rep.averageScore}/100
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewCalls(rep.userId)}
                      className="px-4 py-2 rounded-lg text-sm bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/30 transition-colors"
                    >
                      View Calls
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">No data available</div>
              )}
            </div>
          </div>

          {/* Objection Trends */}
          <div
            className="rounded-2xl p-6 border border-white/10"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6" style={{ color: '#3B82F6' }} />
              <h2 className="text-2xl font-bold">Objection Trends</h2>
            </div>
            <div className="space-y-3">
              {objectionTrends.length > 0 ? (
                objectionTrends.map((trend, index) => {
                  const maxCount = Math.max(...objectionTrends.map(t => t.count));
                  const percentage = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                  
                  return (
                    <motion.div
                      key={trend.objection}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span>{trend.objection}</span>
                        <span className="text-gray-400">{trend.count}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                          className="h-full bg-[#3B82F6]"
                          style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8">No objection data</div>
              )}
            </div>
          </div>
        </div>

        {/* Hall of Fame */}
        <div
          className="rounded-2xl p-6 border border-[#22C55E]/30"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6" style={{ color: '#22C55E' }} />
            <h2 className="text-2xl font-bold">Hall of Fame - Rebuttal Curation</h2>
          </div>
          <div className="space-y-4">
            {rebuttals.length > 0 ? (
              rebuttals.map((rebuttal, index) => (
                <motion.div
                  key={`${rebuttal.callId}-${index}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-white/10"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold">{rebuttal.userName}</span>
                        <span className="text-xs px-2 py-1 rounded bg-[#22C55E]/20 text-[#22C55E]">
                          Score: {rebuttal.score}
                        </span>
                        {rebuttal.isVerified && (
                          <span className="text-xs px-2 py-1 rounded bg-[#EAB308]/20 text-[#EAB308] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm italic leading-relaxed">"{rebuttal.rebuttalText}"</p>
                    </div>
                    {!rebuttal.isVerified && rebuttal.id && (
                      <button
                        onClick={() => handleVerifyRebuttal(rebuttal.id!)}
                        className="px-4 py-2 rounded-lg text-sm bg-[#22C55E] text-white hover:bg-[#16a34a] transition-colors flex items-center gap-2 whitespace-nowrap"
                        style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Official Verify
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">No high-scoring rebuttals yet</div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl p-6 border border-white/10"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: `0 0 20px ${color}30`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}
