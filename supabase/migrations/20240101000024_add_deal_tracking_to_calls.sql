-- Add deal tracking columns to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suggested_buy_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS final_offer_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS price_variance NUMERIC(5, 2); -- Percentage difference

-- Add indexes for deal tracking queries
CREATE INDEX IF NOT EXISTS idx_calls_contract_signed ON calls(contract_signed) WHERE contract_signed = TRUE;
CREATE INDEX IF NOT EXISTS idx_calls_price_variance ON calls(price_variance) WHERE contract_signed = TRUE;

-- Add comments
COMMENT ON COLUMN calls.contract_signed IS 'Whether a verbal or digital agreement was reached';
COMMENT ON COLUMN calls.suggested_buy_price IS 'Target price based on AI property comps';
COMMENT ON COLUMN calls.final_offer_price IS 'Actual price negotiated by the rep';
COMMENT ON COLUMN calls.price_variance IS 'Percentage difference between suggested and final offer (positive = overpaying, negative = under target)';
