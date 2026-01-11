/**
 * Knowledge Gap Detector
 * 
 * Scans the calls table to verify that every core tactic from Eric Cline
 * and Andy Elliott masterclasses is correctly tagged and protected.
 * 
 * Features:
 * - Tactical Checklist: Master list of must-have DNA
 * - GPT-4o Gap Analysis: Identifies high-fidelity implementations
 * - Auto-Protection: Tags and protects high-value tactics
 * - Visual Reporting: Coverage %, at-risk tactics, missing links
 */

import { supabaseAdmin } from '../src/lib/supabase';
import { tagAsProtected, setPermanentKnowledge, PROTECTED_TAGS } from '../src/lib/archiver';
import OpenAI from 'openai';
import chalk from 'chalk';

// Master Tactical Checklist
const MASTER_TACTICS = {
  elliott: [
    {
      name: 'Transfer of Conviction',
      description: 'High-energy, confident delivery that transfers certainty to the prospect',
      keywords: ['conviction', 'certainty', 'confidence', 'believe', 'guarantee', 'absolutely'],
    },
    {
      name: 'High-Energy Interruption',
      description: 'Strategic interruption to maintain control and energy in the conversation',
      keywords: ['interrupt', 'hold on', 'wait', 'let me stop you', 'before you say'],
    },
    {
      name: 'The Scarcity Close',
      description: 'Creating urgency through limited availability or time constraints',
      keywords: ['only', 'limited', 'today', 'now', 'last chance', 'one left', 'expires'],
    },
  ],
  cline: [
    {
      name: 'Clause 17 Reservation Defense',
      description: 'Defending the reservation clause when prospects object to it',
      keywords: ['clause 17', 'reservation', 'reserve', 'hold', 'option', 'clause'],
    },
    {
      name: 'The $82,700 Bad-Cop Hold',
      description: 'Firm price defense using the $82,700 anchor point',
      keywords: ['82,700', '82700', 'eighty-two', 'price', 'offer', 'firm', 'final'],
    },
    {
      name: 'Hidden Why Mining',
      description: 'Deep discovery to uncover the real motivation behind the sale',
      keywords: ['why', 'reason', 'motivation', 'need', 'want', 'goal', 'dream', 'situation'],
    },
  ],
} as const;

interface TacticalAnalysis {
  callId: string;
  containsTactic: boolean;
  tacticName: string | null;
  tacticCategory: 'elliott' | 'cline' | null;
  isHighFidelity: boolean;
  confidence: number; // 0-100
  isNoise: boolean;
  currentProtection: {
    isPermanent: boolean;
    hasProtectedTag: boolean;
    tags: string[];
  };
  needsProtection: boolean;
}

