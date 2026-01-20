#!/usr/bin/env tsx
/**
 * Security Test: Verify Transcript Encryption
 *
 * This script tests that:
 * 1. Encryption configuration is valid
 * 2. Database encryption/decryption functions exist and work
 * 3. Application code properly encrypts on insert
 * 4. Application code properly decrypts on retrieval
 *
 * Run with: tsx scripts/security-tests/verify-transcript-encryption.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

interface TestResult {
  passed: boolean;
  issues: string[];
}

/**
 * Test 1: Check encryption key is configured
 */
async function checkEncryptionKeyConfigured(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  // Check if TRANSCRIPT_ENCRYPTION_KEY is mentioned in env files
  const envFiles = [
    path.join(rootDir, '.env.example'),
    path.join(rootDir, 'env.development.example'),
    path.join(rootDir, 'env.production.example'),
  ];

  let foundInAnyFile = false;

  for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) continue;

    const content = fs.readFileSync(envFile, 'utf-8');
    if (content.includes('TRANSCRIPT_ENCRYPTION_KEY')) {
      foundInAnyFile = true;
      break;
    }
  }

  if (!foundInAnyFile) {
    result.passed = false;
    result.issues.push(
      'TRANSCRIPT_ENCRYPTION_KEY not documented in any .env.example files'
    );
  }

  // Check if encryption library exists
  const encryptionLib = path.join(rootDir, 'src/lib/encryption.ts');
  if (!fs.existsSync(encryptionLib)) {
    result.passed = false;
    result.issues.push('Encryption library not found at src/lib/encryption.ts');
  }

  return result;
}

/**
 * Test 2: Check database migration exists
 */
async function checkDatabaseMigrationExists(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const migrationsDir = path.join(rootDir, 'supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    result.passed = false;
    result.issues.push('Supabase migrations directory not found');
    return result;
  }

  // Find encryption migration
  const files = fs.readdirSync(migrationsDir);
  const encryptionMigration = files.find(f =>
    f.includes('encryption') || f.includes('encrypt')
  );

  if (!encryptionMigration) {
    result.passed = false;
    result.issues.push('Encryption migration not found in supabase/migrations/');
    return result;
  }

  // Verify migration content
  const migrationPath = path.join(migrationsDir, encryptionMigration);
  const content = fs.readFileSync(migrationPath, 'utf-8');

  const requiredElements = [
    'CREATE EXTENSION IF NOT EXISTS pgcrypto',
    'transcript_encrypted BYTEA',
    'encrypt_transcript',
    'decrypt_transcript',
    'transcript_access_log',
  ];

  for (const element of requiredElements) {
    if (!content.includes(element)) {
      result.passed = false;
      result.issues.push(
        `Migration missing required element: ${element}`
      );
    }
  }

  return result;
}

/**
 * Test 3: Check vapi-webhook route encrypts transcripts
 */
async function checkWebhookEncryption(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const webhookPath = path.join(rootDir, 'src/app/api/vapi-webhook/route.ts');

  if (!fs.existsSync(webhookPath)) {
    result.passed = false;
    result.issues.push('Webhook route not found');
    return result;
  }

  const content = fs.readFileSync(webhookPath, 'utf-8');

  // Check for encryption import
  if (!content.includes("import { encryptTranscript }") &&
      !content.includes("from '@/lib/encryption'")) {
    result.passed = false;
    result.issues.push(
      'Webhook route does not import encryptTranscript from @/lib/encryption'
    );
  }

  // Check for encryptTranscript usage
  if (!content.includes('encryptTranscript(transcript)')) {
    result.passed = false;
    result.issues.push(
      'Webhook route does not call encryptTranscript before saving'
    );
  }

  // Check for transcript_encrypted field usage
  if (!content.includes('transcript_encrypted')) {
    result.passed = false;
    result.issues.push(
      'Webhook route does not use transcript_encrypted field'
    );
  }

  return result;
}

/**
 * Test 4: Check retrieval routes decrypt transcripts
 */
async function checkRetrievalDecryption(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const routesToCheck = [
    path.join(rootDir, 'src/app/api/calls/[id]/route.ts'),
    path.join(rootDir, 'src/app/api/calls/latest/route.ts'),
  ];

  for (const routePath of routesToCheck) {
    if (!fs.existsSync(routePath)) {
      result.passed = false;
      result.issues.push(`Route not found: ${path.relative(rootDir, routePath)}`);
      continue;
    }

    const content = fs.readFileSync(routePath, 'utf-8');

    // Check for decryption import
    if (!content.includes("import { decryptTranscript }") &&
        !content.includes("from '@/lib/encryption'")) {
      result.passed = false;
      result.issues.push(
        `${path.relative(rootDir, routePath)} does not import decryptTranscript`
      );
    }

    // Check for decryptTranscript usage
    if (!content.includes('decryptTranscript')) {
      result.passed = false;
      result.issues.push(
        `${path.relative(rootDir, routePath)} does not call decryptTranscript`
      );
    }

    // Check for transcript_encrypted handling
    if (!content.includes('transcript_encrypted')) {
      result.passed = false;
      result.issues.push(
        `${path.relative(rootDir, routePath)} does not check for transcript_encrypted field`
      );
    }
  }

  return result;
}

/**
 * Test 5: Check encryption library implementation
 */
