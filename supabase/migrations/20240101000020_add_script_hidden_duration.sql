-- Add script_hidden_duration column to calls table
-- Tracks time spent in "Pro Mode" (script hidden) for XP multiplier

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS script_hidden_duration INTEGER DEFAULT 0;

COMMENT ON COLUMN calls.script_hidden_duration IS 'Duration in seconds that the script was hidden during the call (Pro Mode). Used for 1.5x XP multiplier.';
