'use client';

/**
 * Onboarding Page
 * Welcome screen for new users showing their assigned training path
 * Triggers on first login after email confirmation
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Home, 
  Handshake, 
  CheckCircle, 
  ArrowRight,
  Play,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseClient } from '@/lib/supabase';

interface OnboardingData {
  assignedPath: 'acquisitions' | 'dispositions' | null;
  hasCompletedOnboarding: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!user) {
        if (!authLoading) {
          // Only redirect if not already on login page
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            router.push('/login');
          }
        }
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('assigned_path, onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching onboarding data:', error);
          // If profile doesn't exist yet, allow user to stay on onboarding page
          // Don't redirect - let them complete onboarding
          setOnboardingData({
            assignedPath: null,
            hasCompletedOnboarding: false,
          });
          setLoading(false);
          return;
        }

        setOnboardingData({
          assignedPath: profile?.assigned_path || null,
          hasCompletedOnboarding: profile?.onboarding_completed || false,
        });

        // If onboarding already completed, redirect to home
        // But only if we're not already on the home page
        if (profile?.onboarding_completed) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error in onboarding:', error);
        // Don't redirect on error - allow user to stay on onboarding page
        setOnboardingData({
          assignedPath: null,
          hasCompletedOnboarding: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [user, authLoading]);

  const handleCompleteOnboarding = async () => {
    if (!user || completing) return; // Prevent double-clicks

    setCompleting(true);
    try {
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
      });

      if (response.ok) {
        const data = await response.json();
        // Wait a moment for the database update to propagate
        await new Promise(resolve => setTimeout(resolve, 300));
        // Use replace instead of push to prevent back button issues
        router.replace('/');
      } else {
        // If API fails, show error but still allow navigation
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to complete onboarding:', errorData);
        // Still navigate - the user should be able to proceed
        await new Promise(resolve => setTimeout(resolve, 300));
        router.replace('/');
      }
    } catch (error) {
      // Log error but still allow navigation
      console.error('Error completing onboarding:', error);
      // Still navigate - don't block the user
      await new Promise(resolve => setTimeout(resolve, 300));
      router.replace('/');
    } finally {
      // Don't reset completing state immediately - let the navigation happen first
      // The component will unmount on navigation anyway
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingData) {
    return null;
  }

  const isAcquisitions = onboardingData.assignedPath === 'acquisitions';
  const pathColor = isAcquisitions ? '#22C55E' : '#3B82F6';
  const pathName = isAcquisitions ? 'Acquisitions' : 'Dispositions';
  const pathIcon = isAcquisitions ? Home : Handshake;
  const PathIcon = pathIcon;

  // Logic Gates summary based on path
  const logicGates = isAcquisitions
    ? [
        { name: 'The Intro (The "Old Friend" Entry)', description: 'Set the "Approval/Denial" frame and build immediate energy' },
        { name: 'Fact Find (The "Motivation" Dig)', description: 'Uncover the "Why" and build a human connection' },
        { name: 'The House (The What)', description: 'Ask "What will I see when I walk through the front door?"' },
        { name: 'Negotiation (The Inches)', description: 'Negotiate in small increments, not large drops' },
        { name: 'The Clinch (The Close)', description: 'Use the motivation from Step 2 against objections' },
      ]
    : [
        { name: 'The Hook (The Numbers)', description: 'Capture interest with profit potential and ROI' },
        { name: 'The Narrative (The Comp Analysis)', description: 'Build confidence in valuation using market data' },
        { name: 'The Scarcity Anchor (The Competition)', description: 'Force a decision by establishing urgency' },
        { name: 'The Terms (Transaction Clarity)', description: 'Filter for real buyers with non-negotiable terms' },
        { name: 'The Clinch (The Assignment)', description: 'Get the assignment of contract signed immediately' },
      ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8" style={{ color: pathColor }} />
            <h1 className="text-4xl font-bold">Welcome to Sales Goat</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Your training journey begins here
          </p>
        </div>

        {/* Path Assignment Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-8 border-2 mb-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: `${pathColor}40`,
            boxShadow: `0 0 30px ${pathColor}30`,
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `${pathColor}20`,
                boxShadow: `0 0 20px ${pathColor}30`,
              }}
            >
              <PathIcon className="w-8 h-8" style={{ color: pathColor }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {pathName} Training Path
              </h2>
              <p className="text-gray-400">
                {isAcquisitions
                  ? 'Master the art of acquiring properties from homeowners'
                  : 'Master the art of selling assignments to investors'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Goat Fundamentals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-6 border border-white/10 mb-6"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6" style={{ color: pathColor }} />
            <h3 className="text-xl font-bold">Goat Fundamentals</h3>
          </div>
          <p className="text-gray-300 mb-6">
            Your {pathName} path follows these 5 Logic Gates. Master each one to become a Sales Goat:
          </p>
          <div className="space-y-3">
            {logicGates.map((gate, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/10"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${pathColor}20`,
                    color: pathColor,
                  }}
                >
                  <span className="text-sm font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">{gate.name}</div>
                  <div className="text-xs text-gray-400">{gate.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Video/Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl p-6 border border-white/10 mb-6"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Play className="w-6 h-6" style={{ color: pathColor }} />
            <h3 className="text-xl font-bold">Quick Start Guide</h3>
          </div>
          <div className="space-y-4 text-gray-300">
            <p>
              {isAcquisitions
                ? 'In the Acquisitions path, you\'ll practice calling skeptical homeowners who are considering selling. Your goal is to uncover their motivation, assess the property condition, and close the deal using the 5 Logic Gates.'
                : 'In the Dispositions path, you\'ll practice calling investors and cash buyers. Your goal is to present deals with clear numbers, build confidence with comps, create urgency, and get assignments signed quickly.'}
            </p>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
              <CheckCircle className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Pro Tip:</strong> Start with Level 1 Gauntlet challenges to build confidence. 
                Each level increases in difficulty, testing your mastery of the Logic Gates.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex justify-center"
        >
          <button
            onClick={handleCompleteOnboarding}
            disabled={completing}
            className="px-8 py-4 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-semibold rounded-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
            }}
          >
            {completing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Training
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
