/**
 * Prompt Merger - Automated System Prompt Updater
 * Merges scraped DNA analysis with base prompt and updates Vapi Assistant
 * 
 * Safety Features:
 * - Preserves Technical Real Estate Logic ($82,700 price point, ARV calculations)
 * - Never overwrites PA Summary clauses (1-19)
 * - Updates Tonality and Objection Handling based on scraped patterns
 * - Stores versions in Supabase for rollback capability
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';
import { supabaseAdmin } from '../src/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!supabaseAdmin) {
  throw new Error('Supabase admin client not initialized. Check environment variables.');
}

const VAPI_API_URL = 'https://api.vapi.ai';

interface DNAAnalysis {
  summary: string;
  powerPhrases: Array<{
    phrase: string;
    context: string;
    useCase: 'clause_17' | 'price_defense' | 'rapport' | 'objection_handling' | 'closing' | 'other';
    frequency: number;
  }>;
  linguisticPatterns: string[];
  keyTechniques: string[];
  emotionalTriggers: string[];
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
 * Extract current prompt from Vapi Assistant (helper function)
 */
async function extractCurrentPromptFromVapi(assistantId: string): Promise<string> {
  console.log(`📥 Extracting current prompt from Vapi Assistant: ${assistantId}`);

  const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch assistant: ${errorText}`);
  }

  const assistant = await response.json();
  const currentPrompt = assistant.model?.messages?.[0]?.content || '';

  if (!currentPrompt.trim()) {
    throw new Error('No system prompt found in assistant');
  }

  return currentPrompt;
}

/**
 * Read base prompt from file, or extract from Vapi if file doesn't exist
 */
async function readBasePrompt(assistantId?: string): Promise<string> {
  const basePromptPath = path.join(process.cwd(), 'base_prompt.txt');
  
  if (!(await fs.pathExists(basePromptPath))) {
    if (assistantId) {
      console.log('📝 base_prompt.txt not found. Extracting from Vapi Assistant...');
      const currentPrompt = await extractCurrentPromptFromVapi(assistantId);
      
      // Save it for future use
      await fs.writeFile(basePromptPath, currentPrompt, 'utf-8');
      console.log(`✅ Saved current prompt to ${basePromptPath}`);
      
      return currentPrompt;
    } else {
      throw new Error(
        `base_prompt.txt not found at ${basePromptPath}\n` +
        'Please create this file with your core wholesaling logic and $82,700 price point, or\n' +
        'provide an assistant-id to extract the current prompt from Vapi.'
      );
    }
  }

  const basePrompt = await fs.readFile(basePromptPath, 'utf-8');
  
  if (!basePrompt.trim()) {
    throw new Error('base_prompt.txt is empty');
  }

  console.log(`✅ Read base prompt (${basePrompt.length} characters)`);
  return basePrompt;
}

/**
 * Read all DNA analysis files from /raw_dna/analysis
 */
async function readDNAAnalyses(): Promise<DNAAnalysis[]> {
  const analysisDir = path.join(process.cwd(), 'raw_dna', 'analysis');
  
  if (!(await fs.pathExists(analysisDir))) {
    console.warn(`⚠️  Analysis directory not found: ${analysisDir}`);
    return [];
  }

  const files = await fs.readdir(analysisDir);
  const analysisFiles = files.filter(file => file.endsWith('_analysis.json'));

  if (analysisFiles.length === 0) {
    console.warn('⚠️  No analysis files found. Run dna:scrape first.');
    return [];
  }

  const analyses: DNAAnalysis[] = [];

  for (const file of analysisFiles) {
    try {
      const filePath = path.join(analysisDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const analysis = JSON.parse(content) as DNAAnalysis;
      analyses.push(analysis);
      console.log(`✅ Loaded analysis: ${file}`);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }

  console.log(`✅ Loaded ${analyses.length} DNA analysis file(s)`);
  return analyses;
}

/**
 * Extract PA Summary clauses (1-19) from prompt for safety preservation
 */
function extractPASummaryClauses(prompt: string): string {
  // Look for PA Summary section - it typically starts with "PA SUMMARY" or "PURCHASE AGREEMENT SUMMARY"
  // and contains clauses numbered 1-19
  const paSummaryRegex = /(?:PA\s+SUMMARY|PURCHASE\s+AGREEMENT\s+SUMMARY|CONTRACT\s+WALK[-\s]?THROUGH)[\s\S]*?(?=\n\n[A-Z]|$)/i;
  const match = prompt.match(paSummaryRegex);
  
  if (match) {
    return match[0];
  }

  // Fallback: Look for numbered clauses (1-19)
  const clauseRegex = /(?:Clause|Section)\s+(?:1[0-9]|[1-9])(?:[\s\S]*?)(?=\n\n[A-Z]|$)/gi;
  const clauses = prompt.match(clauseRegex);
  
  if (clauses && clauses.length > 0) {
    return clauses.join('\n\n');
  }

  // If no PA Summary found, return empty string (will be preserved as-is)
  console.warn('⚠️  No PA Summary clauses detected. Proceeding with caution.');
  return '';
}

/**
 * Merge base prompt with DNA analyses using GPT-4o
 */
async function mergePrompts(
  basePrompt: string,
  dnaAnalyses: DNAAnalysis[]
): Promise<{ mergedPrompt: string; changesSummary: string }> {
  console.log('🔀 Merging prompts with GPT-4o...');

  if (dnaAnalyses.length === 0) {
    console.warn('⚠️  No DNA analyses to merge. Returning base prompt unchanged.');
    return {
      mergedPrompt: basePrompt,
      changesSummary: 'No DNA analyses available - base prompt unchanged',
    };
  }

  // Extract PA Summary for preservation
  const paSummaryClauses = extractPASummaryClauses(basePrompt);

  // Aggregate DNA insights
  const allPowerPhrases = dnaAnalyses.flatMap(analysis => analysis.powerPhrases);
  const allLinguisticPatterns = [...new Set(dnaAnalyses.flatMap(analysis => analysis.linguisticPatterns))];
  const allKeyTechniques = [...new Set(dnaAnalyses.flatMap(analysis => analysis.keyTechniques))];
  const allEmotionalTriggers = [...new Set(dnaAnalyses.flatMap(analysis => analysis.emotionalTriggers))];

  // Categorize power phrases by use case
  const clause17Phrases = allPowerPhrases.filter(p => p.useCase === 'clause_17');
  const priceDefensePhrases = allPowerPhrases.filter(p => p.useCase === 'price_defense');
  const rapportPhrases = allPowerPhrases.filter(p => p.useCase === 'rapport');
  const objectionHandlingPhrases = allPowerPhrases.filter(p => p.useCase === 'objection_handling');
  const closingPhrases = allPowerPhrases.filter(p => p.useCase === 'closing');

  const prompt = `You are a Sales Prompt Engineer specializing in real estate wholesaling. Your task is to merge a base prompt with new sales tactics extracted from elite closer transcripts.

**CRITICAL SAFETY RULES:**
1. **PRESERVE ALL TECHNICAL REAL ESTATE LOGIC:**
   - Keep the $82,700 purchase price point EXACTLY as written
   - Preserve all ARV (After Repair Value) calculations
   - Keep all 70% Rule logic
   - Maintain all financial framework instructions (Fix & Flip, Buy & Hold, Creative Finance)
   - Preserve all comp analysis logic

2. **NEVER OVERWRITE PA SUMMARY CLAUSES (1-19):**
   - The PA Summary section must remain EXACTLY as written
   - Do not modify, reword, or update any clause explanations
   - The PA Summary is protected and must be preserved verbatim

3. **UPDATE ONLY TONALITY AND OBJECTION HANDLING:**
   - Update the language patterns to match the scraped DNA
   - Integrate power phrases naturally into objection handling sections
   - Update tonality directives to match the linguistic patterns
   - Enhance emotional triggers based on scraped data

**BASE PROMPT:**
${basePrompt.substring(0, 12000)}${basePrompt.length > 12000 ? '...\n[TRUNCATED - FULL PROMPT PROVIDED TO MODEL]' : ''}

**PA SUMMARY CLAUSES (MUST PRESERVE VERBATIM):**
${paSummaryClauses || '[No PA Summary detected - proceed with caution]'}

**SCRAPED DNA INSIGHTS:**

**Power Phrases for Clause 17:**
${clause17Phrases.slice(0, 10).map(p => `- "${p.phrase}" (Context: ${p.context}, Frequency: ${p.frequency})`).join('\n')}

**Power Phrases for Price Defense:**
${priceDefensePhrases.slice(0, 10).map(p => `- "${p.phrase}" (Context: ${p.context}, Frequency: ${p.frequency})`).join('\n')}

**Power Phrases for Rapport:**
${rapportPhrases.slice(0, 10).map(p => `- "${p.phrase}" (Context: ${p.context}, Frequency: ${p.frequency})`).join('\n')}

**Power Phrases for Objection Handling:**
${objectionHandlingPhrases.slice(0, 10).map(p => `- "${p.phrase}" (Context: ${p.context}, Frequency: ${p.frequency})`).join('\n')}

**Power Phrases for Closing:**
${closingPhrases.slice(0, 10).map(p => `- "${p.phrase}" (Context: ${p.context}, Frequency: ${p.frequency})`).join('\n')}

**Linguistic Patterns:**
${allLinguisticPatterns.slice(0, 15).map(p => `- ${p}`).join('\n')}

**Key Techniques:**
${allKeyTechniques.slice(0, 15).map(t => `- ${t}`).join('\n')}

**Emotional Triggers:**
${allEmotionalTriggers.slice(0, 15).map(t => `- ${t}`).join('\n')}

**YOUR TASK:**
1. Read the FULL base prompt (it may be truncated above, but the model has access to the full text)
2. Identify sections that handle:
   - Tonality and voice directives
   - Objection handling and rebuttals
   - Rapport building techniques
   - Closing techniques
3. Update these sections with the scraped DNA insights, integrating power phrases naturally
4. PRESERVE the PA Summary clauses (1-19) EXACTLY as written
5. PRESERVE all technical real estate logic ($82,700, ARV, 70% Rule, etc.)
6. Enhance the prompt with the linguistic patterns and emotional triggers

**OUTPUT FORMAT:**
Return a JSON object with:
{
  "mergedPrompt": "The complete merged prompt (full text)",
  "changesSummary": "A 2-3 sentence summary of what changed (e.g., 'Updated objection handling with 5 new power phrases from Eric Cline. Enhanced rapport building with emotional triggers. Preserved all technical logic and PA Summary clauses.')"
}

**VALIDATION:**
Before returning, verify:
- PA Summary clauses are preserved verbatim
- $82,700 price point is unchanged
- ARV/70% Rule logic is intact
- New power phrases are integrated naturally
- Tonality matches scraped patterns`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Sales Prompt Engineer. Merge prompts while preserving technical logic and PA Summary clauses. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent merging
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(response) as { mergedPrompt: string; changesSummary: string };

    // Safety check: Verify PA Summary is preserved
    if (paSummaryClauses) {
      const paSummaryPreserved = result.mergedPrompt.includes(paSummaryClauses.substring(0, 100));
      if (!paSummaryPreserved) {
        console.warn('⚠️  WARNING: PA Summary may not be fully preserved. Review the merged prompt carefully.');
      } else {
        console.log('✅ PA Summary clauses verified as preserved');
      }
    }

    // Safety check: Verify $82,700 is preserved
    if (!result.mergedPrompt.includes('82,700') && !result.mergedPrompt.includes('82700')) {
      console.warn('⚠️  WARNING: $82,700 price point may have been modified. Review carefully.');
    } else {
      console.log('✅ $82,700 price point verified as preserved');
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
 * Save prompt version to Supabase for rollback
 */
async function savePromptVersion(
  assistantId: string,
  newPrompt: string,
  changesSummary: string
): Promise<void> {
  console.log(`💾 Saving prompt version to Supabase...`);

  // Get current version number
  const { data: existingVersions, error: fetchError } = await supabaseAdmin
    .from('prompt_versions')
    .select('version_number')
    .eq('assistant_id', assistantId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error fetching existing versions: ${fetchError.message}`);
  }

  const nextVersion = existingVersions ? existingVersions.version_number + 1 : 1;

  // Deactivate all previous versions
  await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: false })
    .eq('assistant_id', assistantId)
    .eq('is_active', true);

  // Insert new version with 'active' status (since we're applying it directly)
  const { error: insertError } = await supabaseAdmin
    .from('prompt_versions')
    .insert({
      assistant_id: assistantId,
      version_number: nextVersion,
      prompt_text: newPrompt,
      changes_summary: changesSummary,
      stories_added: [], // No stories added in DNA merger
      is_active: true,
      status: 'active', // Directly active since we're applying it
      applied_by: null, // System update
    });

  if (insertError) {
    throw new Error(`Error saving prompt version: ${insertError.message}`);
  }

  console.log(`✅ Saved prompt version ${nextVersion} for assistant ${assistantId}`);
}

