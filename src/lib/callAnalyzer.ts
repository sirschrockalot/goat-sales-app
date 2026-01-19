/**
 * Call Analyzer for AI Training
 *
 * Analyzes real calls (both acquisition and disposition) to extract:
 * - Successful techniques and rebuttals
 * - Objection handling patterns
 * - Rapport-building stories
 * - Closing techniques
 *
 * These insights are used to improve AI personas for training.
 */

import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import logger from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type CallMode = 'acquisition' | 'disposition';

/**
 * Extracted insight from a call
 */
export interface CallInsight {
  id?: string;
  callId: string;
  mode: CallMode;
  insightType: 'rebuttal' | 'technique' | 'story' | 'objection_handling' | 'closing';
  category: string;
  content: string;
  context: string;
  effectiveness: number; // 0-10
  sellerResponse?: string;
  coachingNote?: string;
}

/**
 * Full analysis result for a call
 */
export interface CallAnalysisResult {
  callId: string;
  mode: CallMode;
  overallScore: number;
  insights: CallInsight[];
  summary: string;
  strengthAreas: string[];
  improvementAreas: string[];
  recommendedForTraining: boolean;
}

/**
 * Acquisition-specific analysis prompt
 */
const ACQUISITION_ANALYSIS_PROMPT = `You are an expert sales coach analyzing an ACQUISITION call (wholesaler calling a property seller).

Analyze this call transcript and extract insights that can be used to train AI sales agents.

Look for:
1. **REBUTTALS** - How the rep handled seller objections (price too low, not ready to sell, need to think about it)
2. **TECHNIQUES** - Effective rapport-building, discovery questions, empathy statements
3. **STORIES** - Third-party stories used to build rapport ("I had a client in [CITY] who...")
4. **OBJECTION HANDLING** - Specific patterns for common objections (spouse needs to agree, want more money, bad timing)
5. **CLOSING** - Techniques used to get verbal agreement to price and move toward signing

For the ACQUISITION script, focus on these gates:
- Gate 1: The Hook (Building rapport, explaining why you're calling)
- Gate 2: Discovery (Understanding seller's situation, motivation, timeline)
- Gate 3: Property Condition (Getting repair details)
- Gate 4: The Offer (Presenting price, handling price objections)
- Gate 5: The Clinch (Getting verbal yes, moving to contract signing)

Rate each insight's effectiveness (0-10) based on seller response.

Output JSON:
{
  "overallScore": [0-100],
  "insights": [
    {
      "insightType": "rebuttal|technique|story|objection_handling|closing",
      "category": "[specific category like 'price_objection', 'spouse_objection', 'rapport_building']",
      "content": "[exact words or technique used]",
      "context": "[what gate this was in, what triggered it]",
      "effectiveness": [0-10],
      "sellerResponse": "[how the seller responded]",
      "coachingNote": "[why this worked or how to use it]"
    }
  ],
  "summary": "[2-3 sentence summary of the call]",
  "strengthAreas": ["area1", "area2"],
  "improvementAreas": ["area1", "area2"],
  "recommendedForTraining": true/false
}`;

/**
 * Disposition-specific analysis prompt
 */
const DISPOSITION_ANALYSIS_PROMPT = `You are an expert sales coach analyzing a DISPOSITION call (wholesaler calling an investor/buyer to sell a property under assignment).

Analyze this call transcript and extract insights that can be used to train AI buyer personas.

Look for:
1. **REBUTTALS** - How the rep handled buyer objections (ARV too high, repairs underestimated, EMD too much)
2. **TECHNIQUES** - Effective urgency creation, comp presentation, value articulation
3. **OBJECTION HANDLING** - Specific patterns for buyer objections (challenging numbers, wanting better terms)
4. **CLOSING** - Techniques used to get buyer to commit to walkthrough and sign assignment
5. **TERMS DEFENSE** - How the rep held firm on EMD ($5k standard, $3k minimum) and timeline (7-day close)

For the DISPOSITION script, focus on these gates:
- Gate 1: The Hook (Leading with numbers - ARV, buy-in, spread, ROI)
- Gate 2: The Narrative (Justifying ARV with comps, "worst house on best street")
- Gate 3: The Scarcity Anchor (Creating urgency - other buyers, walkthroughs, moving fast)
- Gate 4: The Terms (EMD, close timeline, title company, verifying buyer capital)
- Gate 5: The Clinch (Getting commitment to sign assignment immediately)

SPECIAL FOCUS on these objection categories:
- ARV objections ("Your ARV is too high")
- Repair objections ("Your estimate is off")
- EMD objections ("$5k is too much", "Make it refundable")
- Timeline objections ("7 days is too fast")
- Credibility objections ("How many deals have you closed?")

Rate each insight's effectiveness (0-10) based on buyer response.

Output JSON:
{
  "overallScore": [0-100],
  "insights": [
    {
      "insightType": "rebuttal|technique|objection_handling|closing",
      "category": "[specific category like 'arv_objection', 'emd_negotiation', 'scarcity_creation']",
      "content": "[exact words or technique used]",
      "context": "[what gate this was in, what triggered it]",
      "effectiveness": [0-10],
      "sellerResponse": "[how the buyer responded]",
      "coachingNote": "[why this worked or how to use it]"
    }
  ],
  "summary": "[2-3 sentence summary of the call]",
  "strengthAreas": ["area1", "area2"],
  "improvementAreas": ["area1", "area2"],
  "recommendedForTraining": true/false
}`;

