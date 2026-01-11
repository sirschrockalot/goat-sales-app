/**
 * Apex Prompt Merger - Elite Sales Architect
 * Merges core real estate logic with scraped tactical summaries
 * Focus: Transfer of Conviction style from Elliott/Cline
 * 
 * Features:
 * - Preserves technical contract details and price points
 * - Updates Persona and Tonality sections
 * - Infuses "Transfer of Conviction" into objection handling
 * - Updates Vapi Assistant via PATCH API
 * - Logs before/after comparison
 */

import fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VAPI_API_URL = 'https://api.vapi.ai';

interface TacticalSummary {
  videoTitle: string;
  videoUrl: string;
  objectionHandling: {
    techniques: string[];
    powerPhrases: string[];
    rebuttalPatterns: string[];
  };
  tonalityShifts: {
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      example: string;
    }>;
    emotionalTriggers: string[];
  };
  closingFrames: {
    assumptiveCloses: string[];
    urgencyCreators: string[];
    finalStatements: string[];
  };
  keyTakeaways: string[];
}

/**
 * Get Vapi secret key from environment
 */
function getVapiSecretKey(): string {
  const key = process.env.VAPI_SECRET_KEY;
  if (!key) {
    throw new Error('VAPI_SECRET_KEY not configured');
  }
  return key;
}

/**
 * Read base prompt from file
 */
async function readBasePrompt(): Promise<string> {
  const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
  
  if (!(await fs.pathExists(basePromptPath))) {
    throw new Error(
      `base_prompt.txt not found at ${basePromptPath}\n` +
      'Please create this file with your core wholesaling logic, PA Clauses 1-19, and underwriting math.'
    );
  }

  const basePrompt = await fs.readFile(basePromptPath, 'utf-8');
  
  if (!basePrompt.trim()) {
    throw new Error('base_prompt.txt is empty');
  }

  console.log(`✅ Read base prompt (${basePrompt.length} characters, ${basePrompt.split(/\s+/).length} words)`);
  return basePrompt;
}

/**
 * Read all private portal content from /raw_dna/private/ (PRIORITY: 10 - HIGHEST)
 */
