-- Add script_adherence column to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS script_adherence JSONB;

-- Add comment
COMMENT ON COLUMN calls.script_adherence IS 'Script deviation analysis including gate faithfulness scores, critical skips, and coaching insights';

-- Create index for querying by script adherence
CREATE INDEX IF NOT EXISTS idx_calls_script_adherence ON calls USING GIN (script_adherence);
