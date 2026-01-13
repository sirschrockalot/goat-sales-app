-- Add margin integrity tracking columns to sandbox_battles table
-- Tracks profit zone analysis and weighted margin preservation scoring

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS margin_integrity INTEGER CHECK (margin_integrity >= 0 AND margin_integrity <= 100);

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS calculated_profit NUMERIC(10, 2);

-- Create index for margin integrity queries
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_margin_integrity ON sandbox_battles(margin_integrity DESC);

-- Add comments
COMMENT ON COLUMN sandbox_battles.margin_integrity IS 'Weighted margin preservation score (0-100): 100 = $15k+ profit (Green), 85 = $12k-$14,999, 70 = $8k-$11,999, 0 = <$8k (Red)';
COMMENT ON COLUMN sandbox_battles.calculated_profit IS 'Calculated profit from deal: ARV - Purchase Price - Repairs - Closing Costs (3%)';
