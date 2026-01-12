/**
 * Daily Auditor Script
 * Aggregates billing and performance data into a single summary
 * Generates AI-powered "Coach's Note" for daily training insights
 */

import { supabaseAdmin } from '../src/lib/supabase';
import { getEnvironmentConfig, assertSandboxMode } from '../config/environments';
import logger from '../src/lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface DailySummary {
  date: string;
  billing: {
    totalCost: number;
    openaiCost: number;
    vapiCost: number;
    elevenlabsCost: number;
    transactionCount: number;
  };
  performance: {
    totalBattles: number;
    averageScore: number;
    breakthroughs: number; // Score > 95
    highestScore: number;
    highestScoreBattleId: string | null;
    highestScoreTranscript: string | null;
  };
  coachNote: string;
  formattedSummary: string;
}

/**
 * Sum costs from billing_logs for the previous 24 hours
 */
async function getBillingSummary(): Promise<DailySummary['billing']> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Fetch all billing logs from last 24 hours with env='sandbox'
  const { data: logs, error } = await supabaseAdmin
    .from('billing_logs')
    .select('provider, cost')
    .eq('env', 'sandbox')
    .gte('created_at', twentyFourHoursAgo.toISOString());

  if (error) {
    logger.error('Error fetching billing logs', { error });
    throw error;
  }

  const billing = {
    totalCost: 0,
    openaiCost: 0,
    vapiCost: 0,
    elevenlabsCost: 0,
    transactionCount: logs?.length || 0,
  };

  (logs || []).forEach((log) => {
    const cost = log.cost || 0;
    billing.totalCost += cost;

    if (log.provider === 'openai') {
      billing.openaiCost += cost;
    } else if (log.provider === 'vapi') {
      billing.vapiCost += cost;
    } else if (log.provider === 'elevenlabs') {
      billing.elevenlabsCost += cost;
    }
  });

  return billing;
}

/**
 * Get performance metrics from sandbox_battles
 */
async function getPerformanceMetrics(): Promise<DailySummary['performance']> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Fetch all battles from last 24 hours
  const { data: battles, error } = await supabaseAdmin
    .from('sandbox_battles')
    .select('id, referee_score, transcript')
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('referee_score', { ascending: false });

  if (error) {
    logger.error('Error fetching battles', { error });
    throw error;
  }

  const battlesList = battles || [];
  const totalBattles = battlesList.length;

  // Calculate average score
  const averageScore =
    totalBattles > 0
      ? battlesList.reduce((sum, b) => sum + (b.referee_score || 0), 0) / totalBattles
      : 0;

  // Count breakthroughs (Score > 95)
  const breakthroughs = battlesList.filter((b) => (b.referee_score || 0) > 95).length;

  // Get highest scoring battle
  const highestScoreBattle = battlesList[0] || null;
  const highestScore = highestScoreBattle?.referee_score || 0;
  const highestScoreBattleId = highestScoreBattle?.id || null;
  const highestScoreTranscript = highestScoreBattle?.transcript || null;

  return {
    totalBattles,
    averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
    breakthroughs,
    highestScore,
    highestScoreBattleId,
    highestScoreTranscript,
  };
}

/**
 * Count scenario_breakthroughs (Score > 95)
 * Note: scenario_breakthroughs table stores top 3 winning paths from scenario injection
 * We'll also check sandbox_battles for any battles with score > 95
 */
async function getScenarioBreakthroughs(): Promise<number> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Count from scenario_breakthroughs table
  const { count: scenarioCount, error: scenarioError } = await supabaseAdmin
    .from('scenario_breakthroughs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo.toISOString());

  if (scenarioError) {
    logger.warn('Error counting scenario_breakthroughs', { error: scenarioError });
  }

  // Also count from sandbox_battles with score > 95
  const { count: battleCount, error: battleError } = await supabaseAdmin
    .from('sandbox_battles')
    .select('*', { count: 'exact', head: true })
    .gte('referee_score', 95)
    .gte('created_at', twentyFourHoursAgo.toISOString());

  if (battleError) {
    logger.warn('Error counting breakthrough battles', { error: battleError });
  }

  // Return total count (scenario breakthroughs + high-score battles)
  return (scenarioCount || 0) + (battleCount || 0);
}

/**
 * Generate AI Coach's Note using GPT-4o-Mini
 */
