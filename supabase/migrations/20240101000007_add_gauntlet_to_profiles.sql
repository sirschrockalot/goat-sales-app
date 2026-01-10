-- Add gauntlet columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gauntlet_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS gauntlet_progress JSONB DEFAULT '{}'::jsonb;

-- Create index on gauntlet_level for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_gauntlet_level ON profiles(gauntlet_level);

-- Add comment
COMMENT ON COLUMN profiles.gauntlet_level IS 'Current unlocked gauntlet level (1-5)';
COMMENT ON COLUMN profiles.gauntlet_progress IS 'JSON object tracking highest scores per level: {"1": 95, "2": 88, ...}';
