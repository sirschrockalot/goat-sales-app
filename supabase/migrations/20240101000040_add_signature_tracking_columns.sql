-- Add signature tracking columns to calls table
-- Tracks signed PDF URL and time-to-sign for Speed-to-Close optimization

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS time_to_sign INTEGER; -- Time in seconds from call start to signature completion

-- Create index for time_to_sign queries (for speed-to-close analytics)
CREATE INDEX IF NOT EXISTS idx_calls_time_to_sign ON calls(time_to_sign) WHERE time_to_sign IS NOT NULL;

-- Create index for signed PDF URL queries
CREATE INDEX IF NOT EXISTS idx_calls_signed_pdf_url ON calls(signed_pdf_url) WHERE signed_pdf_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN calls.signed_pdf_url IS 'URL to the signed PDF document from DocuSign';
COMMENT ON COLUMN calls.time_to_sign IS 'Time in seconds from call start to signature completion - used for Speed-to-Close training optimization';
