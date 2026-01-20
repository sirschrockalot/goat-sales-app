#!/usr/bin/env tsx
/**
 * Security Test: Verify No Real Credentials in Env Files
 *
 * This script checks all environment example files to ensure they contain
 * placeholder values instead of real API keys and secrets.
 *
 * Run with: tsx scripts/security-tests/verify-no-real-credentials.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Known real credentials that should NOT appear in example files
const KNOWN_REAL_CREDENTIALS = [
  // VAPI keys (from previous leak)
  '56f43f1e-abbe-4608-a503-9f4a47cdcc02',
  'f26b6be1-47d5-4741-89fd-932bf582f7e9',
  'aaf338ae-b74a-43e4-ac48-73dd99817e9f',
];

// Pattern to detect potential API keys/secrets
// UUIDs, long alphanumeric strings, API key patterns
const SUSPICIOUS_PATTERNS = [
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, // UUID
  /sk-[a-zA-Z0-9]{20,}/g, // OpenAI API key pattern
  /[A-Za-z0-9]{32,}/g, // Long alphanumeric strings (potential keys)
];

// Allowlist: Known safe values (Supabase local dev keys, etc.)
const ALLOWED_VALUES = [
  // Supabase local development JWT tokens (public, used by everyone)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
];

// Placeholder patterns that indicate safe values
const PLACEHOLDER_PATTERNS = [
  /your[_-]?.*?[_-]?(here|key|token|secret|id|url)/i,
  /\{\{.*?\}\}/,
  /\$\{.*?\}/,
];

interface TestResult {
  file: string;
  passed: boolean;
  issues: string[];
}

function isPlaceholder(value: string): boolean {
  // Check if it's in the allowlist
  if (ALLOWED_VALUES.includes(value)) {
    return true;
  }

  // Check if it matches placeholder patterns
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value));
}

function isKnownRealCredential(value: string): boolean {
  return KNOWN_REAL_CREDENTIALS.includes(value);
}

function checkEnvFile(filePath: string): TestResult {
  const result: TestResult = {
    file: path.relative(rootDir, filePath),
    passed: true,
    issues: [],
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        return;
      }

      // Parse KEY=VALUE lines
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) return;

      const [, key, value] = match;
      const trimmedValue = value.trim();

      // Skip empty values
      if (!trimmedValue) return;

      // Check for known real credentials
      if (isKnownRealCredential(trimmedValue)) {
        result.passed = false;
        result.issues.push(
          `Line ${lineNum + 1}: Found known real credential in ${key}`
        );
        return;
      }

      // Skip if it's a known placeholder
      if (isPlaceholder(trimmedValue)) {
        return;
      }

      // Check for suspicious patterns
      SUSPICIOUS_PATTERNS.forEach(pattern => {
        const matches = trimmedValue.match(pattern);
        if (matches) {
          matches.forEach(matchedValue => {
            // Double-check it's not in allowlist
            if (!ALLOWED_VALUES.includes(matchedValue)) {
              result.passed = false;
              result.issues.push(
                `Line ${lineNum + 1}: Potential real credential in ${key}: ${matchedValue.substring(0, 20)}...`
              );
            }
          });
        }
      });
    });
  } catch (error) {
    result.passed = false;
    result.issues.push(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

function main() {
  console.log('🔐 Security Test: Verifying No Real Credentials in Env Files\n');

  // Files to check
  const envFiles = [
    path.join(rootDir, '.env.example'),
    path.join(rootDir, 'env.development.example'),
    path.join(rootDir, 'env.production.example'),
  ];

  const results: TestResult[] = [];
  let allPassed = true;

  envFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${path.relative(rootDir, filePath)} (not found)`);
      return;
    }

    const result = checkEnvFile(filePath);
    results.push(result);

    if (result.passed) {
      console.log(`✅ ${result.file}: PASSED`);
    } else {
      console.log(`❌ ${result.file}: FAILED`);
      result.issues.forEach(issue => {
        console.log(`   ${issue}`);
      });
      allPassed = false;
    }
  });

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ All tests passed! No real credentials found.\n');
    process.exit(0);
  } else {
    console.log('❌ Tests failed! Real credentials detected.\n');
    console.log('Action required:');
    console.log('1. Replace all real credentials with placeholders');
    console.log('2. Rotate the exposed credentials immediately');
    console.log('3. Check git history for leaked credentials\n');
    process.exit(1);
  }
}

main();
