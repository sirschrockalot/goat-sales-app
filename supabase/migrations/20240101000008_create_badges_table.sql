-- Create badges table for achievement system
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_type)
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON badges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: System can insert badges (via service role)
CREATE POLICY "System can insert badges"
  ON badges
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Badge types enum (for reference)
-- 'the_closer' - 10 "The Clinch" gates passed in a row
-- 'unshakeable' - Zero "Uptalk" detected in Level 5 Gauntlet call
-- 'script_god' - 100% adherence to 2.0 Wholesale Script mapping
-- 'heat_streak_10' - 10 consecutive on-script sentences
-- 'heat_streak_25' - 25 consecutive on-script sentences
-- 'heat_streak_50' - 50 consecutive on-script sentences
-- 'gauntlet_master' - Completed all 5 Gauntlet levels
-- 'perfect_score' - Achieved 100 Goat Score
-- 'approval_master' - Passed Approval/Denial gate 20 times
-- 'fact_finder' - Passed Fact-Finding gate 20 times

COMMENT ON TABLE badges IS 'User achievement badges for gamification';
COMMENT ON COLUMN badges.badge_type IS 'Unique identifier for badge type';
COMMENT ON COLUMN badges.metadata IS 'Additional badge data (e.g., streak count, score)';
