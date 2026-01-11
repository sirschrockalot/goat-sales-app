'use client';

/**
 * AI Training Center Component
 * Displays AI learning moments and allows admins to apply prompt optimizations
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, AlertCircle, CheckCircle2, Clock, TrendingDown, TrendingUp } from 'lucide-react';

interface AIOptimization {
  id: string;
  assistant_id: string;
  call_id: string;
  detected_weakness: string;
  suggested_prompt_tweak: string;
  sentiment_score: number;
  humanity_score: number;
  priority: 'high' | 'medium' | 'low';
  applied: boolean;
  applied_at: string | null;
  created_at: string;
}

export default function AITrainingCenter() {
  const [optimizations, setOptimizations] = useState<AIOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unapplied' | 'high'>('all');

  useEffect(() => {
    fetchOptimizations();
  }, [filter]);

  const fetchOptimizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'unapplied') {
        params.append('applied', 'false');
      } else if (filter === 'high') {
        params.append('priority', 'high');
      }

      const response = await fetch(`/api/admin/ai-optimizations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOptimizations(data.optimizations || []);
      }
    } catch (error) {
      console.error('Error fetching optimizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyOptimization = async (optimization: AIOptimization) => {
    try {
      setApplying(optimization.id);
      const response = await fetch('/api/admin/apply-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationId: optimization.id,
          assistantId: optimization.assistant_id,
        }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchOptimizations();
      } else {
        const error = await response.json();
        alert(`Failed to apply optimization: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying optimization:', error);
      alert('Failed to apply optimization');
    } finally {
      setApplying(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'medium':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'low':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getHumanityScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#22C55E]';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unappliedCount = optimizations.filter(o => !o.applied).length;
  const highPriorityCount = optimizations.filter(o => o.priority === 'high' && !o.applied).length;
  const avgHumanityScore = optimizations.length > 0
    ? Math.round(optimizations.reduce((sum, o) => sum + o.humanity_score, 0) / optimizations.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">AI Training Center</h2>
            <p className="text-sm text-gray-400">Continuous Learning Loop & Prompt Optimization</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 border border-white/10 bg-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Unapplied Optimizations</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{unappliedCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border border-white/10 bg-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">High Priority</span>
            <Zap className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{highPriorityCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-4 border border-white/10 bg-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Avg. Humanity Score</span>
            {avgHumanityScore >= 80 ? (
              <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${getHumanityScoreColor(avgHumanityScore)}`}>
            {avgHumanityScore}/100
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filter === 'all'
              ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50'
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unapplied')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filter === 'unapplied'
              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}
        >
          Unapplied ({unappliedCount})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filter === 'high'
              ? 'bg-red-400/20 text-red-400 border border-red-400/50'
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}
        >
          High Priority ({highPriorityCount})
        </button>
      </div>

      {/* Optimizations List */}
      <div className="space-y-4">
        {optimizations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No AI learning moments found</p>
            <p className="text-sm mt-2">Optimizations will appear here as the AI learns from calls</p>
          </div>
        ) : (
          optimizations.map((optimization, index) => (
            <motion.div
              key={optimization.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl p-6 border ${
                optimization.applied
                  ? 'border-[#22C55E]/30 bg-[#22C55E]/5'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(optimization.priority)}`}>
                      {optimization.priority.toUpperCase()}
                    </span>
                    {optimization.applied && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Applied
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(optimization.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {optimization.detected_weakness}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    {optimization.suggested_prompt_tweak}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <div className={`text-2xl font-bold mb-1 ${getHumanityScoreColor(optimization.humanity_score)}`}>
                    {optimization.humanity_score}
                  </div>
                  <div className="text-xs text-gray-400">Humanity Score</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs text-gray-400">
                  Assistant: <span className="text-gray-300 font-mono">{optimization.assistant_id.substring(0, 8)}...</span>
                </div>
                {!optimization.applied && (
                  <button
                    onClick={() => applyOptimization(optimization)}
                    disabled={applying === optimization.id}
                    className="px-4 py-2 rounded-lg bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50 font-semibold text-sm transition-all hover:bg-[#22C55E]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {applying === optimization.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Apply Tweak
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