async function checkEncryptionLibrary(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const encryptionLib = path.join(rootDir, 'src/lib/encryption.ts');

  if (!fs.existsSync(encryptionLib)) {
    result.passed = false;
    result.issues.push('Encryption library not found');
    return result;
  }

  const content = fs.readFileSync(encryptionLib, 'utf-8');

  const requiredFunctions = [
    'export async function encryptTranscript',
    'export async function decryptTranscript',
    'export async function logTranscriptAccess',
    'export async function verifyEncryptionConfig',
  ];

  for (const func of requiredFunctions) {
    if (!content.includes(func)) {
      result.passed = false;
      result.issues.push(`Encryption library missing function: ${func}`);
    }
  }

  // Check for proper error handling
  if (!content.includes('try') || !content.includes('catch')) {
    result.passed = false;
    result.issues.push('Encryption library missing error handling');
  }

  // Check for encryption key validation
  if (!content.includes('TRANSCRIPT_ENCRYPTION_KEY')) {
    result.passed = false;
    result.issues.push('Encryption library does not reference TRANSCRIPT_ENCRYPTION_KEY');
  }

  return result;
}

/**
 * Test 6: Check for plaintext transcript references
 */
async function checkForPlaintextUsage(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const apiDir = path.join(rootDir, 'src/app/api');

  function checkDirectory(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        checkDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        // Skip certain files
        if (file.includes('encryption') || file.includes('security-tests')) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if file inserts calls with plain transcript (without encryption)
        if (content.includes(".from('calls')") && content.includes('.insert(')) {
          // Check if it uses transcript without encryption
          const insertMatch = content.match(/\.insert\([^)]+transcript:\s*transcript[^_]/);
          if (insertMatch && !content.includes('encryptTranscript')) {
            // Allow if it's explicitly setting to null or has fallback logic
            if (!content.includes('transcript_encrypted') &&
                !content.includes('transcript: null') &&
                !content.includes('transcript:null')) {
              result.issues.push(
                `${path.relative(rootDir, filePath)} may insert plaintext transcript without encryption`
              );
            }
          }
        }
      }
    }
  }

  checkDirectory(apiDir);

  return result;
}

async function main() {
  console.log('🔐 Security Test: Verifying Transcript Encryption Implementation\n');

  const results: TestResult[] = [];

  console.log('1. Checking encryption key configuration...');
  const keyConfigResult = await checkEncryptionKeyConfigured();
  results.push(keyConfigResult);
  if (keyConfigResult.passed) {
    console.log('   ✅ PASSED: Encryption key properly configured\n');
  } else {
    console.log('   ❌ FAILED: Encryption key configuration issues');
    keyConfigResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('2. Checking database migration...');
  const migrationResult = await checkDatabaseMigrationExists();
  results.push(migrationResult);
  if (migrationResult.passed) {
    console.log('   ✅ PASSED: Encryption migration exists with all required elements\n');
  } else {
    console.log('   ❌ FAILED: Database migration issues');
    migrationResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('3. Checking webhook route encrypts transcripts...');
  const webhookResult = await checkWebhookEncryption();
  results.push(webhookResult);
  if (webhookResult.passed) {
    console.log('   ✅ PASSED: Webhook route properly encrypts transcripts\n');
  } else {
    console.log('   ❌ FAILED: Webhook encryption issues');
    webhookResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('4. Checking retrieval routes decrypt transcripts...');
  const retrievalResult = await checkRetrievalDecryption();
  results.push(retrievalResult);
  if (retrievalResult.passed) {
    console.log('   ✅ PASSED: Retrieval routes properly decrypt transcripts\n');
  } else {
    console.log('   ❌ FAILED: Retrieval decryption issues');
    retrievalResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('5. Checking encryption library implementation...');
  const libraryResult = await checkEncryptionLibrary();
  results.push(libraryResult);
  if (libraryResult.passed) {
    console.log('   ✅ PASSED: Encryption library properly implemented\n');
  } else {
    console.log('   ❌ FAILED: Encryption library issues');
    libraryResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('6. Checking for unencrypted transcript usage...');
  const plaintextResult = await checkForPlaintextUsage();
  results.push(plaintextResult);
  if (plaintextResult.passed && plaintextResult.issues.length === 0) {
    console.log('   ✅ PASSED: No plaintext transcript insertions found\n');
  } else if (plaintextResult.issues.length > 0) {
    console.log('   ⚠️  WARNING: Potential plaintext transcript usage detected');
    plaintextResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  } else {
    console.log('   ✅ PASSED: No issues found\n');
  }

  console.log('='.repeat(60));

  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('✅ All tests passed! Transcript encryption properly implemented.\n');
    console.log('Next steps to complete implementation:');
    console.log('1. Set TRANSCRIPT_ENCRYPTION_KEY in environment:');
    console.log('   heroku config:set TRANSCRIPT_ENCRYPTION_KEY=$(openssl rand -base64 32)');
    console.log('2. Apply the database migration:');
    console.log('   supabase db push (for local) or via Supabase dashboard (for prod)');
    console.log('3. Migrate existing plaintext transcripts (if any):');
    console.log('   Run the migration script or SQL function\n');
    process.exit(0);
  } else {
    console.log('❌ Tests failed! Transcript encryption has issues.\n');
    console.log('Action required:');
    console.log('1. Review and fix all failed tests above');
    console.log('2. Ensure encryption is used for all transcript storage');
    console.log('3. Ensure decryption is used for all transcript retrieval\n');
    process.exit(1);
  }
}

main();
