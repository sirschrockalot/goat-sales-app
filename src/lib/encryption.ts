/**
 * Encryption Utility Library
 *
 * Provides field-level encryption for sensitive data like call transcripts.
 * Uses PostgreSQL's pgcrypto extension for server-side encryption.
 *
 * SECURITY:
 * - Encryption key is stored in TRANSCRIPT_ENCRYPTION_KEY environment variable
 * - Key should be rotated annually
 * - All encryption/decryption happens server-side
 *
 * @module lib/encryption
 */

import { createServerClient } from '@/lib/supabase';
import logger from '@/lib/logger';

/**
 * Get encryption key from environment
 * @throws Error if encryption key is not configured
 */
function getEncryptionKey(): string {
  const key = process.env.TRANSCRIPT_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'TRANSCRIPT_ENCRYPTION_KEY not configured. ' +
      'Set it with: heroku config:set TRANSCRIPT_ENCRYPTION_KEY=$(openssl rand -base64 32)'
    );
  }

  return key;
}

/**
 * Encrypt transcript using PostgreSQL pgcrypto
 *
 * @param plaintext - The transcript to encrypt
 * @returns Base64-encoded encrypted data
 * @throws Error if encryption fails
 */
export async function encryptTranscript(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('Cannot encrypt empty transcript');
  }

  try {
    const supabase = createServerClient();
    const encryptionKey = getEncryptionKey();

    // Call PostgreSQL function to encrypt
    const { data, error } = await supabase.rpc('encrypt_transcript', {
      plaintext,
      encryption_key: encryptionKey,
    });

    if (error) {
      logger.error('Transcript encryption failed', { error });
      throw new Error(`Encryption failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Encryption returned null');
    }

    // Convert BYTEA to base64 string for storage
    // Supabase returns BYTEA as base64 string by default
    return data;
  } catch (error) {
    logger.error('Transcript encryption error', { error });
    throw error;
  }
}

/**
 * Decrypt transcript using PostgreSQL pgcrypto
 *
 * @param encrypted - Base64-encoded encrypted data (BYTEA from database)
 * @returns Decrypted plaintext transcript
 * @throws Error if decryption fails
 */
export async function decryptTranscript(encrypted: string | Buffer): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt null/empty data');
  }

  try {
    const supabase = createServerClient();
    const encryptionKey = getEncryptionKey();

    // Convert to format expected by PostgreSQL BYTEA
    const encryptedData = Buffer.isBuffer(encrypted)
      ? encrypted.toString('base64')
      : encrypted;

    // Call PostgreSQL function to decrypt
    const { data, error } = await supabase.rpc('decrypt_transcript', {
      encrypted: encryptedData,
      encryption_key: encryptionKey,
    });

    if (error) {
      logger.error('Transcript decryption failed', { error });
      throw new Error(`Decryption failed: ${error.message}`);
    }

    if (data === null) {
      throw new Error('Decryption returned null');
    }

    return data;
  } catch (error) {
    logger.error('Transcript decryption error', { error });
    throw error;
  }
}

/**
 * Log transcript access for audit trail
 *
 * @param callId - The call ID
 * @param userId - The user accessing the transcript
 * @param accessType - Type of access (decrypt, view, export)
 * @param metadata - Additional metadata (IP address, user agent, etc.)
 */
export async function logTranscriptAccess(
  callId: string,
  userId: string,
  accessType: 'decrypt' | 'view' | 'export',
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    const supabase = createServerClient();

    const { error } = await supabase.from('transcript_access_log').insert({
      call_id: callId,
      accessed_by: userId,
      access_type: accessType,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null,
    });

    if (error) {
      logger.warn('Failed to log transcript access', { error, callId, userId });
      // Don't throw - logging failure shouldn't break the main flow
    }
  } catch (error) {
    logger.warn('Transcript access logging error', { error, callId, userId });
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Migrate existing plaintext transcript to encrypted format
 * This is a helper for one-time migration
 *
 * @param callId - The call ID to migrate
 * @returns true if migration successful, false otherwise
 */
export async function migrateCallTranscript(callId: string): Promise<boolean> {
  try {
    const supabase = createServerClient();

    // Get the plaintext transcript
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('id, transcript, transcript_encrypted')
      .eq('id', callId)
      .single();

    if (fetchError || !call) {
      logger.error('Failed to fetch call for migration', { error: fetchError, callId });
      return false;
    }

    // Skip if already encrypted
    if (call.transcript_encrypted) {
      logger.info('Call transcript already encrypted', { callId });
      return true;
    }

    // Skip if no transcript
    if (!call.transcript || call.transcript.trim() === '') {
      logger.info('Call has no transcript to encrypt', { callId });
      return true;
    }

    // Encrypt the transcript
    const encrypted = await encryptTranscript(call.transcript);

    // Update with encrypted version
    const { error: updateError } = await supabase
      .from('calls')
      .update({ transcript_encrypted: encrypted })
      .eq('id', callId);

    if (updateError) {
      logger.error('Failed to update call with encrypted transcript', {
        error: updateError,
        callId,
      });
      return false;
    }

    logger.info('Successfully migrated call transcript', { callId });
    return true;
  } catch (error) {
    logger.error('Transcript migration error', { error, callId });
    return false;
  }
}

/**
 * Batch migrate all existing plaintext transcripts
 *
 * @param batchSize - Number of calls to process at once
 * @returns Statistics about the migration
 */
export async function migrateAllTranscripts(
  batchSize: number = 100
): Promise<{
  migrated: number;
  failed: number;
  total: number;
}> {
  try {
    const supabase = createServerClient();
    const encryptionKey = getEncryptionKey();

    // Call the database migration function
    const { data, error } = await supabase.rpc('migrate_transcripts_to_encrypted', {
      encryption_key: encryptionKey,
      batch_size: batchSize,
    });

    if (error) {
      logger.error('Batch transcript migration failed', { error });
      throw error;
    }

    logger.info('Batch transcript migration completed', { stats: data });

    return {
      migrated: data?.migrated_count || 0,
      failed: data?.failed_count || 0,
      total: data?.total_count || 0,
    };
  } catch (error) {
    logger.error('Batch transcript migration error', { error });
    throw error;
  }
}

/**
 * Check if encryption is properly configured
 *
 * @returns true if encryption is configured and working
 */
export async function verifyEncryptionConfig(): Promise<boolean> {
  try {
    // Check if key is configured
    const key = process.env.TRANSCRIPT_ENCRYPTION_KEY;
    if (!key) {
      logger.error('TRANSCRIPT_ENCRYPTION_KEY not configured');
      return false;
    }

    // Test encryption/decryption with sample data
    const testPlaintext = 'Test transcript for encryption verification';
    const encrypted = await encryptTranscript(testPlaintext);
    const decrypted = await decryptTranscript(encrypted);

    if (decrypted !== testPlaintext) {
      logger.error('Encryption verification failed: decrypted text does not match');
      return false;
    }

    logger.info('Encryption configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('Encryption verification error', { error });
    return false;
  }
}
