-- Migration: Add Transcript Encryption
-- Enable pgcrypto extension for field-level encryption of sensitive call transcripts
--
-- SECURITY: This migration encrypts call transcripts at rest using symmetric encryption
-- The encryption key is stored in environment variables (TRANSCRIPT_ENCRYPTION_KEY)
--
-- Created: 2026-01-20

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted transcript column
-- Using BYTEA to store encrypted data
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS transcript_encrypted BYTEA;

-- Create encryption function
-- Uses AES-256 symmetric encryption via pgp_sym_encrypt
CREATE OR REPLACE FUNCTION encrypt_transcript(
  plaintext TEXT,
  encryption_key TEXT
) RETURNS BYTEA AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;

  RETURN pgp_sym_encrypt(plaintext, encryption_key, 'cipher-algo=aes256');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decryption function
-- Decrypts data encrypted with encrypt_transcript
CREATE OR REPLACE FUNCTION decrypt_transcript(
  encrypted BYTEA,
  encryption_key TEXT
) RETURNS TEXT AS $$
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;

  RETURN pgp_sym_decrypt(encrypted, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NULL on decryption failure
    RAISE WARNING 'Transcript decryption failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to migrate existing transcripts
-- This is a ONE-TIME migration function, not for regular use
CREATE OR REPLACE FUNCTION migrate_transcripts_to_encrypted(
  encryption_key TEXT,
  batch_size INT DEFAULT 100
) RETURNS TABLE (
  migrated_count INT,
  failed_count INT,
  total_count INT
) AS $$
DECLARE
  v_migrated INT := 0;
  v_failed INT := 0;
  v_total INT := 0;
  v_call RECORD;
BEGIN
  -- Count total records to migrate
  SELECT COUNT(*) INTO v_total
  FROM calls
  WHERE transcript IS NOT NULL
    AND transcript != ''
    AND transcript_encrypted IS NULL;

  -- Migrate in batches
  FOR v_call IN
    SELECT id, transcript
    FROM calls
    WHERE transcript IS NOT NULL
      AND transcript != ''
      AND transcript_encrypted IS NULL
    LIMIT batch_size
  LOOP
    BEGIN
      -- Encrypt and update
      UPDATE calls
      SET transcript_encrypted = encrypt_transcript(v_call.transcript, encryption_key)
      WHERE id = v_call.id;

      v_migrated := v_migrated + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to encrypt transcript for call %: %', v_call.id, SQLERRM;
        v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_migrated, v_failed, v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN calls.transcript IS 'DEPRECATED: Use transcript_encrypted instead. Plain text transcript (will be removed after migration)';
COMMENT ON COLUMN calls.transcript_encrypted IS 'Encrypted call transcript using AES-256 encryption';
COMMENT ON FUNCTION encrypt_transcript IS 'Encrypts plaintext transcript using AES-256 symmetric encryption';
COMMENT ON FUNCTION decrypt_transcript IS 'Decrypts encrypted transcript';
COMMENT ON FUNCTION migrate_transcripts_to_encrypted IS 'ONE-TIME: Migrates existing plaintext transcripts to encrypted format';

-- Create index on transcript_encrypted for existence checks (NOT on the encrypted data itself)
-- This helps query performance for "WHERE transcript_encrypted IS NOT NULL"
CREATE INDEX IF NOT EXISTS idx_calls_transcript_encrypted_exists
  ON calls((transcript_encrypted IS NOT NULL))
  WHERE transcript_encrypted IS NOT NULL;

-- Add audit logging for transcript access
-- This table tracks when transcripts are decrypted (for compliance)
CREATE TABLE IF NOT EXISTS transcript_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_type TEXT CHECK (access_type IN ('decrypt', 'view', 'export')),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on access log
ALTER TABLE transcript_access_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert to access log
CREATE POLICY "Service role can insert access logs"
  ON transcript_access_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view access logs
CREATE POLICY "Admins can view access logs"
  ON transcript_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      JOIN profiles ON profiles.id = auth.users.id
      WHERE auth.users.id = auth.uid()
        AND profiles.is_admin = TRUE
    )
  );

COMMENT ON TABLE transcript_access_log IS 'Audit log for transcript decryption and access';

-- Migration Instructions (to be run manually via API or script):
--
-- 1. Set TRANSCRIPT_ENCRYPTION_KEY environment variable:
--    heroku config:set TRANSCRIPT_ENCRYPTION_KEY=$(openssl rand -base64 32)
--
-- 2. Run migration function to encrypt existing transcripts:
--    SELECT * FROM migrate_transcripts_to_encrypted('your-encryption-key');
--
-- 3. Verify migration:
--    SELECT
--      COUNT(*) FILTER (WHERE transcript IS NOT NULL) as plain_count,
--      COUNT(*) FILTER (WHERE transcript_encrypted IS NOT NULL) as encrypted_count
--    FROM calls;
--
-- 4. After verification, update application code to use transcript_encrypted
--
-- 5. (LATER) Drop transcript column after confirming everything works:
--    -- ALTER TABLE calls DROP COLUMN transcript;