async function generateCoachNote(summary: Omit<DailySummary, 'coachNote' | 'formattedSummary'>): Promise<string> {
  const prompt = `You are an Elite Sales Coach analyzing daily training data for an AI Closer.

DAILY TRAINING SUMMARY:
- Total Battles: ${summary.performance.totalBattles}
- Average Score: ${summary.performance.averageScore}/100
- Breakthroughs (Score > 95): ${summary.performance.breakthroughs}
- Highest Score: ${summary.performance.highestScore}/100
- Total Cost: $${summary.billing.totalCost.toFixed(2)}
- OpenAI Cost: $${summary.billing.openaiCost.toFixed(2)}
- Vapi Cost: $${summary.billing.vapiCost.toFixed(2)}
- ElevenLabs Cost: $${summary.billing.elevenlabsCost.toFixed(2)}

${summary.performance.highestScoreTranscript
  ? `HIGHEST SCORING BATTLE TRANSCRIPT (Score: ${summary.performance.highestScore}):\n${summary.performance.highestScoreTranscript.substring(0, 2000)}`
  : 'No high-scoring battles in this period.'
}

Write a single, concise "Coach's Note" (1 sentence) that:
1. Highlights the key strength or weakness observed
2. Provides actionable insight
3. Uses natural, coaching language (not robotic)
4. Is specific and memorable

Example: "The AI is getting much stronger at defending Clause 17, but we're seeing some robotic drift in the intro sequence."

Return ONLY the coach's note, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an Elite Sales Coach. Write concise, actionable insights. Return only the coach\'s note, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const coachNote = completion.choices[0]?.message?.content?.trim() || 'No insights available.';
    return coachNote;
  } catch (error) {
    logger.error('Error generating coach note', { error });
    return 'Unable to generate coach note at this time.';
  }
}

/**
 * Format summary into "Goat-tier" format
 */
function formatSummary(summary: DailySummary): string {
  const date = new Date(summary.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatted = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐐 DAILY TRAINING AUDIT - ${date.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 BILLING SUMMARY
   Total Spent: $${summary.billing.totalCost.toFixed(2)}
   ├─ OpenAI: $${summary.billing.openaiCost.toFixed(2)}
   ├─ Vapi: $${summary.billing.vapiCost.toFixed(2)}
   └─ ElevenLabs: $${summary.billing.elevenlabsCost.toFixed(2)}
   Transactions: ${summary.billing.transactionCount}

📊 PERFORMANCE METRICS
   Total Battles: ${summary.performance.totalBattles}
   Average Score: ${summary.performance.averageScore}/100
   Breakthroughs (Score > 95): ${summary.performance.breakthroughs}
   Highest Score: ${summary.performance.highestScore}/100
   ${summary.performance.highestScoreBattleId
     ? `Battle ID: ${summary.performance.highestScoreBattleId}`
     : 'No battles recorded'}

💡 COACH'S NOTE
   "${summary.coachNote}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return formatted;
}

/**
 * Generate daily audit summary
 */
export async function generateDailyAudit(): Promise<DailySummary> {
  const config = getEnvironmentConfig();
  assertSandboxMode(config);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  logger.info('Starting daily audit...');

  // Get billing summary
  const billing = await getBillingSummary();

  // Get performance metrics
  const performance = await getPerformanceMetrics();

  // Get scenario breakthroughs count
  const scenarioBreakthroughs = await getScenarioBreakthroughs();
  performance.breakthroughs = scenarioBreakthroughs; // Update with scenario breakthroughs

  // Generate coach note
  const coachNote = await generateCoachNote({
    date: new Date().toISOString(),
    billing,
    performance,
  });

  // Create summary object
  const summary: DailySummary = {
    date: new Date().toISOString(),
    billing,
    performance,
    coachNote,
    formattedSummary: '', // Will be set below
  };

  // Format summary
  summary.formattedSummary = formatSummary(summary);

  logger.info('Daily audit complete', {
    totalCost: billing.totalCost,
    totalBattles: performance.totalBattles,
    breakthroughs: performance.breakthroughs,
  });

  return summary;
}

/**
 * Send summary to Slack
 */
export async function sendSlackSummary(summary: DailySummary): Promise<void> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) {
    logger.warn('SLACK_WEBHOOK_URL not configured - skipping Slack notification');
    return;
  }

  const date = new Date(summary.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const message = {
    text: `🐐 Daily Training Audit - ${date}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🐐 Daily Training Audit - ${date}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Battles:*\n${summary.performance.totalBattles}`,
          },
          {
            type: 'mrkdwn',
            text: `*Average Score:*\n${summary.performance.averageScore}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*Breakthroughs:*\n${summary.performance.breakthroughs}`,
          },
          {
            type: 'mrkdwn',
            text: `*Highest Score:*\n${summary.performance.highestScore}/100`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Cost:*\n$${summary.billing.totalCost.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*OpenAI:*\n$${summary.billing.openaiCost.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Vapi:*\n$${summary.billing.vapiCost.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*ElevenLabs:*\n$${summary.billing.elevenlabsCost.toFixed(2)}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💡 Coach's Note:*\n"${summary.coachNote}"`,
        },
      },
      ...(summary.performance.highestScoreBattleId
        ? [
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Highest Score Battle',
                  },
                  url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/training-monitor?battleId=${summary.performance.highestScoreBattleId}`,
                  style: 'primary',
                },
              ],
            },
          ]
        : []),
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
      logger.error('Error sending Slack summary', { error: errorText, status: response.status });
    } else {
      logger.info('Slack summary sent successfully');
    }
  } catch (error) {
    logger.error('Error sending Slack summary', { error });
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const summary = await generateDailyAudit();

    // Print formatted summary to console
    console.log(summary.formattedSummary);

    // Send to Slack
    await sendSlackSummary(summary);

    // Also log the raw summary
    logger.info('Daily audit summary', {
      billing: summary.billing,
      performance: summary.performance,
      coachNote: summary.coachNote,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Error in daily audit', { error });
    console.error('❌ Error generating daily audit:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateDailyAudit, sendSlackSummary };
