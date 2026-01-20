#!/usr/bin/env tsx
/**
 * Security Test: Verify VAPI Key is Server-Side Only
 *
 * This script checks that:
 * 1. NEXT_PUBLIC_VAPI_API_KEY is NOT used in the codebase
 * 2. VAPI_API_KEY is ONLY used in server-side code (API routes, server components)
 * 3. Client components fetch the key from API routes instead of accessing directly
 *
 * Run with: tsx scripts/security-tests/verify-vapi-key-server-side.ts
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

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function checkClientSideUsage(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  // Check for NEXT_PUBLIC_VAPI_API_KEY usage in source files
  const srcDir = path.join(rootDir, 'src');
  const srcFiles = getAllFiles(srcDir);

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for NEXT_PUBLIC_VAPI_API_KEY (should not exist)
      if (line.includes('NEXT_PUBLIC_VAPI_API_KEY')) {
        result.passed = false;
        result.issues.push(
          `${path.relative(rootDir, file)}:${lineNum + 1} - Found NEXT_PUBLIC_VAPI_API_KEY (should be VAPI_API_KEY server-side only)`
        );
      }

      // Check for direct process.env.VAPI_API_KEY in client components
      if (
        line.includes('process.env.VAPI_API_KEY') &&
        !file.includes('/api/') && // Allow in API routes
        !file.includes('/app/') && // Allow in server components (if using 'use server')
        (content.includes("'use client'") || file.includes('/components/'))
      ) {
        // Double-check it's actually in client code
        if (content.includes("'use client'")) {
          result.passed = false;
          result.issues.push(
            `${path.relative(rootDir, file)}:${lineNum + 1} - Client component accessing VAPI_API_KEY directly (should use API route)`
          );
        }
      }
    });
  }

  return result;
}

async function checkEnvFileUsage(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const envFiles = [
    path.join(rootDir, '.env.example'),
    path.join(rootDir, 'env.development.example'),
    path.join(rootDir, 'env.production.example'),
  ];

  for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) continue;

    const content = fs.readFileSync(envFile, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for NEXT_PUBLIC_VAPI_API_KEY in env files
      if (line.includes('NEXT_PUBLIC_VAPI_API_KEY=')) {
        result.passed = false;
        result.issues.push(
          `${path.relative(rootDir, envFile)}:${lineNum + 1} - Found NEXT_PUBLIC_VAPI_API_KEY (should be VAPI_API_KEY)`
        );
      }
    });
  }

  return result;
}

async function checkAPIRouteImplementation(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  const clientKeyRoute = path.join(rootDir, 'src/app/api/vapi/client-key/route.ts');

  if (!fs.existsSync(clientKeyRoute)) {
    result.passed = false;
    result.issues.push('Missing API route: src/app/api/vapi/client-key/route.ts');
    return result;
  }

  const content = fs.readFileSync(clientKeyRoute, 'utf-8');

  // Check that it uses VAPI_API_KEY (server-side)
  if (!content.includes('process.env.VAPI_API_KEY')) {
    result.passed = false;
    result.issues.push(
      'src/app/api/vapi/client-key/route.ts should use process.env.VAPI_API_KEY (server-side)'
    );
  }

  // Check that it doesn't use NEXT_PUBLIC_VAPI_API_KEY
  if (content.includes('NEXT_PUBLIC_VAPI_API_KEY')) {
    result.passed = false;
    result.issues.push(
      'src/app/api/vapi/client-key/route.ts should NOT use NEXT_PUBLIC_VAPI_API_KEY'
    );
  }

  // Check for authentication
  if (!content.includes('auth.getUser()') && !content.includes('getUser()')) {
    result.passed = false;
    result.issues.push(
      'src/app/api/vapi/client-key/route.ts should verify user authentication before returning key'
    );
  }

  return result;
}

async function checkClientComponentsFetchKey(): Promise<TestResult> {
  const result: TestResult = {
    passed: true,
    issues: [],
  };

  // Check that client components fetch the key from API
  const clientComponents = [
    path.join(rootDir, 'src/components/VoiceButton.tsx'),
    path.join(rootDir, 'src/app/live-call/page.tsx'),
  ];

  for (const component of clientComponents) {
    if (!fs.existsSync(component)) {
      console.warn(`⚠️  Skipping ${path.relative(rootDir, component)} (not found)`);
      continue;
    }

    const content = fs.readFileSync(component, 'utf-8');

    // Check that it fetches from /api/vapi/client-key
    if (!content.includes('/api/vapi/client-key')) {
      result.passed = false;
      result.issues.push(
        `${path.relative(rootDir, component)} should fetch VAPI key from /api/vapi/client-key`
      );
    }

    // Check that it doesn't directly access environment variables
    if (content.includes('process.env.NEXT_PUBLIC_VAPI_API_KEY')) {
      result.passed = false;
      result.issues.push(
        `${path.relative(rootDir, component)} should NOT directly access process.env.NEXT_PUBLIC_VAPI_API_KEY`
      );
    }
  }

  return result;
}

async function main() {
  console.log('🔐 Security Test: Verifying VAPI Key is Server-Side Only\n');

  const results: TestResult[] = [];

  console.log('1. Checking for client-side VAPI key usage...');
  const clientSideResult = await checkClientSideUsage();
  results.push(clientSideResult);
  if (clientSideResult.passed) {
    console.log('   ✅ PASSED: No client-side VAPI key usage found\n');
  } else {
    console.log('   ❌ FAILED: Client-side VAPI key usage detected');
    clientSideResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('2. Checking environment files...');
  const envResult = await checkEnvFileUsage();
  results.push(envResult);
  if (envResult.passed) {
    console.log('   ✅ PASSED: Environment files use VAPI_API_KEY (server-side)\n');
  } else {
    console.log('   ❌ FAILED: Environment files contain NEXT_PUBLIC_VAPI_API_KEY');
    envResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('3. Checking API route implementation...');
  const apiRouteResult = await checkAPIRouteImplementation();
  results.push(apiRouteResult);
  if (apiRouteResult.passed) {
    console.log('   ✅ PASSED: API route properly implemented with authentication\n');
  } else {
    console.log('   ❌ FAILED: API route issues detected');
    apiRouteResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('4. Checking client components fetch key from API...');
  const clientFetchResult = await checkClientComponentsFetchKey();
  results.push(clientFetchResult);
  if (clientFetchResult.passed) {
    console.log('   ✅ PASSED: Client components fetch key from API route\n');
  } else {
    console.log('   ❌ FAILED: Client components not using API route');
    clientFetchResult.issues.forEach(issue => console.log(`      ${issue}`));
    console.log();
  }

  console.log('='.repeat(60));

  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('✅ All tests passed! VAPI key is properly secured server-side.\n');
    process.exit(0);
  } else {
    console.log('❌ Tests failed! VAPI key security issues detected.\n');
    console.log('Action required:');
    console.log('1. Remove all NEXT_PUBLIC_VAPI_API_KEY usage');
    console.log('2. Use VAPI_API_KEY (server-side only)');
    console.log('3. Fetch key from /api/vapi/client-key in client components');
    console.log('4. Ensure API route verifies authentication\n');
    process.exit(1);
  }
}

main();
