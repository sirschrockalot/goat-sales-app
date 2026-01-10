-- Add rebuttal_of_the_day column to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS rebuttal_of_the_day TEXT;

-- Add comment
COMMENT ON COLUMN calls.rebuttal_of_the_day IS 'Best rebuttal or line from the call, as identified by AI grading';
