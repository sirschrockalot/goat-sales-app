'use client';

/**
 * Training Report Component
 * Comprehensive training progress visualization for admin dashboard
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Trophy,
  Target,
  Download,
  Home,
  Handshake,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import type {
  RepAnalytics,
  PathComparison,
  GateMasteryData,
} from '@/lib/getTrainingAnalytics';

interface TrainingAnalytics {
  reps: RepAnalytics[];
  pathComparison: PathComparison[];
  gateMastery: GateMasteryData[];
}

export default function TrainingReport() {
  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/training-analytics');

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch training analytics');
        }
      } catch (err) {
        setError('Failed to fetch training analytics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const exportToCSV = () => {
    if (!analytics) return;

    // Prepare CSV data
    const headers = [
      'Name',
      'Email',
      'Training Path',
      'Gauntlet Level',
      'Average Score',
      'Total Calls',
      'Total XP',
      'Velocity (Levels/Day)',
      'Manager Note',
    ];

    const rows = analytics.reps.map((rep) => [
      rep.name,
      rep.email,
      rep.assignedPath || 'Not Assigned',
      rep.gauntletLevel.toString(),
      rep.averageScore.toString(),
      rep.totalCalls.toString(),
      rep.totalXP.toString(),
      rep.velocity.toFixed(2),
      rep.managerNote,
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 border border-red-500/30" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Sort reps by velocity (fastest learners first), then by level, then by score
  const fastestLearners = [...analytics.reps]
    .sort((a, b) => {
      if (b.gauntletLevel !== a.gauntletLevel) {
        return b.gauntletLevel - a.gauntletLevel;
      }
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.velocity - a.velocity;
    })
    .slice(0, 10); // Top 10

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" style={{ color: '#22C55E' }} />
          <h2 className="text-2xl font-bold">Training Progress Report</h2>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-xl bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/30 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Fastest Learners Leaderboard */}
      <div
        className="rounded-2xl p-6 border border-[#22C55E]/30"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6" style={{ color: '#22C55E' }} />
          <h3 className="text-xl font-bold">Fastest Learners</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Path</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Level</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Avg Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Velocity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Manager Note</th>
              </tr>
            </thead>
            <tbody>
              {fastestLearners.map((rep, index) => (
                <motion.tr
                  key={rep.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="w-4 h-4 text-amber-400" />}
                      <span className="text-sm font-semibold">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium">{rep.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        rep.assignedPath === 'acquisitions'
                          ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                          : rep.assignedPath === 'dispositions'
                          ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {rep.assignedPath === 'acquisitions' ? (
                        <Home className="w-3 h-3 inline mr-1" />
                      ) : rep.assignedPath === 'dispositions' ? (
                        <Handshake className="w-3 h-3 inline mr-1" />
                      ) : null}
                      {rep.assignedPath || 'Not Assigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span className="text-sm">Level {rep.gauntletLevel}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold">{rep.averageScore}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-400">{rep.velocity.toFixed(2)}/day</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-300 italic">{rep.managerNote}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Path Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analytics.pathComparison.map((path, index) => (
          <motion.div
            key={path.path}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: path.path === 'acquisitions' ? '#22C55E40' : '#3B82F640',
              boxShadow: `0 0 20px ${path.path === 'acquisitions' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              {path.path === 'acquisitions' ? (
                <Home className="w-6 h-6" style={{ color: '#22C55E' }} />
              ) : (
                <Handshake className="w-6 h-6" style={{ color: '#3B82F6' }} />
              )}
              <h3 className="text-xl font-bold">
                {path.path === 'acquisitions' ? 'Acquisitions' : 'Dispositions'} Team
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Total Reps" value={path.totalReps} icon={Users} />
              <MetricCard label="Avg Level" value={path.averageLevel.toFixed(1)} icon={Trophy} />
              <MetricCard label="Avg Score" value={`${path.averageScore}%`} icon={Target} />
              <MetricCard label="Total Calls" value={path.totalCalls} icon={Sparkles} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gate Mastery Heatmap */}
      <div
        className="rounded-2xl p-6 border border-amber-400/30"
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6" style={{ color: '#EAB308' }} />
          <h3 className="text-xl font-bold">Gate Mastery Heatmap</h3>
          <span className="text-sm text-gray-400">Team average pass rates</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.gateMastery.map((gate, index) => {
            const colorIntensity = gate.passRate / 100;
            const isLow = gate.passRate < 60;
            const isMedium = gate.passRate >= 60 && gate.passRate < 80;
            const isHigh = gate.passRate >= 80;

            return (
              <motion.div
                key={gate.gateName}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: isLow
                    ? 'rgba(239, 68, 68, 0.1)'
                    : isMedium
                    ? 'rgba(251, 191, 36, 0.1)'
                    : 'rgba(34, 197, 94, 0.1)',
                  borderColor: isLow
                    ? '#ef444440'
                    : isMedium
                    ? '#fbbf2440'
                    : '#22c55e40',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{gate.gateName}</span>
                  {isHigh ? (
                    <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                  ) : isLow ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{gate.passRate}% Pass Rate</span>
                    <span>{gate.totalPasses}/{gate.totalAttempts} attempts</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${gate.passRate}%` }}
                      transition={{ delay: 0.5 + index * 0.05, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: isLow
                          ? '#ef4444'
                          : isMedium
                          ? '#fbbf24'
                          : '#22c55e',
                        boxShadow: `0 0 10px ${isLow ? 'rgba(239, 68, 68, 0.5)' : isMedium ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* All Reps with Manager Notes */}
      <div
        className="rounded-2xl p-6 border border-white/10"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: '#3B82F6' }} />
          <h3 className="text-xl font-bold">All Reps - Manager Notes</h3>
        </div>
        <div className="space-y-3">
          {analytics.reps.map((rep, index) => (
            <motion.div
              key={rep.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.03 }}
              className="p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold">{rep.name}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        rep.assignedPath === 'acquisitions'
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : rep.assignedPath === 'dispositions'
                          ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {rep.assignedPath || 'Not Assigned'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Level {rep.gauntletLevel} • {rep.averageScore}% avg • {rep.totalCalls} calls
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 italic">{rep.managerNote}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component for metric cards
function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="p-3 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
