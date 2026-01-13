/**
 * Compile Scripts for Production
 * Compiles TypeScript scripts to JavaScript for production use
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const scriptsDir = path.join(process.cwd(), 'scripts');
const outputDir = path.join(process.cwd(), 'scripts', 'compiled');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Compile autonomousBattle.ts
console.log('Compiling scripts for production...');
try {
  execSync(`npx tsc scripts/autonomousBattle.ts --outDir scripts/compiled --module esnext --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck`, {
    stdio: 'inherit'
  });
  console.log('✅ Scripts compiled successfully');
} catch (error) {
  console.warn('⚠️  Script compilation failed, but continuing build');
  console.warn('   Training may not work until scripts are compiled');
}
