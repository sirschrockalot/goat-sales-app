/**
 * Tactical Scout Service
 * Monitors autonomous training logs for breakthrough sessions (score >= 95)
 * Sends alerts and extracts "Defining Moments" for promotion
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface Breakthrough {
  battleId: string;
  refereeScore: number;
  humanityGrade: number | null;
  personaName: string;
  personaType: string;
  winningRebuttal: string | null;
  transcript: string;
  definingMoment: string | null;
  tacticalSnippet: string | null;
  detectedAt: string;
}

/**
 * Extract the "Defining Moment" using GPT-4o
 */
async function extractDefiningMoment(
  transcript: string,
  personaName: string,
  winningRebuttal: string | null
): Promise<{
  definingMoment: string;
  tacticalSnippet: string;
}> {
  const extractionPrompt = `You are a Tactical Analyst. Analyze this sales call transcript and identify the "Defining Moment" - the specific 2-3 sentences where the AI Closer handled the most difficult objection.

TRANSCRIPT:
${transcript}

PERSONA DEFEATED: ${personaName}

${winningRebuttal ? `WINNING REBUTTAL: ${winningRebuttal}` : ''}

Your task:
1. Identify the MOST DIFFICULT objection in this call
2. Find the EXACT 2-3 sentences where the Closer handled it
3. Explain WHY this worked (what made it effective)
4. Format as a "Tactical Snippet" ready for production prompt injection

Return JSON:
{
  "definingMoment": "<the exact 2-3 sentences from the transcript>",
  "whyItWorked": "<explanation of why this was effective>",
  "tacticalSnippet": "<formatted snippet ready for production prompt, including context>"
}

The tactical snippet should be formatted like:
"When the seller objects with [OBJECTION TYPE], respond with: '[DEFINING MOMENT TEXT]' This works because [WHY IT WORKED]."`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Tactical Analyst. Return valid JSON only.',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from GPT-4o');
    }

    const analysis = JSON.parse(response) as {
      definingMoment: string;
      whyItWorked: string;
      tacticalSnippet: string;
    };

    return {
      definingMoment: analysis.definingMoment,
      tacticalSnippet: analysis.tacticalSnippet,
    };
  } catch (error) {
    logger.error('Error extracting defining moment', { error });
    // Fallback: use winning rebuttal if available
    return {
      definingMoment: winningRebuttal || 'Moment not identified',
      tacticalSnippet: winningRebuttal
        ? `When facing ${personaName}, use: "${winningRebuttal.substring(0, 200)}..."`
        : 'Tactical snippet not available',
    };
  }
}

/**
 * Send Slack alert for breakthrough
 */