interface AuditReport {
  totalCalls: number;
  analyzedCalls: number;
  highFidelityTactics: number;
  protectedTactics: number;
  atRiskTactics: number;
  autoProtected: number;
  dnaCoverage: {
    elliott: { covered: number; total: number; percentage: number };
    cline: { covered: number; total: number; percentage: number };
    overall: number;
  };
  atRiskTacticsList: Array<{
    callId: string;
    tactic: string;
    category: string;
    reason: string;
  }>;
  missingLinks: Array<{
    tactic: string;
    category: string;
    description: string;
  }>;
  noiseCount: number;
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze a call transcript using GPT-4o to identify high-fidelity tactics
 */
async function analyzeCallForTactics(
  callId: string,
  transcript: string,
  metadata: any
): Promise<TacticalAnalysis> {
  const allTactics = [
    ...MASTER_TACTICS.elliott.map(t => ({ ...t, category: 'elliott' as const })),
    ...MASTER_TACTICS.cline.map(t => ({ ...t, category: 'cline' as const })),
  ];

  const tacticsList = allTactics
    .map((t, i) => `${i + 1}. ${t.category.toUpperCase()}: ${t.name} - ${t.description}`)
    .join('\n');

  const prompt = `You are a Sales DNA Auditor analyzing a real estate wholesaling call transcript.

**MASTER TACTICS CHECKLIST:**
${tacticsList}

**CALL TRANSCRIPT:**
${transcript.substring(0, 8000)}${transcript.length > 8000 ? '...\n[TRUNCATED]' : ''}

**YOUR TASK:**
1. Determine if this transcript contains a HIGH-FIDELITY implementation of any master tactic
2. High-fidelity means: The tactic is executed with precision, not just mentioned in passing
3. If it's a generic response or low-quality example, flag it as "Noise"
4. Identify which specific tactic is present (if any)
5. Rate your confidence (0-100) in the identification

**OUTPUT FORMAT (JSON):**
{
  "containsTactic": boolean,
  "tacticName": "exact name from checklist or null",
  "tacticCategory": "elliott" | "cline" | null,
  "isHighFidelity": boolean,
  "confidence": number (0-100),
  "isNoise": boolean,
  "reasoning": "brief explanation"
}

**CRITICAL RULES:**
- Only mark as high-fidelity if the tactic is EXECUTED, not just mentioned
- "Transfer of Conviction" requires high energy and certainty in delivery
- "Clause 17 Reservation Defense" must show actual defense of the clause
- "The $82,700 Bad-Cop Hold" must reference the specific price point
- Generic responses or low-quality examples = "Noise"
- Be strict: Only mark as high-fidelity if you're confident (confidence > 70)`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Sales DNA Auditor. Analyze call transcripts for high-fidelity tactical implementations. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(response) as {
      containsTactic: boolean;
      tacticName: string | null;
      tacticCategory: 'elliott' | 'cline' | null;
      isHighFidelity: boolean;
      confidence: number;
      isNoise: boolean;
      reasoning: string;
    };

    // Check current protection status
    const isPermanent = metadata?.is_permanent_knowledge === true;
    const protectedTags = metadata?.protected_tags || [];
    const hasProtectedTag = protectedTags.some((tag: string) =>
      PROTECTED_TAGS.includes(tag as typeof PROTECTED_TAGS[number])
    );

    // Determine if protection is needed
    const needsProtection =
      analysis.isHighFidelity &&
      analysis.confidence > 70 &&
      !isPermanent &&
      !hasProtectedTag;

    return {
      callId,
      containsTactic: analysis.containsTactic,
      tacticName: analysis.tacticName,
      tacticCategory: analysis.tacticCategory,
      isHighFidelity: analysis.isHighFidelity,
      confidence: analysis.confidence,
      isNoise: analysis.isNoise,
      currentProtection: {
        isPermanent,
        hasProtectedTag,
        tags: protectedTags,
      },
      needsProtection,
    };
  } catch (error) {
    console.error(`Error analyzing call ${callId}:`, error);
    return {
      callId,
      containsTactic: false,
      tacticName: null,
      tacticCategory: null,
      isHighFidelity: false,
      confidence: 0,
      isNoise: true,
      currentProtection: {
        isPermanent: metadata?.is_permanent_knowledge === true,
        hasProtectedTag: false,
        tags: metadata?.protected_tags || [],
      },
      needsProtection: false,
    };
  }
}

/**
 * Get all calls from the database
 */
async function getAllCalls(): Promise<any[]> {
  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('id, transcript, metadata, is_permanent_knowledge, created_at, goat_score')
    .not('transcript', 'is', null)
    .neq('transcript', '')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching calls:', error);
    return [];
  }

  return data || [];
}

/**
 * Auto-protect a high-value tactic
 */
async function autoProtectTactic(callId: string): Promise<boolean> {
  try {
    // Tag with GOLDEN_KNOWLEDGE
    const tagged = await tagAsProtected(callId, 'GOLDEN_KNOWLEDGE');
    
    // Set permanent knowledge flag
    const flagged = await setPermanentKnowledge(callId, true);

    return tagged && flagged;
  } catch (error) {
    console.error(`Error auto-protecting call ${callId}:`, error);
    return false;
  }
}

/**
 * Generate audit report
 */
