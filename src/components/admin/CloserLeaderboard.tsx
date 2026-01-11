'use client';

/**
 * Closer Leaderboard Component
 * Ranks reps by total locked deals and average margin retention
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, MapPin, DollarSign, Target } from 'lucide-react';

interface CloserStats {
  user_id: string;
  name: string;
  email: string;
  total_locked_deals: number;
  avg_margin_retention: number; // Average price variance (negative = good, positive = bad)
  total_contract_value: number;
  avg_goat_score: number;
  deals: Array<{
    id: string;
    final_offer_price: number;
    suggested_buy_price: number;
    price_variance: number;
    goat_score: number;
    created_at: string;
  }>;
}

export default function CloserLeaderboard() {
  const [stats, setStats] = useState<CloserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'deals' | 'margin'>('deals');

  useEffect(() => {
    fetchCloserStats();
  }, [sortBy]);

  const fetchCloserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/closer-stats?sortBy=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error fetching closer stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatVariance = (variance: number | null) => {
    if (variance === null) return 'N/A';
    const sign = variance >= 0 ? '+' : '';
    const color = variance <= 0 ? 'text-[#22C55E]' : 'text-red-400';
    return <span className={color}>{sign}{variance.toFixed(1)}%</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Closer Leaderboard</h2>
            <p className="text-sm text-gray-400">Top performers by deals closed and margin retention</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('deals')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
              sortBy === 'deals'
                ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            By Deals
          </button>
          <button
            onClick={() => setSortBy('margin')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
              sortBy === 'margin'
                ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            By Margin
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {stats.map((rep, index) => (
          <motion.div
            key={rep.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl p-4 border ${
              index === 0
                ? 'border-amber-500/50 bg-amber-500/10'
                : index === 1
                ? 'border-gray-400/50 bg-gray-400/10'
                : index === 2
                ? 'border-amber-600/50 bg-amber-600/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Rank & Name */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                    index === 0
                      ? 'bg-amber-500 text-white'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-amber-600 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-white">{rep.name || rep.email}</div>
                  <div className="text-xs text-gray-400">{rep.email}</div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                {/* Total Deals */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{rep.total_locked_deals}</div>
                  <div className="text-xs text-gray-400">Deals</div>
                </div>

                {/* Margin Retention */}
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatVariance(rep.avg_margin_retention)}
                  </div>
                  <div className="text-xs text-gray-400">Avg Variance</div>
                </div>

                {/* Total Value */}
                <div className="text-center">
                  <div className="text-lg font-bold text-[#22C55E]">
                    {formatCurrency(rep.total_contract_value)}
                  </div>
                  <div className="text-xs text-gray-400">Total Value</div>
                </div>

                {/* Avg Score */}
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-400">
                    {rep.avg_goat_score}%
                  </div>
                  <div className="text-xs text-gray-400">Avg Score</div>
                </div>
              </div>
            </div>

            {/* Deal Breakdown */}
            {rep.deals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-semibold text-gray-400 mb-2">Recent Deals:</div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  {rep.deals.slice(0, 4).map((deal) => (
                    <div key={deal.id} className="p-2 rounded-lg bg-white/5">
                      <div className="text-gray-300">
                        {formatCurrency(deal.final_offer_price)}
                      </div>
                      <div className="text-gray-500">
                        Target: {formatCurrency(deal.suggested_buy_price)}
                      </div>
                      <div className="mt-1">
                        {formatVariance(deal.price_variance)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {stats.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No closed deals yet</p>
          <p className="text-sm mt-2">Deals will appear here once reps start closing contracts</p>
        </div>
      )}
    </div>
  );
}
