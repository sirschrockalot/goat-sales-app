-- Add experience points (XP) column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goat_mode_time INTEGER DEFAULT 0; -- Total seconds in Goat Mode

-- Create index on experience_points for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(experience_points);

-- Add comment
COMMENT ON COLUMN profiles.experience_points IS 'Total experience points earned (doubled during Goat Mode)';
COMMENT ON COLUMN profiles.goat_mode_time IS 'Total time spent in Goat Mode (in seconds)';
