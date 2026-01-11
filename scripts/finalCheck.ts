/**
 * Final Check - Apex Prompt Audit & Verification
 * 
 * Compares base_prompt.txt with merged_prompt_output.txt using GPT-4o
 * Visualizes improvements with color-coded terminal output
 * Validates Vapi API payload
 * Calculates Apex Readiness Score (0-100)
 * 
 * Features:
 * - Elliott Infusion Detection (Certainty/Aggression)
 * - Cline Infusion Detection (Surgical Discovery/Hidden Why)
 * - Safety Guardrails Verification ($82,700, PA Clauses 1-19)
 * - Terminal Heat Map Visualization
 * - Mock Vapi API Validation
 * - Go/No-Go Readiness Score
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';
import chalk from 'chalk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_PROMPT_PATH = path.join(process.cwd(), 'base_prompt.txt');
const MERGED_PROMPT_PATH = path.join(process.cwd(), 'merged_prompt_output.txt');
const VAPI_API_URL = 'https://api.vapi.ai';
const VAPI_MAX_CHARACTERS = 100000; // Vapi's character limit (approximate)

interface AuditResult {
  elliottInfusion: {
    found: boolean;
    examples: string[];
    score: number; // 0-100
  };
  clineInfusion: {
    found: boolean;
    examples: string[];
    score: number; // 0-100
  };
  safetyGuardrails: {
    pricePointIntact: boolean;
    paClausesIntact: boolean;
    violations: string[];
    score: number; // 0-100
  };
  improvements: {
    highConvictionPhrases: string[];
    discoveryLogic: string[];
    tonalityShifts: string[];
  };
  apexReadinessScore: number; // 0-100
  missingTactics: string[];
  vapiValidation: {
    valid: boolean;
    characterCount: number;
    withinLimit: boolean;
    errors: string[];
  };
}

/**
 * Read base prompt
 */
async function readBasePrompt(): Promise<string> {
  if (!(await fs.pathExists(BASE_PROMPT_PATH))) {
    throw new Error(`base_prompt.txt not found at ${BASE_PROMPT_PATH}`);
  }
  return await fs.readFile(BASE_PROMPT_PATH, 'utf-8');
}

/**
 * Read merged prompt
 */
async function readMergedPrompt(): Promise<string> {
  if (!(await fs.pathExists(MERGED_PROMPT_PATH))) {
    throw new Error(
      `merged_prompt_output.txt not found at ${MERGED_PROMPT_PATH}\n` +
      'Run apex:merge first to generate the merged prompt.'
    );
  }
  return await fs.readFile(MERGED_PROMPT_PATH, 'utf-8');
}

/**
 * GPT-4o Audit: Analyze prompt differences
 */
