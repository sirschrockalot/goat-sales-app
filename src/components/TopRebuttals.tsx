'use client';

/**
 * Top Rebuttals Leaderboard Component
 * Shows the best "Rebuttals of the Day" from the database
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';

interface TopRebuttal {
  id: string;
  rebuttal_of_the_day: string;
  goat_score: number;
  persona_mode: string;
  created_at: string;
  user_id: string;
}

export default function TopRebuttals() {
  const [rebuttals, setRebuttals] = useState<TopRebuttal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopRebuttals = async () => {
      try {
        const response = await fetch('/api/rebuttals/top');
        if (response.ok) {
          const data = await response.json();
          setRebuttals(data);
        }
      } catch (error) {
        console.error('Error fetching top rebuttals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRebuttals();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-lg font-semibold">Top Rebuttals</h3>
        </div>
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (rebuttals.length === 0) {
    return (
      <div className="rounded-2xl p-6 border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-lg font-semibold">Top Rebuttals</h3>
        </div>
        <div className="text-sm text-gray-400">No rebuttals yet. Start training to see the best lines!</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl p-6 border border-white/10"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-[#22C55E]" />
        <h3 className="text-lg font-semibold">Top Rebuttals</h3>
      </div>
      <div className="space-y-4">
        {rebuttals.map((rebuttal, index) => (
          <motion.div
            key={rebuttal.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg border border-white/10"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#3B82F6] flex items-center justify-center text-sm font-bold text-[#0B0E14]">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-xs text-gray-400">
                    Score: {rebuttal.goat_score}/100
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400 capitalize">
                    {rebuttal.persona_mode}
                  </span>
                </div>
                <p className="text-sm italic text-gray-300 leading-relaxed">
                  "{rebuttal.rebuttal_of_the_day}"
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
