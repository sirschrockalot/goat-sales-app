-- Update script_segments table to support 8 gates instead of 5
-- This migration updates the CHECK constraint and ensures the table can handle the new 8-gate Presidential Digs script

-- Drop the old constraint
ALTER TABLE script_segments 
  DROP CONSTRAINT IF EXISTS script_segments_gate_number_check;

-- Add new constraint allowing 1-8 gates
ALTER TABLE script_segments 
  ADD CONSTRAINT script_segments_gate_number_check 
  CHECK (gate_number >= 1 AND gate_number <= 8);

-- Update any existing data if needed (optional cleanup)
-- This ensures we don't have orphaned data
-- DELETE FROM script_segments WHERE gate_number > 8;

COMMENT ON TABLE script_segments IS 'Script segments for the 8-gate Presidential Digs Real Estate Wholesaling Sales Script 2.0';
