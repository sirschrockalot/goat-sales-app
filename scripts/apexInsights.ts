/**
 * Apex Insights Audit System
 * High-fidelity audit to ensure AI maintains "Apex Closer" realism and stays within profit margins
 * 
 * Features:
 * - Humanity Score evaluation (GPT-4o)
 * - Robotic bottleneck detection
 * - Daily P&L calculation
 * - Slack reporting
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../src/lib/supabase';
import logger from '../src/lib/logger';
import { getDailySpend, getInfrastructureCosts } from '../src/lib/billingService';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..');
dotenv.config({ path: path.join(envPath, '.env.development') });
dotenv.config({ path: path.join(envPath, '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VAPI_SECRET_KEY = process.env.VAPI_SECRET_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface VapiCall {
  id: string;
  status: string;
  transcript?: string;
  metadata?: any;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  cost?: number;
}

interface HumanityScore {
  score: number;
  steamrollEvents: number;
  scriptRigidity: number;
  turnTakingLatency: number;
  feedback: string;
}

interface RoboticBottleneck {
  type: 'steamroll' | 'latency_spike';
  callId: string;
  timestamp: string;
  details: string;
}

interface DailyInsights {
  totalCalls: number;
  humanityScore: number;
  steamrollEvents: number;
  latencySpikes: number;
  totalCost: number;
  potentialRevenue: number;
  dealsSecured: number;
  roi: number;
}

/**
 * Fetch last 24 hours of calls from Vapi API
 */
