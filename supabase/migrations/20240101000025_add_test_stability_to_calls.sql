-- Add test_stability_value column to calls table for A/B testing
-- This tracks which stability setting was used for each call

DO $$ 
BEGIN
  -- Add test_stability_value column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'test_stability_value'
  ) THEN
    ALTER TABLE calls ADD COLUMN test_stability_value NUMERIC(3, 2);
    RAISE NOTICE 'Added test_stability_value column to calls table';
  END IF;
END $$;

-- Add index for performance analysis queries
CREATE INDEX IF NOT EXISTS idx_calls_test_stability ON calls(test_stability_value) WHERE test_stability_value IS NOT NULL;

-- Add comment
COMMENT ON COLUMN calls.test_stability_value IS 'Stability value used for A/B testing (0.35, 0.45, or 0.55). Used to find optimal voice settings.';
