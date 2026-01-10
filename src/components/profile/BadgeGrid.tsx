'use client';

/**
 * Badge Grid Component
 * Displays user achievement badges in a grid layout
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Zap, Target, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  unlocked_at: string;
  metadata: Record<string, any>;
}

const BADGE_ICONS: Record<string, any> = {
  the_closer: Trophy,
  unshakeable: Award,
  script_god: Star,
  heat_streak_10: Zap,
  heat_streak_25: Zap,
  heat_streak_50: Zap,
  gauntlet_master: Crown,
  perfect_score: Star,
  approval_master: Target,
  fact_finder: Target,
};

const BADGE_COLORS: Record<string, string> = {
  the_closer: '#10b981', // Emerald
  unshakeable: '#f59e0b', // Amber
  script_god: '#8b5cf6', // Purple
  heat_streak_10: '#ef4444', // Red
  heat_streak_25: '#f59e0b', // Amber
  heat_streak_50: '#10b981', // Emerald
  gauntlet_master: '#fbbf24', // Gold
  perfect_score: '#8b5cf6', // Purple
  approval_master: '#3b82f6', // Blue
  fact_finder: '#06b6d4', // Cyan
};

export default function BadgeGrid() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const response = await fetch(`/api/badges?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching badges:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No badges unlocked yet. Keep training!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {badges.map((badge, index) => {
        const Icon = BADGE_ICONS[badge.badge_type] || Trophy;
        const color = BADGE_COLORS[badge.badge_type] || '#10b981';

        return (
          <motion.div
            key={badge.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
          >
            <div
              className="rounded-xl p-4 border-2 flex flex-col items-center justify-center aspect-square cursor-pointer transition-all hover:scale-110"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: `${color}80`,
                boxShadow: `0 0 20px ${color}40`,
              }}
            >
              <Icon
                className="w-8 h-8 mb-2"
                style={{ color }}
              />
              <div className="text-xs font-semibold text-center text-white line-clamp-2">
                {badge.badge_name}
              </div>
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs text-white bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {badge.badge_description}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
