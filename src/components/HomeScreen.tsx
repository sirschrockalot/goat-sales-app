'use client';

/**
 * Home Screen Component
 * Matches the Sales Dojo home screen mockup exactly
 * Uses Lucide icons and Tailwind shadow utilities for neon glow
 */

import { useRouter } from 'next/navigation';
import { Home, Handshake, Flame, ShieldCheck, BarChart3, Trophy, LogOut, Activity } from 'lucide-react';
import TopRebuttals from './TopRebuttals';
import { useAuth } from '@/contexts/AuthContext';

interface HomeScreenProps {
  userName?: string;
  dailyStreak?: number;
  weeklyGoal?: number;
}

export default function HomeScreen({
  userName: propUserName,
  dailyStreak: propDailyStreak,
  weeklyGoal = 85,
}: HomeScreenProps) {
  const router = useRouter();
  const { user, loading, isAdmin, signOut } = useAuth();
  
  const userName = propUserName || user?.name || 'Alex M.';
  const dailyStreak = propDailyStreak || user?.dailyStreak || 12;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto">
      {/* Profile Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#22C55E] to-[#3B82F6] flex items-center justify-center text-2xl font-bold text-[#0B0E14]">
            {userName.charAt(0)}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{userName}</h2>
            {isAdmin && (
              <div className="group relative">
                <ShieldCheck 
                  className="w-5 h-5 text-amber-400 transition-transform hover:scale-110" 
                  style={{ 
                    filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))',
                  }}
                />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    color: '#FBBF24',
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
                  }}
                >
                  Sales Manager Access
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{ borderTopColor: 'rgba(0, 0, 0, 0.9)' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-xs text-gray-400">Daily Streak</div>
              <div className="text-sm font-semibold">{dailyStreak} Days</div>
            </div>
          </div>
          {user && (
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* App Title */}
      <h1 className="text-4xl font-bold mb-12 text-center">Sales Dojo</h1>

      {/* Mode Selection Buttons */}
      <div className="space-y-4 mb-12 flex-1">
        {/* Admin Links - Only for admins */}
        {isAdmin && (
          <>
            <a
              href="/admin/dashboard"
              onClick={async (e) => {
                e.preventDefault();
                console.log('Manager Dashboard clicked, isAdmin:', isAdmin, 'user:', user);
                console.log('Navigating to /admin/dashboard...');
                
                try {
                  // Try client-side navigation first
                  await router.push('/admin/dashboard');
                  console.log('router.push completed');
                  
                  // Fallback: if navigation doesn't happen after a short delay, use window.location
                  setTimeout(() => {
                    if (window.location.pathname !== '/admin/dashboard') {
                      console.warn('router.push may have failed, using window.location as fallback');
                      window.location.href = '/admin/dashboard';
                    }
                  }, 500);
                } catch (error) {
                  console.error('Navigation error:', error);
                  // Fallback to window.location if router.push fails
                  window.location.href = '/admin/dashboard';
                }
              }}
              className="w-full rounded-2xl p-6 border-2 border-amber-400/50 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)'
              }}
            >
              <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-8 h-8 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-2xl font-bold text-amber-400 mb-1">MANAGER DASHBOARD</div>
                <div className="text-sm text-gray-400">Team performance & rebuttal curation</div>
              </div>
            </a>
            
            <a
              href="/admin/training-monitor"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await router.push('/admin/training-monitor');
                  setTimeout(() => {
                    if (window.location.pathname !== '/admin/training-monitor') {
                      window.location.href = '/admin/training-monitor';
                    }
                  }, 500);
                } catch (error) {
                  console.error('Navigation error:', error);
                  window.location.href = '/admin/training-monitor';
                }
              }}
              className="w-full rounded-2xl p-6 border-2 border-blue-500/50 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-2xl font-bold text-blue-400 mb-1">TRAINING MONITOR</div>
                <div className="text-sm text-gray-400">AI battle training & metrics</div>
              </div>
            </a>
          </>
        )}

        {/* The Gauntlet */}
        <button
          onClick={() => router.push('/gauntlet')}
          className="w-full rounded-2xl p-6 border-2 border-purple-500 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 mb-4"
          style={{ 
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-2xl font-bold text-purple-400 mb-1">THE GAUNTLET</div>
            <div className="text-sm text-gray-400">5 progressive challenges</div>
          </div>
        </button>

        {/* Acquisition Mode */}
        <button
          onClick={() => router.push('/persona-select?mode=acquisition')}
          className="w-full rounded-2xl p-6 border-2 border-[#22C55E] flex items-center gap-4 active:scale-[0.98] transition-all duration-200"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
            <Home className="w-8 h-8 text-[#22C55E]" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-2xl font-bold text-[#22C55E] mb-1">ACQUISITION MODE</div>
            <div className="text-sm text-gray-400">Train with skeptical sellers</div>
          </div>
        </button>

        {/* Disposition Mode */}
        <button
          onClick={() => router.push('/persona-select?mode=disposition')}
          className="w-full rounded-2xl p-6 border-2 border-[#3B82F6] flex items-center gap-4 active:scale-[0.98] transition-all duration-200"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
            <Handshake className="w-8 h-8 text-[#3B82F6]" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-2xl font-bold text-[#3B82F6] mb-1">DISPOSITION MODE</div>
            <div className="text-sm text-gray-400">Train with savvy investors</div>
          </div>
        </button>
      </div>

      {/* Weekly Goal Progress */}
      <div className="flex flex-col items-center mb-8">
        <div className="text-sm text-gray-400 mb-2">Weekly Goal</div>
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#22C55E"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - weeklyGoal / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#22C55E]">{weeklyGoal}%</div>
              <div className="text-xs text-gray-400">Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Rebuttals Leaderboard */}
      <div className="pb-6">
        <TopRebuttals />
      </div>
    </div>
  );
}
