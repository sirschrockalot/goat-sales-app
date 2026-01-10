-- Add assigned_path column to profiles table
-- This stores the training path (acquisitions or dispositions) assigned during invitation

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS assigned_path TEXT CHECK (assigned_path IN ('acquisitions', 'dispositions')) DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_path ON profiles(assigned_path);

-- Add comment
COMMENT ON COLUMN profiles.assigned_path IS 'Training path assigned during invitation: acquisitions or dispositions';