async function fetchVapiCalls(): Promise<VapiCall[]> {
  if (!VAPI_SECRET_KEY) {
    logger.error('VAPI_SECRET_KEY not configured');
    return [];
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch calls from Vapi API
    const response = await fetch(`https://api.vapi.ai/call?startedAt=${twentyFourHoursAgo}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Error fetching Vapi calls', { error: errorText, status: response.status });
      return [];
    }

    const data = await response.json();
    return data.calls || data || [];
  } catch (error) {
    logger.error('Error fetching Vapi calls', { error });
    return [];
  }
}

/**
 * Fetch call data from Supabase (local logs)
 */
async function fetchLocalCallLogs(): Promise<any[]> {
  if (!supabaseAdmin) {
    logger.error('supabaseAdmin not initialized');
    return [];
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching local call logs', { error });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching local call logs', { error });
    return [];
  }
}

/**
 * Evaluate Humanity Score using GPT-4o
 */
async function evaluateHumanityScore(
  transcript: string,
  metadata: any
): Promise<HumanityScore> {
  try {
    const prompt = `You are an Elite Sales Coach evaluating an AI Sales Agent's "Vocal Soul" and human-like behavior.

**TRANSCRIPT:**
${transcript.substring(0, 8000)}${transcript.length > 8000 ? '...\n[TRUNCATED]' : ''}

**METADATA:**
${JSON.stringify(metadata, null, 2)}

**EVALUATION CRITERIA:**

1. **Steamrolling (0-100)**: Did the AI interrupt the user or continue speaking when the user was trying to respond?
   - 100 = Perfect turn-taking, never interrupted
   - 50 = Occasional interruptions
   - 0 = Constant steamrolling, user couldn't get a word in

2. **Script Rigidity (0-100)**: Did the AI sound like it was reading from a script or speaking naturally?
   - 100 = Natural, conversational, adaptive
   - 50 = Somewhat scripted but with variation
   - 0 = Robotic, reading verbatim, no adaptation

3. **Turn-Taking Latency (0-100)**: Was the AI's response time natural (under 800ms after user stopped)?
   - 100 = Natural pauses, appropriate timing
   - 50 = Some delays but acceptable
   - 0 = Long delays (>1.2s) or immediate responses (no processing time)

**YOUR TASK:**
Analyze the transcript and metadata. Count:
- Number of "Steamroll Events" (where AI likely interrupted)
- Script Rigidity score (0-100)
- Average Turn-Taking Latency score (0-100)

Return a JSON object with:
{
  "score": <overall humanity score 0-100>,
  "steamrollEvents": <count of interruptions>,
  "scriptRigidity": <score 0-100>,
  "turnTakingLatency": <score 0-100>,
  "feedback": "<specific feedback on what made it human or robotic>"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an Elite Sales Coach. Analyze AI sales calls for human-like behavior. Return valid JSON only.',
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

    const result = JSON.parse(response) as HumanityScore;
    return result;
  } catch (error) {
    logger.error('Error evaluating humanity score', { error });
    // Return default score on error
    return {
      score: 50,
      steamrollEvents: 0,
      scriptRigidity: 50,
      turnTakingLatency: 50,
      feedback: 'Evaluation error - default score assigned',
    };
  }
}

/**
 * Detect Robotic Bottlenecks
 */
function detectRoboticBottlenecks(
  calls: VapiCall[],
  localLogs: any[]
): RoboticBottleneck[] {
  const bottlenecks: RoboticBottleneck[] = [];

  // Analyze each call
  for (const call of calls) {
    const localLog = localLogs.find((log) => log.vapi_call_id === call.id);
    
    // Check for Steamroll Events
    // Look for metadata indicating endOfUtteranceTimeout was triggered while user was speaking
    const metadata = call.metadata || localLog?.metadata || {};
    if (metadata.endOfUtteranceTimeoutTriggered && metadata.userWasSpeaking) {
      bottlenecks.push({
        type: 'steamroll',
        callId: call.id,
        timestamp: call.startedAt || localLog?.created_at || new Date().toISOString(),
        details: 'AI triggered endOfUtteranceTimeout while user was still speaking',
      });
    }

    // Check for Latency Spikes (TTFA > 1.2 seconds)
    // TTFA = Time to First Audio (latency between user stops speaking and AI starts)
    if (metadata.ttfa && metadata.ttfa > 1200) {
      bottlenecks.push({
        type: 'latency_spike',
        callId: call.id,
        timestamp: call.startedAt || localLog?.created_at || new Date().toISOString(),
        details: `Time to First Audio: ${metadata.ttfa}ms (threshold: 1200ms)`,
      });
    }

    // Check transcript for rapid-fire responses (potential steamrolling)
    const transcript = call.transcript || localLog?.transcript || '';
    if (transcript) {
      const transcriptLower = transcript.toLowerCase();
      // Look for patterns where AI responds immediately after user question
      // Pattern: User asks question, AI responds without pause indicators
      const rapidResponsePattern = /(user|seller|caller):.*\?.*(assistant|ai|agent):/gi;
      const matches = transcriptLower.match(rapidResponsePattern);
      if (matches && matches.length > 3) {
        bottlenecks.push({
          type: 'steamroll',
          callId: call.id,
          timestamp: call.startedAt || localLog?.created_at || new Date().toISOString(),
          details: `Detected ${matches.length} rapid-fire responses (potential steamrolling)`,
        });
      }
    }
  }

  return bottlenecks;
}

/**
 * Calculate Daily P&L
 */
async function calculateDailyPandL(
  calls: VapiCall[],
  localLogs: any[]
): Promise<{ totalCost: number; potentialRevenue: number; dealsSecured: number }> {
  // Get total cost from billing service
  const dailySpend = await getDailySpend();
  const infrastructureCosts = await getInfrastructureCosts();
  // Infrastructure costs are monthly, so we need to calculate daily portion
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const dailyInfrastructureCost = infrastructureCosts.infrastructure.total / daysInMonth;
  const totalCost = dailySpend.total + dailyInfrastructureCost;

  // Count deals secured (calls that reached Clause 17 with $82,700 offer)
  let dealsSecured = 0;
  let potentialRevenue = 0;

  for (const localLog of localLogs) {
    const transcript = localLog.transcript?.toLowerCase() || '';
    const metadata = localLog.metadata || {};

    // Check if call reached Clause 17 (The Memorandum)
    const reachedClause17 = 
      transcript.includes('clause 17') ||
      transcript.includes('memorandum') ||
      transcript.includes('reservation') ||
      metadata.reached_clause_17 === true;

    // Check if $82,700 offer was presented
    const presentedOffer = 
      transcript.includes('82,700') ||
      transcript.includes('82700') ||
      transcript.includes('eighty-two thousand') ||
      transcript.includes('eighty two thousand') ||
      metadata.offer_presented === true ||
      localLog.suggested_buy_price === 82700 ||
      localLog.final_offer_price === 82700;

    if (reachedClause17 && presentedOffer) {
      dealsSecured++;
      potentialRevenue += 82700;
    }
  }

  return {
    totalCost,
    potentialRevenue,
    dealsSecured,
  };
}

/**
 * Generate and send Slack summary
 */
async function sendSlackSummary(insights: DailyInsights): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_WEBHOOK_URL not configured - skipping Slack notification');
    return;
  }

  try {
    const humanityEmoji = insights.humanityScore >= 90 ? '🔥' : insights.humanityScore >= 75 ? '✅' : '⚠️';
    const roiEmoji = insights.roi > 0 ? '💰' : '📉';
    
    const message = {
      text: '🐐 Apex Insights Daily Audit Report',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🐐 Apex Insights Daily Audit Report',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Humanity Score:*\n${humanityEmoji} ${insights.humanityScore}/100`,
            },
            {
              type: 'mrkdwn',
              text: `*Total Calls:*\n${insights.totalCalls}`,
            },
            {
              type: 'mrkdwn',
              text: `*Steamroll Events:*\n${insights.steamrollEvents}`,
            },
            {
              type: 'mrkdwn',
              text: `*Latency Spikes:*\n${insights.latencySpikes}`,
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Cost:*\n$${insights.totalCost.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Deals Secured:*\n${insights.dealsSecured} at $82,700`,
            },
            {
              type: 'mrkdwn',
              text: `*Potential Revenue:*\n$${insights.potentialRevenue.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*ROI:*\n${roiEmoji} ${insights.roi > 0 ? '+' : ''}$${insights.roi.toLocaleString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Summary:*\nToday's ROI: $${insights.totalCost.toFixed(2)} Spent | ${insights.dealsSecured} Deals at $82,700 Secured | Humanity Score: ${insights.humanityScore}/100`,
          },
        },
      ],
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Error sending Slack notification', { error: errorText, status: response.status });
    } else {
      logger.info('Slack notification sent successfully');
    }
  } catch (error) {
    logger.error('Error sending Slack summary', { error });
  }
}