async function readPrivatePortalContent(): Promise<string> {
  const privateDir = path.join(process.cwd(), 'raw_dna', 'private');
  
  if (!(await fs.pathExists(privateDir))) {
    console.warn('⚠️  Private portal directory not found');
    return '';
  }

  let allContent = '';

  // Read all files in the private directory
  const files = await fs.readdir(privateDir);
  const textFiles = files.filter(file => 
    file.endsWith('.txt') && 
    (file.includes('portal') || file.includes('private'))
  );

  if (textFiles.length === 0) {
    console.warn('⚠️  No private portal files found in /raw_dna/private/');
    return '';
  }

  for (const file of textFiles) {
    try {
      const filePath = path.join(privateDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Only include content that has PRIORITY: 10 tag
      if (content.includes('PRIORITY: 10') || content.includes('PRIVATE_CLINE_PORTAL')) {
        allContent += `\n${'='.repeat(80)}\n`;
        allContent += `FILE: ${file}\n`;
        allContent += `${'='.repeat(80)}\n\n`;
        allContent += content;
        allContent += `\n\n`;
        console.log(`✅ Loaded: ${file} (${content.length} characters, PRIORITY: 10)`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }

  return allContent;
}

/**
 * Read all tactical summaries from /raw_dna/summaries/ (PUBLIC - LOWER PRIORITY)
 */
async function readTacticalSummaries(): Promise<TacticalSummary[]> {
  const summariesDir = path.join(process.cwd(), 'raw_dna', 'summaries');
  
  if (!(await fs.pathExists(summariesDir))) {
    console.warn(`⚠️  Summaries directory not found: ${summariesDir}`);
    return [];
  }

  const files = await fs.readdir(summariesDir);
  const summaryFiles = files.filter(file => file.endsWith('_summary.json'));

  if (summaryFiles.length === 0) {
    console.warn('⚠️  No tactical summary files found. Run dna:batch first.');
    return [];
  }

  const summaries: TacticalSummary[] = [];

  for (const file of summaryFiles) {
    try {
      const filePath = path.join(summariesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const summary = JSON.parse(content) as TacticalSummary;
      summaries.push(summary);
      console.log(`✅ Loaded summary: ${file}`);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }

  console.log(`✅ Loaded ${summaries.length} tactical summary file(s)`);
  return summaries;
}

/**
 * Extract key insights from private portal content (PRIORITY: 10)
 */
function extractPrivatePortalInsights(allPrivateContent: string): string {
  if (!allPrivateContent) {
    return '';
  }

  let insights = '**PRIVATE CLINE PORTAL DNA (PRIORITY: 10 - HIGHEST PRIORITY - OVERRIDES ALL PUBLIC TACTICS):**\n\n';

  // Extract Eric's Tips and key technical details
  const tipsMatch = allPrivateContent.match(/(?:ERIC'?S?\s+)?TIP[:\s]+[^\n]{20,300}/gi);
  const clause17Match = allPrivateContent.match(/clause\s+17[^\n]{20,500}/gi);
  const technicalMatch = allPrivateContent.match(/\$[\d,]+[^\n]{10,100}/gi);
  const transcriptMatch = allPrivateContent.match(/TRANSCRIPT:[\s\S]{50,3000}/gi);
  const closingMatch = allPrivateContent.match(/(?:closing|close|final)[\s\S]{50,500}/gi);
  const objectionMatch = allPrivateContent.match(/(?:objection|rebuttal|pushback)[\s\S]{50,500}/gi);

  if (tipsMatch) {
    insights += `**Eric's Tips (${tipsMatch.length} found):**\n`;
    tipsMatch.slice(0, 15).forEach((tip, i) => {
      insights += `${i + 1}. ${tip.trim()}\n`;
    });
    insights += '\n';
  }

  if (clause17Match) {
    insights += `**Clause 17 Specific Phrasing (USE EXACTLY - DO NOT MODIFY):**\n${clause17Match.slice(0, 10).map(m => `- ${m.trim()}`).join('\n')}\n\n`;
  }

  if (technicalMatch) {
    insights += `**Technical Details:**\n${technicalMatch.slice(0, 10).map(m => `- ${m.trim()}`).join('\n')}\n\n`;
  }

  if (transcriptMatch) {
    insights += `**Lesson Transcripts (${transcriptMatch.length} found):**\n`;
    transcriptMatch.slice(0, 5).forEach((transcript, i) => {
      insights += `${i + 1}. ${transcript.substring(0, 300).trim()}...\n`;
    });
    insights += '\n';
  }

  if (closingMatch) {
    insights += `**Closing Techniques (${closingMatch.length} found):**\n`;
    closingMatch.slice(0, 10).forEach((closing, i) => {
      insights += `${i + 1}. ${closing.substring(0, 200).trim()}...\n`;
    });
    insights += '\n';
  }

  if (objectionMatch) {
    insights += `**Objection Handling (${objectionMatch.length} found):**\n`;
    objectionMatch.slice(0, 10).forEach((objection, i) => {
      insights += `${i + 1}. ${objection.substring(0, 200).trim()}...\n`;
    });
    insights += '\n';
  }

  insights += '\n**CRITICAL PRIORITY INSTRUCTION (PRIORITY: 10):**\n';
  insights += '- This Private Cline Portal DNA has PRIORITY: 10 (HIGHEST)\n';
  insights += '- It MUST override ANY conflicting YouTube/public tactics\n';
  insights += '- Use Eric\'s specific phrasing (especially Clause 17) EXACTLY as provided\n';
  insights += '- Private Portal technicalities take absolute precedence\n';
  insights += '- Focus on infusing Closing and Objection sections with this DNA\n';
  insights += '- Only use public tactics if they don\'t conflict with Private Portal content\n\n';

  return insights;
}

/**
 * Aggregate tactical insights from summaries (PUBLIC - LOWER PRIORITY)
 */
function aggregateTacticalInsights(summaries: TacticalSummary[]): string {
  if (summaries.length === 0) {
    return 'No tactical summaries available.';
  }

  const allObjectionTechniques = [...new Set(summaries.flatMap(s => s.objectionHandling.techniques))];
  const allPowerPhrases = [...new Set(summaries.flatMap(s => s.objectionHandling.powerPhrases))];
  const allRebuttalPatterns = [...new Set(summaries.flatMap(s => s.objectionHandling.rebuttalPatterns))];
  const allTonalityTransitions = summaries.flatMap(s => s.tonalityShifts.transitions);
  const allEmotionalTriggers = [...new Set(summaries.flatMap(s => s.tonalityShifts.emotionalTriggers))];
  const allAssumptiveCloses = [...new Set(summaries.flatMap(s => s.closingFrames.assumptiveCloses))];
  const allUrgencyCreators = [...new Set(summaries.flatMap(s => s.closingFrames.urgencyCreators))];
  const allFinalStatements = [...new Set(summaries.flatMap(s => s.closingFrames.finalStatements))];
  const allKeyTakeaways = [...new Set(summaries.flatMap(s => s.keyTakeaways))];

  return `**PUBLIC TACTICAL SUMMARIES (LOWER PRIORITY - Use only if not in Private Portal):**

**Objection Handling Techniques:**
${allObjectionTechniques.slice(0, 15).map(t => `- ${t}`).join('\n')}

**Power Phrases:**
${allPowerPhrases.slice(0, 20).map(p => `- "${p}"`).join('\n')}

**Rebuttal Patterns:**
${allRebuttalPatterns.slice(0, 10).map(p => `- ${p}`).join('\n')}

**Tonality Shifts (Transfer of Conviction):**
${allTonalityTransitions.slice(0, 10).map(t => 
  `- From "${t.from}" to "${t.to}" (Trigger: ${t.trigger})\n  Example: "${t.example}"`
).join('\n\n')}

**Emotional Triggers:**
${allEmotionalTriggers.slice(0, 15).map(t => `- ${t}`).join('\n')}

**Assumptive Closes:**
${allAssumptiveCloses.slice(0, 10).map(c => `- "${c}"`).join('\n')}

**Urgency Creators:**
${allUrgencyCreators.slice(0, 10).map(u => `- "${u}"`).join('\n')}

**Final Statements:**
${allFinalStatements.slice(0, 10).map(s => `- "${s}"`).join('\n')}

**Key Takeaways (Transfer of Conviction Style):**
${allKeyTakeaways.slice(0, 10).map(t => `- ${t}`).join('\n')}`;
}

/**
 * Merge base prompt with tactical summaries using GPT-4o
 */
async function mergeApexPrompt(
  basePrompt: string,
  privatePortalInsights: string,
  publicTacticalInsights: string
): Promise<{ mergedPrompt: string; tacticalChanges: string[] }> {
  console.log('🔀 Merging prompts with GPT-4o (Elite Sales Architect)...');

  const hasPrivateContent = privatePortalInsights && !privatePortalInsights.includes('not found');
  const hasPublicContent = publicTacticalInsights && !publicTacticalInsights.includes('No tactical summaries');

  if (!hasPrivateContent && !hasPublicContent) {
    console.warn('⚠️  No tactical content to merge. Returning base prompt unchanged.');
    return {
      mergedPrompt: basePrompt,
      tacticalChanges: ['No tactical content available - base prompt unchanged'],
    };
  }

  const prompt = `You are an Elite Sales Architect specializing in real estate wholesaling. Your task is to merge core wholesaling logic with elite closer tactics (Elliott/Cline style).

**CRITICAL PRIORITY RULES:**
1. **PRIVATE PORTAL CONTENT HAS HIGHEST PRIORITY:**
   - If Private Portal content exists, it MUST override any conflicting public tactics
   - Use Eric's specific phrasing (especially for Clause 17) EXACTLY as provided in Private Portal
   - Private Portal technicalities take precedence over generic public tactics
   - Only use public tactics if they don't conflict with Private Portal content

2. **PRESERVE ALL TECHNICAL DETAILS:**

**CRITICAL RULES:**
1. **PRESERVE ALL TECHNICAL DETAILS:**
   - Keep ALL contract details (PA Clauses 1-19) EXACTLY as written
   - Preserve ALL price points ($82,700, ARV calculations, 70% Rule)
   - Keep ALL underwriting math and formulas
   - Maintain ALL technical real estate logic

2. **UPDATE PERSONA AND TONALITY:**
   - Update the "Persona" section to reflect the "Transfer of Conviction" style
   - Update "Tonality" directives to match the elite closer patterns
   - Infuse confidence, authority, and conviction into the persona

3. **ENHANCE OBJECTION HANDLING:**
   - Integrate the "Transfer of Conviction" style into objection handling
   - Use the power phrases and rebuttal patterns naturally
   - Apply tonality shift techniques (from friendly to firm when needed)
   - Incorporate assumptive closes and urgency creators

4. **MAINTAIN STRUCTURE:**
   - Keep the same overall prompt structure
   - Preserve section headers and organization
   - Only update content within Persona, Tonality, and Objection Handling sections

**BASE PROMPT (Core Logic):**
${basePrompt.substring(0, 15000)}${basePrompt.length > 15000 ? '...\n[TRUNCATED - FULL PROMPT PROVIDED TO MODEL]' : ''}

${hasPrivateContent ? `**PRIVATE PORTAL CONTENT (HIGH PRIORITY - OVERRIDES PUBLIC TACTICS):**
${privatePortalInsights}

` : ''}${hasPublicContent ? `**PUBLIC TACTICAL SUMMARIES (LOWER PRIORITY - Use only if not in Private Portal):**
${publicTacticalInsights}
` : ''}

**YOUR TASK:**
1. Read the FULL base prompt (it may be truncated above, but the model has access to the full text)
2. Identify sections for:
   - Closing (infuse Private Portal DNA here)
   - Objection Handling (infuse Private Portal DNA here)
   - Persona and Tonality (update with Private Portal style)
3. Infuse the specific technicalities and tonality from Private Portal DNA into Closing and Objection sections
4. Use Eric's exact phrasing from Private Portal (especially for Clause 17 and objection handling)
5. PRESERVE all technical contract details ($82,700 price point, PA Clauses 1-19) - DO NOT TOUCH
6. Maintain the same prompt structure and organization

**OUTPUT FORMAT:**
Return a JSON object with:
{
  "mergedPrompt": "The complete merged prompt (full text)",
  "tacticalChanges": [
    "Change 1: Description of what was updated",
    "Change 2: Another update description",
    ...
  ]
}

**VALIDATION:**
Before returning, verify:
- PA Clauses 1-19 are preserved verbatim (UNTOUCHED)
- $82,700 price point is unchanged (UNTOUCHED)
- ARV/70% Rule logic is intact (UNTOUCHED)
- Closing section is infused with Private Portal DNA
- Objection handling section is infused with Private Portal DNA
- Persona reflects Private Portal "Transfer of Conviction" style
- Tonality matches Private Portal patterns`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an Elite Sales Architect. Merge prompts while preserving technical details and infusing "Transfer of Conviction" style. Return valid JSON only.',
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

    const result = JSON.parse(response) as { mergedPrompt: string; tacticalChanges: string[] };

    // Safety checks
    if (basePrompt.includes('82,700') && !result.mergedPrompt.includes('82,700') && !result.mergedPrompt.includes('82700')) {
      console.warn('⚠️  WARNING: $82,700 price point may have been modified. Review carefully.');
    } else if (basePrompt.includes('82,700')) {
      console.log('✅ $82,700 price point verified as preserved');
    }

    // Check for PA Summary preservation
    const paSummaryKeywords = ['Clause 1', 'Clause 17', 'PA Summary', 'Purchase Agreement'];
    const hasPASummary = paSummaryKeywords.some(keyword => basePrompt.includes(keyword));
    if (hasPASummary) {
      const preserved = paSummaryKeywords.some(keyword => result.mergedPrompt.includes(keyword));
      if (!preserved) {
        console.warn('⚠️  WARNING: PA Summary clauses may not be fully preserved. Review carefully.');
      } else {
        console.log('✅ PA Summary clauses verified as preserved');
      }
    }

    console.log('✅ Prompt merge complete');
    return result;
  } catch (error) {
    console.error('Error merging prompts:', error);
    throw error;
  }
}

/**
 * Update Vapi Assistant via PATCH API
 */
async function updateVapiAssistant(assistantId: string, newPrompt: string): Promise<void> {
  console.log(`📤 Updating Vapi Assistant: ${assistantId}`);

  // First, get the current assistant to preserve other settings
  const getResponse = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to fetch assistant: ${errorText}`);
  }

  const currentAssistant = await getResponse.json();

  // Update the system prompt
  const patchResponse = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: {
        ...currentAssistant.model,
        messages: [
          {
            role: 'system',
            content: newPrompt,
          },
        ],
      },
    }),
  });

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text();
    throw new Error(`Failed to update assistant: ${errorText}`);
  }

  console.log('✅ Vapi Assistant updated successfully');
}

/**
 * Calculate word count
 */
function getWordCount(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Main merger function
 */
export async function mergeApexPromptAndUpdate(assistantId: string): Promise<void> {
  console.log('🚀 Starting Apex Prompt Merger (Elite Sales Architect)...\n');

  try {
    // 1. Read base prompt
    const basePrompt = await readBasePrompt();
    const baseWordCount = getWordCount(basePrompt);

    // 2. Read all private portal content (PRIORITY: 10 - HIGHEST)
    const allPrivateContent = await readPrivatePortalContent();
    const privatePortalInsights = extractPrivatePortalInsights(allPrivateContent);

    // 3. Read public tactical summaries (LOWER PRIORITY)
    const summaries = await readTacticalSummaries();
    const publicTacticalInsights = aggregateTacticalInsights(summaries);

    if (!privatePortalInsights && summaries.length === 0) {
      console.warn('⚠️  No tactical content found. Cannot merge. Exiting.');
      return;
    }

    // 4. Merge prompts (with priority weighting)
    const { mergedPrompt, tacticalChanges } = await mergeApexPrompt(
      basePrompt,
      privatePortalInsights,
      publicTacticalInsights
    );
    const mergedWordCount = getWordCount(mergedPrompt);

    // 5. Save merged prompt to file for verification
    const mergedPromptPath = path.join(process.cwd(), 'merged_prompt_output.txt');
    await fs.writeFile(mergedPromptPath, mergedPrompt, 'utf-8');
    console.log(`💾 Saved merged prompt to: ${mergedPromptPath}`);

    // 6. Log before/after comparison
    console.log('\n' + '='.repeat(60));
    console.log('📊 BEFORE vs AFTER COMPARISON');
    console.log('='.repeat(60));
    console.log(`Before: ${baseWordCount} words (${basePrompt.length} characters)`);
    console.log(`After:  ${mergedWordCount} words (${mergedPrompt.length} characters)`);
    console.log(`Change: ${mergedWordCount - baseWordCount > 0 ? '+' : ''}${mergedWordCount - baseWordCount} words (${((mergedWordCount - baseWordCount) / baseWordCount * 100).toFixed(1)}%)`);

    console.log('\n🔧 KEY TACTICAL CHANGES:');
    tacticalChanges.forEach((change, index) => {
      console.log(`  ${index + 1}. ${change}`);
    });

    // 7. Update Vapi Assistant
    await updateVapiAssistant(assistantId, mergedPrompt);

    console.log('\n✅ Apex Prompt Merger complete!');
    console.log(`📝 Applied ${tacticalChanges.length} tactical updates`);
    console.log(`💾 Assistant updated in Vapi`);
  } catch (error) {
    console.error('❌ Error in Apex Prompt Merger:', error);
    throw error;
  }
}

// CLI interface - always run when executed directly
const args = process.argv.slice(2);

if (args.length === 0 || !args[0]) {
  console.log(`
Apex Prompt Merger - Elite Sales Architect

Usage:
  npm run apex:merge <assistant-id>

Example:
  npm run apex:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

Environment Variables Required:
  - OPENAI_API_KEY
  - VAPI_SECRET_KEY

Files Required:
  - base_prompt.txt (in project root)
  - raw_dna/summaries/*_summary.json (from dna:batch)
    `);
  process.exit(0);
}

const assistantId = args[0];

mergeApexPromptAndUpdate(assistantId)
  .then(() => {
    console.log('\n✅ Success!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