async function sendSlackAlert(breakthrough: Breakthrough): Promise<void> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) {
    logger.warn('SLACK_WEBHOOK_URL not configured - skipping Slack alert');
    return;
  }

  const message = {
    text: '🎯 APEX BREAKTHROUGH DETECTED',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎯 APEX BREAKTHROUGH DETECTED',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Referee Score:*\n${breakthrough.refereeScore}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*Humanity Grade:*\n${breakthrough.humanityGrade || 'N/A'}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*Persona Defeated:*\n${breakthrough.personaName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Persona Type:*\n${breakthrough.personaType}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Winning Rebuttal:*\n\`\`\`${breakthrough.winningRebuttal || 'Not identified'}\`\`\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Defining Moment:*\n${breakthrough.definingMoment || 'Not extracted'}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Tactical Snippet:*\n\`\`\`${breakthrough.tacticalSnippet || 'Not available'}\`\`\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Review in Dashboard',
            },
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/training-monitor?battleId=${breakthrough.battleId}`,
            style: 'primary',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Error sending Slack alert', { error: errorText, status: response.status });
    } else {
      logger.info('Slack alert sent successfully', { battleId: breakthrough.battleId });
    }
  } catch (error) {
    logger.error('Error sending Slack alert', { error });
  }
}

/**
 * Process a breakthrough detection
 */
async function processBreakthrough(battle: any): Promise<void> {
  logger.info('Processing breakthrough', { battleId: battle.id, score: battle.referee_score });

  // Extract defining moment
  const { definingMoment, tacticalSnippet } = await extractDefiningMoment(
    battle.transcript || '',
    battle.sandbox_personas?.name || 'Unknown',
    battle.winning_rebuttal
  );

  // Update battle with breakthrough data
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('sandbox_battles')
      .update({
        status: 'pending_review',
        defining_moment: definingMoment,
        tactical_snippet: tacticalSnippet,
        breakthrough_detected_at: new Date().toISOString(),
      })
      .eq('id', battle.id);
  }

  // Create breakthrough record
  const breakthrough: Breakthrough = {
    battleId: battle.id,
    refereeScore: battle.referee_score,
    humanityGrade: battle.humanity_grade,
    personaName: battle.sandbox_personas?.name || 'Unknown',
    personaType: battle.sandbox_personas?.persona_type || 'unknown',
    winningRebuttal: battle.winning_rebuttal,
    transcript: battle.transcript || '',
    definingMoment,
    tacticalSnippet,
    detectedAt: new Date().toISOString(),
  };

  // Send Slack alert
  await sendSlackAlert(breakthrough);

  logger.info('Breakthrough processed', {
    battleId: battle.id,
    definingMoment: definingMoment.substring(0, 100),
  });
}

/**
 * Initialize Tactical Scout with Supabase Realtime subscription
 */
export function initializeTacticalScout(): () => void {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for Tactical Scout');
    return () => {}; // Return no-op cleanup function
  }

  logger.info('Initializing Tactical Scout - monitoring for score >= 95');

  // Create a client-side Supabase client for Realtime (Realtime requires client-side client)
  // Use dynamic import to avoid issues in server-side contexts
  let supabaseClient: any;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Missing Supabase credentials for Realtime');
      return () => {};
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    logger.error('Error creating Supabase client for Realtime', { error });
    return () => {};
  }

  // Subscribe to new battles with score >= 95 or humanity_grade >= 95
  // Note: Supabase Realtime filters don't support OR, so we'll check both in the handler
  const channel = supabaseClient
    .channel('tactical-scout-breakthroughs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sandbox_battles',
        // Filter for referee_score >= 95 (we'll also check humanity_grade in handler)
        filter: 'referee_score=gte.95',
      },
      async (payload: any) => {
        const score = payload.new.referee_score || 0;
        const humanityGrade = payload.new.humanity_grade || 0;
        
        // Check if this is a breakthrough (score >= 95 OR humanity_grade >= 95)
        if (score < 95 && humanityGrade < 95) {
          return; // Not a breakthrough
        }

        // Skip if already processed
        if (payload.new.status === 'pending_review' || payload.new.status === 'promoted') {
          return;
        }

        logger.info('Breakthrough detected via Realtime', {
          battleId: payload.new.id,
          refereeScore: score,
          humanityGrade,
        });

        // Fetch full battle data with persona info
        const { data: battle, error } = await supabaseAdmin
          .from('sandbox_battles')
          .select(`
            *,
            sandbox_personas!inner(
              name,
              persona_type
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error || !battle) {
          logger.error('Error fetching breakthrough battle', { error, battleId: payload.new.id });
          return;
        }

        // Process breakthrough
        await processBreakthrough(battle);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sandbox_battles',
        filter: 'referee_score=gte.95',
      },
      async (payload: any) => {
        const score = payload.new.referee_score || 0;
        const humanityGrade = payload.new.humanity_grade || 0;
        
        // Check if this is a breakthrough (score >= 95 OR humanity_grade >= 95)
        if (score < 95 && humanityGrade < 95) {
          return; // Not a breakthrough
        }

        // Skip if already processed
        if (payload.new.status === 'pending_review' || payload.new.status === 'promoted') {
          return;
        }

        logger.info('Breakthrough detected via UPDATE', {
          battleId: payload.new.id,
          refereeScore: score,
          humanityGrade,
        });

        // Fetch full battle data
        const { data: battle, error } = await supabaseAdmin
          .from('sandbox_battles')
          .select(`
            *,
            sandbox_personas!inner(
              name,
              persona_type
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error || !battle) {
          logger.error('Error fetching breakthrough battle', { error, battleId: payload.new.id });
          return;
        }

        // Process breakthrough
        await processBreakthrough(battle);
      }
    )
    .subscribe();

  logger.info('Tactical Scout initialized - monitoring for breakthroughs');

  // Return cleanup function
  return () => {
    supabaseClient.removeChannel(channel);
    logger.info('Tactical Scout stopped');
  };
}

/**
 * Check existing battles for breakthroughs (one-time scan)
 */
export async function scanExistingBreakthroughs(): Promise<number> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Scanning existing battles for breakthroughs');

  // Find battles with score >= 95 OR humanity_grade >= 95 that haven't been processed
  const { data: battles, error } = await supabaseAdmin
    .from('sandbox_battles')
    .select(`
      *,
      sandbox_personas!inner(
        name,
        persona_type
      )
    `)
    .or('referee_score.gte.95,humanity_grade.gte.95')
    .or('status.is.null,status.neq.pending_review')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('Error scanning for breakthroughs', { error });
    return 0;
  }

  let processed = 0;
  for (const battle of battles || []) {
    try {
      await processBreakthrough(battle);
      processed++;
    } catch (error) {
      logger.error('Error processing breakthrough', { battleId: battle.id, error });
    }
  }

  logger.info('Breakthrough scan complete', { found: battles?.length || 0, processed });

  return processed;
}