/**
 * Analyze a call and extract training insights
 */
export async function analyzeCallForTraining(
  callId: string,
  transcript: string,
  mode: CallMode
): Promise<CallAnalysisResult> {
  try {
    const analysisPrompt = mode === 'acquisition'
      ? ACQUISITION_ANALYSIS_PROMPT
      : DISPOSITION_ANALYSIS_PROMPT;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: analysisPrompt,
        },
        {
          role: 'user',
          content: `Analyze this ${mode} call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);

    // Add callId and mode to each insight
    const insights: CallInsight[] = (parsed.insights || []).map((insight: any) => ({
      callId,
      mode,
      insightType: insight.insightType,
      category: insight.category,
      content: insight.content,
      context: insight.context,
      effectiveness: insight.effectiveness,
      sellerResponse: insight.sellerResponse,
      coachingNote: insight.coachingNote,
    }));

    return {
      callId,
      mode,
      overallScore: parsed.overallScore || 0,
      insights,
      summary: parsed.summary || '',
      strengthAreas: parsed.strengthAreas || [],
      improvementAreas: parsed.improvementAreas || [],
      recommendedForTraining: parsed.recommendedForTraining || false,
    };
  } catch (error) {
    logger.error('Error analyzing call for training', { error, callId, mode });
    throw error;
  }
}

/**
 * Save analysis results to the database
 */
export async function saveCallAnalysis(analysis: CallAnalysisResult): Promise<void> {
  if (!supabaseAdmin) {
    logger.warn('Supabase admin client not available');
    return;
  }

  try {
    // Save each insight to the training_insights table
    for (const insight of analysis.insights) {
      await (supabaseAdmin as any)
        .from('training_insights')
        .insert({
          call_id: insight.callId,
          mode: insight.mode,
          insight_type: insight.insightType,
          category: insight.category,
          content: insight.content,
          context: insight.context,
          effectiveness: insight.effectiveness,
          seller_response: insight.sellerResponse,
          coaching_note: insight.coachingNote,
          created_at: new Date().toISOString(),
        });
    }

    // Update the call record with analysis metadata
    await (supabaseAdmin as any)
      .from('calls')
      .update({
        training_analysis: {
          overallScore: analysis.overallScore,
          summary: analysis.summary,
          strengthAreas: analysis.strengthAreas,
          improvementAreas: analysis.improvementAreas,
          recommendedForTraining: analysis.recommendedForTraining,
          analyzedAt: new Date().toISOString(),
        },
      })
      .eq('id', analysis.callId);

    logger.info('Call analysis saved', {
      callId: analysis.callId,
      insightCount: analysis.insights.length
    });
  } catch (error) {
    logger.error('Error saving call analysis', { error, callId: analysis.callId });
    throw error;
  }
}

/**
 * Get high-performing insights by category for training injection
 */
export async function getTopInsightsByCategory(
  mode: CallMode,
  category: string,
  limit: number = 5
): Promise<CallInsight[]> {
  if (!supabaseAdmin) {
    return [];
  }

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('training_insights')
      .select('*')
      .eq('mode', mode)
      .eq('category', category)
      .gte('effectiveness', 7) // Only high-effectiveness insights
      .order('effectiveness', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching insights', { error, mode, category });
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      callId: row.call_id,
      mode: row.mode,
      insightType: row.insight_type,
      category: row.category,
      content: row.content,
      context: row.context,
      effectiveness: row.effectiveness,
      sellerResponse: row.seller_response,
      coachingNote: row.coaching_note,
    }));
  } catch (error) {
    logger.error('Error fetching insights', { error });
    return [];
  }
}

/**
 * Get all unique insight categories for a mode
 */
export async function getInsightCategories(mode: CallMode): Promise<string[]> {
  if (!supabaseAdmin) {
    return [];
  }

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('training_insights')
      .select('category')
      .eq('mode', mode);

    if (error) {
      logger.error('Error fetching categories', { error });
      return [];
    }

    // Get unique categories
    const categories = [...new Set((data || []).map((row: any) => row.category))];
    return categories as string[];
  } catch (error) {
    logger.error('Error fetching categories', { error });
    return [];
  }
}

/**
 * Generate training prompt injection from top insights
 */
export async function generateInsightInjection(
  mode: CallMode,
  categories?: string[]
): Promise<string> {
  const allCategories = categories || await getInsightCategories(mode);

  const sections: string[] = [];

  for (const category of allCategories) {
    const insights = await getTopInsightsByCategory(mode, category, 3);
    if (insights.length === 0) continue;

    const categoryTitle = category.replace(/_/g, ' ').toUpperCase();
    const insightTexts = insights.map((i, idx) =>
      `  ${idx + 1}. "${i.content}"\n     Context: ${i.context}\n     Why it works: ${i.coachingNote}`
    ).join('\n');

    sections.push(`## ${categoryTitle} TECHNIQUES:\n${insightTexts}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `
=== PROVEN TECHNIQUES FROM SUCCESSFUL CALLS ===
Use these high-performing techniques when appropriate:

${sections.join('\n\n')}

=== END PROVEN TECHNIQUES ===
`;
}

/**
 * Analyze multiple calls in batch
 */
export async function analyzeCallsBatch(
  callIds: string[],
  mode: CallMode
): Promise<CallAnalysisResult[]> {
  if (!supabaseAdmin) {
    return [];
  }

  const results: CallAnalysisResult[] = [];

  for (const callId of callIds) {
    try {
      // Fetch call transcript
      const { data: call, error } = await (supabaseAdmin as any)
        .from('calls')
        .select('transcript')
        .eq('id', callId)
        .single();

      if (error || !call?.transcript) {
        logger.warn('Could not fetch call transcript', { callId, error });
        continue;
      }

      // Analyze the call
      const analysis = await analyzeCallForTraining(callId, call.transcript, mode);

      // Save the analysis
      await saveCallAnalysis(analysis);

      results.push(analysis);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Error analyzing call in batch', { error, callId });
    }
  }

  return results;
}

/**
 * Get calls that haven't been analyzed yet
 */
export async function getUnanalyzedCalls(
  mode: CallMode,
  limit: number = 10,
  minScore?: number
): Promise<Array<{ id: string; transcript: string; goat_score: number }>> {
  if (!supabaseAdmin) {
    return [];
  }

  try {
    let query = (supabaseAdmin as any)
      .from('calls')
      .select('id, transcript, goat_score')
      .eq('persona_mode', mode)
      .is('training_analysis', null) // Not yet analyzed
      .not('transcript', 'is', null) // Has transcript
      .order('goat_score', { ascending: false })
      .limit(limit);

    if (minScore) {
      query = query.gte('goat_score', minScore);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching unanalyzed calls', { error });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching unanalyzed calls', { error });
    return [];
  }
}

/**
 * Get analysis statistics
 */
export async function getAnalysisStats(mode?: CallMode): Promise<{
  totalAnalyzed: number;
  totalInsights: number;
  avgScore: number;
  topCategories: Array<{ category: string; count: number }>;
}> {
  if (!supabaseAdmin) {
    return { totalAnalyzed: 0, totalInsights: 0, avgScore: 0, topCategories: [] };
  }

  try {
    // Get total analyzed calls
    let callsQuery = (supabaseAdmin as any)
      .from('calls')
      .select('goat_score', { count: 'exact' })
      .not('training_analysis', 'is', null);

    if (mode) {
      callsQuery = callsQuery.eq('persona_mode', mode);
    }

    const { count: totalAnalyzed, data: scores } = await callsQuery;

    // Get total insights
    let insightsQuery = (supabaseAdmin as any)
      .from('training_insights')
      .select('category', { count: 'exact' });

    if (mode) {
      insightsQuery = insightsQuery.eq('mode', mode);
    }

    const { count: totalInsights, data: insightData } = await insightsQuery;

    // Calculate average score
    const avgScore = scores && scores.length > 0
      ? scores.reduce((sum: number, s: any) => sum + (s.goat_score || 0), 0) / scores.length
      : 0;

    // Get top categories
    const categoryCounts: Record<string, number> = {};
    for (const row of insightData || []) {
      const cat = row.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAnalyzed: totalAnalyzed || 0,
      totalInsights: totalInsights || 0,
      avgScore,
      topCategories,
    };
  } catch (error) {
    logger.error('Error getting analysis stats', { error });
    return { totalAnalyzed: 0, totalInsights: 0, avgScore: 0, topCategories: [] };
  }
}
