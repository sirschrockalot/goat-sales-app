-- Add all missing columns to calls table
-- This ensures the calls table has all columns needed by the webhook

DO $$ 
BEGIN
  -- Add persona_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'persona_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN persona_id TEXT;
    RAISE NOTICE 'Added persona_id column to calls table';
  END IF;
  
  -- Add persona_mode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'persona_mode'
  ) THEN
    ALTER TABLE calls ADD COLUMN persona_mode TEXT CHECK (persona_mode IN ('acquisition', 'disposition'));
    RAISE NOTICE 'Added persona_mode column to calls table';
  END IF;
  
  -- Add ended_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN ended_at TIMESTAMPTZ;
    RAISE NOTICE 'Added ended_at column to calls table';
  END IF;
  
  -- Add rebuttal_of_the_day column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'rebuttal_of_the_day'
  ) THEN
    ALTER TABLE calls ADD COLUMN rebuttal_of_the_day TEXT;
    RAISE NOTICE 'Added rebuttal_of_the_day column to calls table';
  END IF;
  
  -- Add script_adherence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'script_adherence'
  ) THEN
    ALTER TABLE calls ADD COLUMN script_adherence JSONB;
    RAISE NOTICE 'Added script_adherence column to calls table';
  END IF;
  
  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE calls ADD COLUMN metadata JSONB;
    RAISE NOTICE 'Added metadata column to calls table';
  END IF;
END $$;
