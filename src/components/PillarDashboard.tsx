'use client';

/**
 * Pillar Dashboard Component
 * Real-time visualization of discovery pillar compliance and PA walkthrough progress
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export interface PillarFlags {
  motivation: boolean;
  condition: boolean;
  timeline: boolean;
  priceAnchor: boolean;
}

export interface PillarDashboardProps {
  callId: string;
  onPillarUpdate?: (flags: PillarFlags) => void;
}

export default function PillarDashboard({ callId, onPillarUpdate }: PillarDashboardProps) {
  const [pillars, setPillars] = useState<PillarFlags>({
    motivation: false,
    condition: false,
    timeline: false,
    priceAnchor: false,
  });
  const [offerStatus, setOfferStatus] = useState<'LOCKED' | 'READY'>('LOCKED');
  const [walkthroughProgress, setWalkthroughProgress] = useState(0); // 0-58 paragraphs
  const [loading, setLoading] = useState(true);

  // Poll for pillar status
  useEffect(() => {
    if (!callId) return;

    const pollPillars = async () => {
      try {
        const response = await fetch(`/api/calls/${callId}/pillar-status`);
        if (response.ok) {
          const data = await response.json();
          setPillars(data.flags || pillars);
          setOfferStatus(data.allPillarsMet ? 'READY' : 'LOCKED');
          setWalkthroughProgress(data.walkthroughProgress || 0);
          
          if (onPillarUpdate) {
            onPillarUpdate(data.flags);
          }
        }
      } catch (error) {
        console.error('Error polling pillar status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollPillars, 2000);
    pollPillars(); // Initial poll

    return () => clearInterval(interval);
  }, [callId, onPillarUpdate]);

  const allPillarsMet = Object.values(pillars).every(v => v);
  const completedPillars = Object.values(pillars).filter(v => v).length;
  const progressPercentage = (completedPillars / 4) * 100;

  const pillarLabels = {
    motivation: 'Motivation (Hidden Why)',
    condition: 'Condition (AS IS Items)',
    timeline: 'Timeline (30-Day/Paragraph 24)',
    priceAnchor: 'Price Anchor (Seller Number First)',
  };

  return (
    <div className="glass-card rounded-2xl p-6 border-2 border-blue-400/30 bg-gradient-to-br from-blue-400/10 to-blue-600/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Pillar Compliance</h3>
            <p className="text-sm text-gray-400">Discovery Progress Monitor</p>
          </div>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Compliance Checkboxes */}
      <div className="space-y-3 mb-6">
        {(Object.keys(pillars) as Array<keyof PillarFlags>).map((pillar) => {
          const isComplete = pillars[pillar];
          return (
            <motion.div
              key={pillar}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                isComplete
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className={`font-semibold ${isComplete ? 'text-green-400' : 'text-gray-400'}`}>
                  {pillarLabels[pillar]}
                </span>
              </div>
              <div className={`text-sm ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>
                {isComplete ? 'Complete' : 'Pending'}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">Discovery Progress</span>
          <span className="text-sm text-gray-400">{completedPillars}/4 Pillars</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Offer Status */}
      <div className="mb-6 p-4 rounded-xl border-2 bg-black/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {offerStatus === 'LOCKED' ? (
              <Lock className="w-5 h-5 text-red-400" />
            ) : (
              <Unlock className="w-5 h-5 text-green-400" />
            )}
            <span className="font-semibold text-white">Offer Status</span>
          </div>
          <motion.div
            className={`px-4 py-2 rounded-lg font-bold ${
              offerStatus === 'LOCKED'
                ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                : 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
            }`}
            animate={{ scale: offerStatus === 'READY' ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: offerStatus === 'READY' ? Infinity : 0, duration: 2 }}
          >
            {offerStatus}
          </motion.div>
        </div>
        {offerStatus === 'LOCKED' && (
          <p className="text-xs text-gray-400 mt-2 ml-8">
            All 4 pillars must be complete before offer can be revealed
          </p>
        )}
      </div>

      {/* PA Walkthrough Progress (only shown after offer is made) */}
      {offerStatus === 'READY' && walkthroughProgress > 0 && (
        <div className="p-4 rounded-xl border-2 border-amber-400/30 bg-amber-400/10">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">PA Walkthrough Progress</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Paragraphs Completed</span>
            <span className="text-xs text-amber-400">{walkthroughProgress}/58</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${(walkthroughProgress / 58) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Key Sections: {walkthroughProgress >= 4 ? '✓' : '○'} Names/Address |{' '}
            {walkthroughProgress >= 7 ? '✓' : '○'} AS IS | {walkthroughProgress >= 8 ? '✓' : '○'} Price |{' '}
            {walkthroughProgress >= 13 ? '✓' : '○'} Costs | {walkthroughProgress >= 56 ? '✓' : '○'} Memorandum
          </div>
        </div>
      )}

      {/* Missing Pillars Alert */}
      {!allPillarsMet && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">Missing Pillars</span>
          </div>
          <p className="text-xs text-gray-400">
            Continue discovery to unlock offer reveal. Focus on:{' '}
            {Object.entries(pillars)
              .filter(([_, v]) => !v)
              .map(([k]) => pillarLabels[k as keyof PillarFlags])
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