/**
 * Main audit function
 */
async function runApexInsights(): Promise<void> {
  logger.info('Starting Apex Insights Audit...');

  try {
    // Fetch call data
    logger.info('Fetching call data from Vapi and Supabase...');
    const [vapiCalls, localLogs] = await Promise.all([
      fetchVapiCalls(),
      fetchLocalCallLogs(),
    ]);

    logger.info(`Found ${vapiCalls.length} Vapi calls and ${localLogs.length} local call logs`);

    if (vapiCalls.length === 0 && localLogs.length === 0) {
      logger.warn('No calls found in the last 24 hours');
      return;
    }

    // Evaluate Humanity Scores for each call
    logger.info('Evaluating Humanity Scores...');
    const humanityScores: HumanityScore[] = [];
    
    // Process calls in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < Math.min(vapiCalls.length, 20); i += batchSize) {
      const batch = vapiCalls.slice(i, i + batchSize);
      const batchScores = await Promise.all(
        batch.map(async (call) => {
          if (!call.transcript) {
            // Try to get transcript from local logs
            const localLog = localLogs.find((log) => log.vapi_call_id === call.id);
            if (localLog?.transcript) {
              return await evaluateHumanityScore(localLog.transcript, {
                ...call.metadata,
                ...localLog.metadata,
              });
            }
            return null;
          }
          return await evaluateHumanityScore(call.transcript, call.metadata || {});
        })
      );
      humanityScores.push(...batchScores.filter((score): score is HumanityScore => score !== null));
      
      // Small delay between batches
      if (i + batchSize < vapiCalls.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Calculate average humanity score
    const avgHumanityScore = humanityScores.length > 0
      ? Math.round(humanityScores.reduce((sum, score) => sum + score.score, 0) / humanityScores.length)
      : 0;

    // Detect robotic bottlenecks
    logger.info('Detecting robotic bottlenecks...');
    const bottlenecks = detectRoboticBottlenecks(vapiCalls, localLogs);
    const steamrollEvents = bottlenecks.filter((b) => b.type === 'steamroll').length;
    const latencySpikes = bottlenecks.filter((b) => b.type === 'latency_spike').length;

    // Calculate Daily P&L
    logger.info('Calculating Daily P&L...');
    const { totalCost, potentialRevenue, dealsSecured } = await calculateDailyPandL(vapiCalls, localLogs);
    const roi = potentialRevenue - totalCost;

    // Compile insights
    const insights: DailyInsights = {
      totalCalls: Math.max(vapiCalls.length, localLogs.length),
      humanityScore: avgHumanityScore,
      steamrollEvents,
      latencySpikes,
      totalCost,
      potentialRevenue,
      dealsSecured,
      roi,
    };

    // Log insights
    logger.info('Apex Insights Audit Complete', insights);

    // Send Slack summary
    await sendSlackSummary(insights);

    // Print summary to console
    console.log('\n📊 APEX INSIGHTS DAILY AUDIT REPORT');
    console.log('=====================================');
    console.log(`Total Calls: ${insights.totalCalls}`);
    console.log(`Humanity Score: ${insights.humanityScore}/100`);
    console.log(`Steamroll Events: ${insights.steamrollEvents}`);
    console.log(`Latency Spikes: ${insights.latencySpikes}`);
    console.log(`\n💰 FINANCIAL SUMMARY`);
    console.log(`Total Cost: $${insights.totalCost.toFixed(2)}`);
    console.log(`Deals Secured: ${insights.dealsSecured} at $82,700`);
    console.log(`Potential Revenue: $${insights.potentialRevenue.toLocaleString()}`);
    console.log(`ROI: $${insights.roi.toLocaleString()}`);
    console.log(`\n📈 Summary: Today's ROI: $${insights.totalCost.toFixed(2)} Spent | ${insights.dealsSecured} Deals at $82,700 Secured | Humanity Score: ${insights.humanityScore}/100`);
    console.log('=====================================\n');
  } catch (error) {
    logger.error('Error running Apex Insights audit', { error });
    throw error;
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('apexInsights.ts') ||
                     process.argv[1]?.endsWith('apexInsights.js');

if (isMainModule) {
  runApexInsights()
    .then(() => {
      logger.info('Apex Insights audit completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Apex Insights audit failed', { error });
      process.exit(1);
    });
}

export { runApexInsights, evaluateHumanityScore, detectRoboticBottlenecks, calculateDailyPandL };
