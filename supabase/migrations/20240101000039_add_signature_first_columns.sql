-- Add Signature-First Success Model columns
-- Primary Success: verbal_yes_to_price
-- Ultimate Success: document_status = 'completed'

-- Add columns to sandbox_battles for new success criteria
ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS verbal_yes_to_price BOOLEAN DEFAULT FALSE;

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) CHECK (document_status IN ('sent', 'delivered', 'viewed', 'completed', NULL));

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS technical_assistance_score INTEGER CHECK (technical_assistance_score >= 0 AND technical_assistance_score <= 10);

-- Add last_docusign_event to calls table to track where sellers drop off
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS last_docusign_event VARCHAR(50);

-- Create index for document_status queries
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_document_status ON sandbox_battles(document_status);

CREATE INDEX IF NOT EXISTS idx_sandbox_battles_verbal_yes_to_price ON sandbox_battles(verbal_yes_to_price) WHERE verbal_yes_to_price = TRUE;

-- Create index for last_docusign_event queries
CREATE INDEX IF NOT EXISTS idx_calls_last_docusign_event ON calls(last_docusign_event);

-- Add comments
COMMENT ON COLUMN sandbox_battles.verbal_yes_to_price IS 'PRIMARY SUCCESS: Did the AI get verbal agreement to the offer price?';
COMMENT ON COLUMN sandbox_battles.document_status IS 'ULTIMATE SUCCESS: DocuSign document status - completed = signed contract';
COMMENT ON COLUMN sandbox_battles.technical_assistance_score IS 'Score (0-10) for how well the AI helped seller navigate DocuSign';
COMMENT ON COLUMN calls.last_docusign_event IS 'Last DocuSign webhook event received (recipient-delivered, recipient-viewed, recipient-completed, etc.) - tracks where sellers drop off';
