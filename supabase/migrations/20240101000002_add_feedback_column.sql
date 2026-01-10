-- Add feedback column to calls table for storing AI coaching feedback
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add comment
COMMENT ON COLUMN calls.feedback IS 'AI-generated coaching feedback from judge evaluation';
