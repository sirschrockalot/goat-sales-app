-- Add is_verified column to rebuttals table for admin curation
-- Only add if the rebuttals table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'rebuttals'
  ) THEN
    ALTER TABLE rebuttals
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    
    -- Create index for verified rebuttals
    CREATE INDEX IF NOT EXISTS idx_rebuttals_is_verified ON rebuttals(is_verified) WHERE is_verified = TRUE;
    
    -- Add comment
    COMMENT ON COLUMN rebuttals.is_verified IS 'Admin-verified "Gold Standard" rebuttals';
  ELSE
    RAISE NOTICE 'rebuttals table does not exist, skipping is_verified column addition';
  END IF;
END $$;
