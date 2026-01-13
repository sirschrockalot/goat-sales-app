-- Add margin pressure traits to training_personas table
-- Supports tiered profit zone training and market-specific negotiation flexibility

ALTER TABLE training_personas
ADD COLUMN IF NOT EXISTS negotiation_style VARCHAR(50) CHECK (negotiation_style IN ('grinder', 'fair_value', 'price_anchorer', 'flexible', 'rigid'));

ALTER TABLE training_personas
ADD COLUMN IF NOT EXISTS lowest_acceptable_price NUMERIC(10, 2);

ALTER TABLE training_personas
ADD COLUMN IF NOT EXISTS target_profit_zone VARCHAR(20) CHECK (target_profit_zone IN ('green', 'yellow', 'red')) DEFAULT 'green';

ALTER TABLE training_personas
ADD COLUMN IF NOT EXISTS market_flexibility JSONB DEFAULT '{}'::jsonb;

-- Create indexes for margin pressure queries
CREATE INDEX IF NOT EXISTS idx_training_personas_negotiation_style ON training_personas(negotiation_style);
CREATE INDEX IF NOT EXISTS idx_training_personas_target_profit_zone ON training_personas(target_profit_zone);
CREATE INDEX IF NOT EXISTS idx_training_personas_lowest_acceptable_price ON training_personas(lowest_acceptable_price);

-- Add comments
COMMENT ON COLUMN training_personas.negotiation_style IS 'Negotiation approach: grinder (fights for every $500), fair_value (quickly accepts reasonable offers), price_anchorer, flexible, rigid';
COMMENT ON COLUMN training_personas.lowest_acceptable_price IS 'Lowest price this persona will accept - used to anchor Yellow Zone ($10k-$12k profit) training';
COMMENT ON COLUMN training_personas.target_profit_zone IS 'Target profit zone for training: green ($15k+), yellow ($8k-$14,999), red (<$8k)';
COMMENT ON COLUMN training_personas.market_flexibility IS 'Market-specific flexibility rules: {"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": true}}';
