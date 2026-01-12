-- Add exit_strategy_chosen column to calls table
-- Tracks the AI's exit strategy decision (Cash, Sub-To, Creative Finance) for auditing

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS exit_strategy_chosen TEXT CHECK (exit_strategy_chosen IN ('cash', 'fix_and_flip', 'buy_and_hold', 'subject_to', 'seller_finance', 'creative_finance', 'sub_to', 'seller_carry')) DEFAULT NULL;

-- Create index for exit strategy queries
CREATE INDEX IF NOT EXISTS idx_calls_exit_strategy ON calls(exit_strategy_chosen) WHERE exit_strategy_chosen IS NOT NULL;

-- Add comment
COMMENT ON COLUMN calls.exit_strategy_chosen IS 'AI\'s chosen exit strategy: cash, fix_and_flip, buy_and_hold, subject_to, seller_finance, creative_finance. Used for auditing "Top Earner" decision-making.';