function generateReport(analyses: TacticalAnalysis[]): AuditReport {
  const totalCalls = analyses.length;
  const highFidelityTactics = analyses.filter(a => a.isHighFidelity && !a.isNoise).length;
  const protectedTactics = analyses.filter(
    a => a.isHighFidelity && (a.currentProtection.isPermanent || a.currentProtection.hasProtectedTag)
  ).length;
  const atRiskTactics = analyses.filter(a => a.needsProtection).length;
  const noiseCount = analyses.filter(a => a.isNoise).length;

  // Track coverage by category
  const elliottTactics = new Set<string>();
  const clineTactics = new Set<string>();

  analyses.forEach(analysis => {
    if (analysis.isHighFidelity && analysis.tacticCategory && analysis.tacticName) {
      if (analysis.tacticCategory === 'elliott') {
        elliottTactics.add(analysis.tacticName);
      } else if (analysis.tacticCategory === 'cline') {
        clineTactics.add(analysis.tacticName);
      }
    }
  });

  // Find missing links
  const missingLinks: Array<{ tactic: string; category: string; description: string }> = [];

  MASTER_TACTICS.elliott.forEach(tactic => {
    if (!elliottTactics.has(tactic.name)) {
      missingLinks.push({
        tactic: tactic.name,
        category: 'Elliott',
        description: tactic.description,
      });
    }
  });

  MASTER_TACTICS.cline.forEach(tactic => {
    if (!clineTactics.has(tactic.name)) {
      missingLinks.push({
        tactic: tactic.name,
        category: 'Cline',
        description: tactic.description,
      });
    }
  });

  // At-risk tactics list
  const atRiskTacticsList = analyses
    .filter(a => a.needsProtection)
    .map(a => ({
      callId: a.callId,
      tactic: a.tacticName || 'Unknown',
      category: a.tacticCategory || 'Unknown',
      reason: `High-fidelity ${a.tacticName} (confidence: ${a.confidence}%) not protected`,
    }));

  return {
    totalCalls,
    analyzedCalls: totalCalls,
    highFidelityTactics,
    protectedTactics,
    atRiskTactics,
    autoProtected: 0, // Will be updated after auto-protection
    dnaCoverage: {
      elliott: {
        covered: elliottTactics.size,
        total: MASTER_TACTICS.elliott.length,
        percentage: (elliottTactics.size / MASTER_TACTICS.elliott.length) * 100,
      },
      cline: {
        covered: clineTactics.size,
        total: MASTER_TACTICS.cline.length,
        percentage: (clineTactics.size / MASTER_TACTICS.cline.length) * 100,
      },
      overall: ((elliottTactics.size + clineTactics.size) / (MASTER_TACTICS.elliott.length + MASTER_TACTICS.cline.length)) * 100,
    },
    atRiskTacticsList,
    missingLinks,
    noiseCount,
  };
}

/**
 * Visualize the audit report
 */
