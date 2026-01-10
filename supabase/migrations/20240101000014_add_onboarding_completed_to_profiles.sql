-- Add onboarding_completed column to profiles table
-- Tracks whether user has completed the onboarding flow

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Add comment
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the user has completed the onboarding flow';