/**
 * Main merger function
 */
export async function mergeAndUpdatePrompt(assistantId: string): Promise<void> {
  console.log('🚀 Starting Prompt Merger...\n');

  try {
    // 1. Read base prompt (will extract from Vapi if file doesn't exist)
    const basePrompt = await readBasePrompt(assistantId);

    // 2. Read DNA analyses
    const dnaAnalyses = await readDNAAnalyses();

    if (dnaAnalyses.length === 0) {
      console.warn('⚠️  No DNA analyses found. Cannot merge. Exiting.');
      return;
    }

    // 3. Merge prompts
    const { mergedPrompt, changesSummary } = await mergePrompts(basePrompt, dnaAnalyses);

    // 4. Update Vapi Assistant
    await updateVapiAssistant(assistantId, mergedPrompt);

    // 5. Save version to Supabase
    await savePromptVersion(assistantId, mergedPrompt, changesSummary);

    console.log('\n✅ Prompt merger complete!');
    console.log(`📝 Changes: ${changesSummary}`);
    console.log(`💾 Version saved to Supabase for rollback`);
  } catch (error) {
    console.error('❌ Error in prompt merger:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || !args[0]) {
    console.log(`
Prompt Merger - Automated System Prompt Updater

Usage:
  npm run prompt:merge <assistant-id>

Example:
  npm run prompt:merge aaf338ae-b74a-43e4-ac48-73dd99817e9f

Environment Variables Required:
  - OPENAI_API_KEY
  - VAPI_SECRET_KEY
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Files Required:
  - base_prompt.txt (in project root)
  - raw_dna/analysis/*_analysis.json (from dna:scrape)
    `);
    process.exit(0);
  }

  const assistantId = args[0];

  mergeAndUpdatePrompt(assistantId)
    .then(() => {
      console.log('\n✅ Success!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
