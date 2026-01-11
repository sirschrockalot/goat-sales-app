-- Add missing columns to calls table if they don't exist
DO $$ 
BEGIN
  -- Add call_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'call_status'
  ) THEN
    ALTER TABLE calls ADD COLUMN call_status TEXT CHECK (call_status IN ('connecting', 'connected', 'ended', 'error'));
    RAISE NOTICE 'Added call_status column to calls table';
  END IF;
  
  -- Add ended_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN ended_at TIMESTAMPTZ;
    RAISE NOTICE 'Added ended_at column to calls table';
  END IF;
  
  -- Add rebuttal_of_the_day column (if used by webhook)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'rebuttal_of_the_day'
  ) THEN
    ALTER TABLE calls ADD COLUMN rebuttal_of_the_day TEXT;
    RAISE NOTICE 'Added rebuttal_of_the_day column to calls table';
  END IF;
  
  -- Add script_adherence column (if used by webhook)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'script_adherence'
  ) THEN
    ALTER TABLE calls ADD COLUMN script_adherence JSONB;
    RAISE NOTICE 'Added script_adherence column to calls table';
  END IF;
  
  -- Add metadata column (if used by webhook)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE calls ADD COLUMN metadata JSONB;
    RAISE NOTICE 'Added metadata column to calls table';
  END IF;
END $$;