function visualizeReport(report: AuditReport): void {
  console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.cyan('  KNOWLEDGE GAP DETECTOR - AUDIT REPORT'));
  console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');

  // DNA Coverage
  console.log(chalk.bold.white('📊 DNA COVERAGE %'));
  console.log('─'.repeat(80));
  console.log(
    `Elliott Tactics: ${chalk.green(report.dnaCoverage.elliott.covered)}/${chalk.white(report.dnaCoverage.elliott.total)} ` +
    `(${chalk.yellow(report.dnaCoverage.elliott.percentage.toFixed(1))}%)`
  );
  console.log(
    `Cline Tactics:   ${chalk.green(report.dnaCoverage.cline.covered)}/${chalk.white(report.dnaCoverage.cline.total)} ` +
    `(${chalk.yellow(report.dnaCoverage.cline.percentage.toFixed(1))}%)`
  );
  console.log(
    `Overall:        ${chalk.bold.green(report.dnaCoverage.overall.toFixed(1))}% coverage`
  );
  console.log('');

  // Statistics
  console.log(chalk.bold.white('📈 STATISTICS'));
  console.log('─'.repeat(80));
  console.log(`Total Calls Analyzed:     ${chalk.white(report.totalCalls)}`);
  console.log(`High-Fidelity Tactics:    ${chalk.green(report.highFidelityTactics)}`);
  console.log(`Protected Tactics:      ${chalk.green(report.protectedTactics)}`);
  console.log(`At-Risk Tactics:         ${chalk.red(report.atRiskTactics)}`);
  console.log(`Auto-Protected:         ${chalk.green(report.autoProtected)}`);
  console.log(`Noise (Low Quality):     ${chalk.gray(report.noiseCount)}`);
  console.log('');

  // At-Risk Tactics
  if (report.atRiskTacticsList.length > 0) {
    console.log(chalk.bold.red('⚠️  AT-RISK TACTICS (High-value logic in "To-be-Archived" pool)'));
    console.log('─'.repeat(80));
    report.atRiskTacticsList.forEach((atRisk, index) => {
      console.log(
        `${index + 1}. ${chalk.yellow(atRisk.tactic)} (${atRisk.category})`
      );
      console.log(`   Call ID: ${chalk.gray(atRisk.callId)}`);
      console.log(`   Reason:  ${chalk.red(atRisk.reason)}`);
      console.log('');
    });
  } else {
    console.log(chalk.bold.green('✅ NO AT-RISK TACTICS - All high-value logic is protected!'));
    console.log('');
  }

  // Missing Links
  if (report.missingLinks.length > 0) {
    console.log(chalk.bold.yellow('🔗 MISSING LINKS (No representation in active memory)'));
    console.log('─'.repeat(80));
    report.missingLinks.forEach((missing, index) => {
      console.log(
        `${index + 1}. ${chalk.yellow(missing.tactic)} (${missing.category})`
      );
      console.log(`   ${chalk.gray(missing.description)}`);
      console.log('');
    });
  } else {
    console.log(chalk.bold.green('✅ NO MISSING LINKS - All master tactics are represented!'));
    console.log('');
  }

  console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');
}

/**
 * Main audit function
 */
async function runKnowledgeAudit(autoProtect: boolean = false): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 Starting Knowledge Gap Detector...\n'));

  // Get all calls
  console.log('📥 Fetching calls from database...');
  const calls = await getAllCalls();
  console.log(`   Found ${calls.length} calls to analyze\n`);

  if (calls.length === 0) {
    console.log(chalk.yellow('⚠️  No calls found in database'));
    return;
  }

  // Analyze each call
  console.log('🤖 Analyzing calls with GPT-4o...');
  const analyses: TacticalAnalysis[] = [];
  let processed = 0;

  for (const call of calls) {
    processed++;
    process.stdout.write(
      `\r   Processing ${processed}/${calls.length}... ${chalk.gray(call.id.substring(0, 8))}`
    );

    const analysis = await analyzeCallForTactics(
      call.id,
      call.transcript,
      call.metadata
    );

    analyses.push(analysis);

    // Small delay to avoid rate limits
    if (processed < calls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n');

  // Generate report
  console.log('📊 Generating audit report...');
  const report = generateReport(analyses);

  // Auto-protect if requested
  if (autoProtect && report.atRiskTactics > 0) {
    console.log(`\n🛡️  Auto-protecting ${report.atRiskTactics} at-risk tactics...`);
    let protectedCount = 0;

    for (const analysis of analyses) {
      if (analysis.needsProtection) {
        const success = await autoProtectTactic(analysis.callId);
        if (success) {
          protectedCount++;
          console.log(
            `   ✅ Protected: ${chalk.green(analysis.tacticName)} (${analysis.callId.substring(0, 8)})`
          );
        }
      }
    }

    report.autoProtected = protectedCount;
    console.log(`\n   ${chalk.green(`Auto-protected ${protectedCount} tactics`)}\n`);
  }

  // Visualize report
  visualizeReport(report);
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const autoProtect = args.includes('--auto-protect') || args.includes('-a');

  try {
    await runKnowledgeAudit(autoProtect);
  } catch (error) {
    console.error(chalk.red('\n❌ Error in knowledge audit:'), error);
    process.exit(1);
  }
}

// Run if executed directly (tsx handles this)
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  });

export { runKnowledgeAudit, generateReport, visualizeReport };