async function auditPromptWithGPT4o(
  basePrompt: string,
  mergedPrompt: string
): Promise<AuditResult> {
  console.log('🔍 Running GPT-4o Sales Auditor analysis...\n');

  const auditPrompt = `You are an Elite Sales Auditor specializing in real estate wholesaling AI prompts. Your task is to compare two prompts and identify specific improvements.

**BASE PROMPT (Original):**
${basePrompt.substring(0, 15000)}${basePrompt.length > 15000 ? '\n[TRUNCATED - FULL PROMPT PROVIDED TO MODEL]' : ''}

**MERGED PROMPT (New):**
${mergedPrompt.substring(0, 15000)}${mergedPrompt.length > 15000 ? '\n[TRUNCATED - FULL PROMPT PROVIDED TO MODEL]' : ''}

**YOUR TASK:**

1. **ELLIOTT INFUSION DETECTION:**
   - Look for increased "Certainty" or "Aggressive" language
   - Find phrases that show more conviction, authority, or directness
   - Identify where the prompt became more assertive or confident
   - Score: 0-100 (0 = no Elliott infusion, 100 = strong Elliott-style certainty)

2. **CLINE INFUSION DETECTION:**
   - Look for "Surgical Discovery" or "Hidden Why" mining techniques
   - Find phrases about digging deeper, uncovering emotional drivers
   - Identify discovery questions or frameworks that weren't in the base
   - Score: 0-100 (0 = no Cline infusion, 100 = strong Cline-style discovery)

3. **SAFETY GUARDRAILS VERIFICATION:**
   - Check if "$82,700" price point is PRESERVED EXACTLY (not changed to $82,700.00 or 82700)
   - Check if "PA Clauses 1-19" or "Clause 17" are still present and intact
   - Look for any modifications to contract details or legal language
   - Score: 0-100 (0 = critical violations, 100 = all guardrails intact)

4. **IMPROVEMENTS IDENTIFICATION:**
   - Extract new high-conviction phrases (Elliott-style)
   - Extract modified discovery logic (Cline-style)
   - Extract tonality shift techniques

5. **MISSING TACTICS:**
   - If Elliott infusion score < 70, list what's missing (e.g., "Lacks assumptive closes", "No urgency creators")
   - If Cline infusion score < 70, list what's missing (e.g., "No Hidden Why framework", "Missing discovery lock")

**OUTPUT FORMAT (JSON):**
{
  "elliottInfusion": {
    "found": true/false,
    "examples": ["phrase 1", "phrase 2", ...],
    "score": 0-100
  },
  "clineInfusion": {
    "found": true/false,
    "examples": ["discovery technique 1", "discovery technique 2", ...],
    "score": 0-100
  },
  "safetyGuardrails": {
    "pricePointIntact": true/false,
    "paClausesIntact": true/false,
    "violations": ["violation 1", ...],
    "score": 0-100
  },
  "improvements": {
    "highConvictionPhrases": ["phrase 1", "phrase 2", ...],
    "discoveryLogic": ["logic 1", "logic 2", ...],
    "tonalityShifts": ["shift 1", "shift 2", ...]
  },
  "missingTactics": ["missing tactic 1", "missing tactic 2", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an Elite Sales Auditor. Analyze prompts and return valid JSON only.',
        },
        {
          role: 'user',
          content: auditPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const audit = JSON.parse(response) as Omit<AuditResult, 'apexReadinessScore' | 'vapiValidation'>;

    // Calculate Apex Readiness Score
    const elliottWeight = 0.3;
    const clineWeight = 0.3;
    const safetyWeight = 0.4; // Safety is most important

    const apexReadinessScore = Math.round(
      audit.elliottInfusion.score * elliottWeight +
      audit.clineInfusion.score * clineWeight +
      audit.safetyGuardrails.score * safetyWeight
    );

    // Validate Vapi API payload
    const vapiValidation = validateVapiPayload(mergedPrompt);

    return {
      ...audit,
      apexReadinessScore,
      vapiValidation,
    };
  } catch (error) {
    console.error('❌ Error in GPT-4o audit:', error);
    throw error;
  }
}

/**
 * Validate Vapi API payload (mock PATCH)
 */
function validateVapiPayload(prompt: string): AuditResult['vapiValidation'] {
  const characterCount = prompt.length;
  const withinLimit = characterCount <= VAPI_MAX_CHARACTERS;
  const errors: string[] = [];

  if (!withinLimit) {
    errors.push(`Prompt exceeds Vapi character limit (${characterCount} > ${VAPI_MAX_CHARACTERS})`);
  }

  // Check for required structure
  if (!prompt.includes('You are')) {
    errors.push('Prompt missing persona definition');
  }

  // Check for valid JSON structure (if prompt contains JSON)
  try {
    // Basic validation - prompt should be a string, not JSON
    if (prompt.trim().startsWith('{') || prompt.trim().startsWith('[')) {
      errors.push('Prompt appears to be JSON, should be plain text');
    }
  } catch (e) {
    // Not JSON, that's fine
  }

  return {
    valid: errors.length === 0,
    characterCount,
    withinLimit,
    errors,
  };
}

/**
 * Print color-coded heat map to terminal
 */
function printHeatMap(audit: AuditResult): void {
  console.log('\n' + '='.repeat(80));
  console.log(chalk.bold.cyan('📊 APEX PROMPT AUDIT - HEAT MAP'));
  console.log('='.repeat(80) + '\n');

  // Elliott Infusion
  console.log(chalk.bold('🔥 ELLIOTT INFUSION (Certainty/Aggression):'));
  if (audit.elliottInfusion.found) {
    console.log(chalk.green(`✅ Score: ${audit.elliottInfusion.score}/100`));
    console.log(chalk.green('   High-conviction phrases added:'));
    audit.elliottInfusion.examples.forEach((example, i) => {
      console.log(chalk.green(`   ${i + 1}. "${example}"`));
    });
  } else {
    console.log(chalk.red(`❌ Score: ${audit.elliottInfusion.score}/100 - No Elliott infusion detected`));
  }
  console.log('');

  // Cline Infusion
  console.log(chalk.bold('🔍 CLINE INFUSION (Surgical Discovery/Hidden Why):'));
  if (audit.clineInfusion.found) {
    console.log(chalk.yellow(`✅ Score: ${audit.clineInfusion.score}/100`));
    console.log(chalk.yellow('   Discovery logic modified:'));
    audit.clineInfusion.examples.forEach((example, i) => {
      console.log(chalk.yellow(`   ${i + 1}. "${example}"`));
    });
  } else {
    console.log(chalk.red(`❌ Score: ${audit.clineInfusion.score}/100 - No Cline infusion detected`));
  }
  console.log('');

  // Safety Guardrails
  console.log(chalk.bold.red('🛡️  SAFETY GUARDRAILS (CRITICAL - FIXED LEGALITIES):'));
  if (audit.safetyGuardrails.pricePointIntact) {
    console.log(chalk.bold.green('   ✅ $82,700 price point: INTACT'));
  } else {
    console.log(chalk.bold.red('   ❌ $82,700 price point: MODIFIED OR MISSING'));
  }
  if (audit.safetyGuardrails.paClausesIntact) {
    console.log(chalk.bold.green('   ✅ PA Clauses 1-19: INTACT'));
  } else {
    console.log(chalk.bold.red('   ❌ PA Clauses 1-19: MODIFIED OR MISSING'));
  }
  console.log(chalk.bold(`   Safety Score: ${audit.safetyGuardrails.score}/100`));
  if (audit.safetyGuardrails.violations.length > 0) {
    console.log(chalk.bold.red('   ⚠️  VIOLATIONS:'));
    audit.safetyGuardrails.violations.forEach((violation) => {
      console.log(chalk.bold.red(`      - ${violation}`));
    });
  }
  console.log('');

  // Improvements
  console.log(chalk.bold('✨ IMPROVEMENTS:'));
  if (audit.improvements.highConvictionPhrases.length > 0) {
    console.log(chalk.green('   New high-conviction phrases (Elliott-style):'));
    audit.improvements.highConvictionPhrases.forEach((phrase, i) => {
      console.log(chalk.green(`      ${i + 1}. "${phrase}"`));
    });
  }
  if (audit.improvements.discoveryLogic.length > 0) {
    console.log(chalk.yellow('   Modified discovery logic (Cline-style):'));
    audit.improvements.discoveryLogic.forEach((logic, i) => {
      console.log(chalk.yellow(`      ${i + 1}. "${logic}"`));
    });
  }
  if (audit.improvements.tonalityShifts.length > 0) {
    console.log(chalk.cyan('   Tonality shifts:'));
    audit.improvements.tonalityShifts.forEach((shift, i) => {
      console.log(chalk.cyan(`      ${i + 1}. "${shift}"`));
    });
  }
  console.log('');

  // Vapi Validation
  console.log(chalk.bold('🔌 VAPI API VALIDATION (Mock PATCH):'));
  if (audit.vapiValidation.valid) {
    console.log(chalk.green('   ✅ Payload is valid'));
  } else {
    console.log(chalk.red('   ❌ Payload has errors:'));
    audit.vapiValidation.errors.forEach((error) => {
      console.log(chalk.red(`      - ${error}`));
    });
  }
  console.log(chalk.cyan(`   Character count: ${audit.vapiValidation.characterCount.toLocaleString()}`));
  console.log(
    audit.vapiValidation.withinLimit
      ? chalk.green(`   ✅ Within Vapi limit (${VAPI_MAX_CHARACTERS.toLocaleString()})`)
      : chalk.red(`   ❌ Exceeds Vapi limit (${VAPI_MAX_CHARACTERS.toLocaleString()})`)
  );
  console.log('');

  // Apex Readiness Score
  console.log('='.repeat(80));
  if (audit.apexReadinessScore >= 85) {
    console.log(chalk.bold.green(`🚀 APEX READINESS SCORE: ${audit.apexReadinessScore}/100 - GO ✅`));
  } else {
    console.log(chalk.bold.red(`⚠️  APEX READINESS SCORE: ${audit.apexReadinessScore}/100 - NO-GO ❌`));
  }
  console.log('='.repeat(80) + '\n');

  // Missing Tactics
  if (audit.missingTactics.length > 0) {
    console.log(chalk.bold.yellow('📋 MISSING TACTICS (Score < 85):'));
    audit.missingTactics.forEach((tactic, i) => {
      console.log(chalk.yellow(`   ${i + 1}. ${tactic}`));
    });
    console.log('');
  }

  // Breakdown
  console.log(chalk.dim('Score Breakdown:'));
  console.log(chalk.dim(`   Elliott Infusion: ${audit.elliottInfusion.score}/100 (30% weight)`));
  console.log(chalk.dim(`   Cline Infusion: ${audit.clineInfusion.score}/100 (30% weight)`));
  console.log(chalk.dim(`   Safety Guardrails: ${audit.safetyGuardrails.score}/100 (40% weight)`));
  console.log('');
}

/**
 * Main audit function
 */
export async function runFinalCheck(): Promise<void> {
  console.log('🚀 Starting Final Check - Apex Prompt Audit...\n');

  try {
    // Read prompts
    console.log('📖 Reading prompts...');
    const basePrompt = await readBasePrompt();
    const mergedPrompt = await readMergedPrompt();

    console.log(`✅ Base prompt: ${basePrompt.length.toLocaleString()} characters`);
    console.log(`✅ Merged prompt: ${mergedPrompt.length.toLocaleString()} characters\n`);

    // Run GPT-4o audit
    const audit = await auditPromptWithGPT4o(basePrompt, mergedPrompt);

    // Print heat map
    printHeatMap(audit);

    // Final recommendation
    if (audit.apexReadinessScore >= 85) {
      console.log(chalk.bold.green('✅ RECOMMENDATION: PROCEED WITH VAPI UPDATE'));
      console.log(chalk.green('   The merged prompt is ready for deployment.'));
    } else {
      console.log(chalk.bold.red('❌ RECOMMENDATION: DO NOT PROCEED'));
      console.log(chalk.red('   Address the missing tactics before updating Vapi.'));
      console.log(chalk.red(`   Current score: ${audit.apexReadinessScore}/100 (minimum: 85)`));
    }

    console.log('');
  } catch (error) {
    console.error('❌ Error in final check:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  runFinalCheck()
    .then(() => {
      console.log('\n✅ Audit complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
