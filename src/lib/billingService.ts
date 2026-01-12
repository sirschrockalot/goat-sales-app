/**
 * Billing Service - Centralized Billing & Usage Monitor
 * 
 * Tracks costs across Vapi, ElevenLabs, OpenAI, Supabase, and Vercel
 * Prevents "bill shock" by monitoring credit balances and live usage
 * Ensures total infrastructure costs stay within $1,000/mo budget
 * 
 * Features:
 * - Fetch balances from ElevenLabs, Twilio, and Vapi
 * - Calculate burn rate from call logs
 * - Budget guardrails (warning at $50, kill switch at $150)
 * - Supabase usage monitoring (DB size, egress, function invocations)
 * - Vercel usage monitoring (Fluid Compute, bandwidth)
 * - Profit margin calculation (revenue - costs)
 */

// supabaseAdmin imported dynamically
import logger from './logger';

// Apex Stack Rates (per minute)
const RATES = {
  vapi: 0.05, // $0.05/min
  gpt4o: 0.10, // $0.10/min (estimated)
  elevenlabs: 0.18, // $0.18/min
};

// Budget Thresholds
const BUDGET_THRESHOLDS = {
  warning: 50, // $50/day - send notification
  killSwitch: 150, // $150/day - deactivate assistants
  monthlyInfrastructure: 1000, // $1,000/mo total infrastructure budget
};

// Supabase Pro Plan Rates
const SUPABASE_RATES = {
  dbSize: 0.125, // $0.125 per GB
  egress: 0.09, // $0.09 per GB
  funcInvocations: 0.000002, // $0.000002 per invocation (2M free, then $2 per 1M)
};

// Vercel Budget Cap
const VERCEL_BUDGET_CAP = 150; // $150/month

export interface CreditStatus {
  provider: 'elevenlabs' | 'twilio';
  balance: number;
  limit?: number;
  percentageRemaining: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface BurnRateData {
  totalCost: number;
  vapiCost: number;
  gpt4oCost: number;
  elevenlabsCost: number;
  totalMinutes: number;
  callCount: number;
  hourlyRate: number; // Projected hourly spend
  dailyProjection: number; // Projected daily spend
}

export interface DailySpend {
  date: string;
  total: number;
  vapi: number;
  gpt4o: number;
  elevenlabs: number;
  callCount: number;
}

export interface TopSpender {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  callCount: number;
  averageCostPerCall: number;
  scenario?: string; // Battle-test scenario name
}

export interface SupabaseUsage {
  dbSizeGB: number;
  egressGB: number;
  funcInvocations: number;
  dbCost: number;
  egressCost: number;
  funcCost: number;
  totalCost: number;
  period: string; // Current billing period
}

export interface VercelUsage {
  fluidComputeHours: number;
  bandwidthGB: number;
  fluidComputeCost: number;
  bandwidthCost: number;
  totalCost: number;
  withinBudget: boolean;
  budgetCap: number;
  period: string;
}

export interface InfrastructureCosts {
  api: {
    vapi: number;
    gpt4o: number;
    elevenlabs: number;
    total: number;
  };
  infrastructure: {
    supabase: number;
    vercel: number;
    total: number;
  };
  grandTotal: number;
}

export interface ProfitMargin {
  projectedRevenue: number; // From signed $82,700 contracts
  totalCosts: number;
  profitMargin: number; // Revenue - Costs
  profitMarginPercentage: number; // (Revenue - Costs) / Revenue * 100
  contractsSigned: number;
}

/**
 * Fetch ElevenLabs subscription and character usage
 */
export async function getElevenLabsBalance(): Promise<CreditStatus> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (!apiKey) {
    return {
      provider: 'elevenlabs',
      balance: 0,
      percentageRemaining: 0,
      status: 'critical',
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json();
    const characterCount = data.character_count || 0;
    const characterLimit = data.character_limit || 0;

    const percentageRemaining = characterLimit > 0
      ? ((characterLimit - characterCount) / characterLimit) * 100
      : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentageRemaining < 10) {
      status = 'critical';
    } else if (percentageRemaining < 30) {
      status = 'warning';
    }

    return {
      provider: 'elevenlabs',
      balance: characterLimit - characterCount,
      limit: characterLimit,
      percentageRemaining,
      status,
    };
  } catch (error) {
    logger.error('Error fetching ElevenLabs balance', { error });
    return {
      provider: 'elevenlabs',
      balance: 0,
      percentageRemaining: 0,
      status: 'critical',
    };
  }
}

/**
 * Fetch Twilio account balance
 */
export async function getTwilioBalance(): Promise<CreditStatus> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return {
      provider: 'twilio',
      balance: 0,
      percentageRemaining: 0,
      status: 'critical',
    };
  }

  try {
    // Twilio API endpoint for account balance
    const response = await fetch(
      `https://${accountSid}:${authToken}@api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data = await response.json();
    const balance = parseFloat(data.balance || '0');
    const currency = data.currency || 'USD';

    // Twilio doesn't provide a limit, so we'll use a default threshold
    // Consider balance < $10 as critical, < $50 as warning
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let percentageRemaining = 100;

    if (balance < 10) {
      status = 'critical';
      percentageRemaining = (balance / 10) * 100;
    } else if (balance < 50) {
      status = 'warning';
      percentageRemaining = (balance / 50) * 100;
    }

    return {
      provider: 'twilio',
      balance,
      percentageRemaining,
      status,
    };
  } catch (error) {
    logger.error('Error fetching Twilio balance', { error });
    return {
      provider: 'twilio',
      balance: 0,
      percentageRemaining: 0,
      status: 'critical',
    };
  }
}

/**
 * Fetch Vapi usage data for current billing period
 */
export async function getVapiUsage(): Promise<{
  totalMinutes: number;
  totalCost: number;
  callCount: number;
}> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;

  if (!vapiSecretKey) {
    return { totalMinutes: 0, totalCost: 0, callCount: 0 };
  }

  try {
    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const response = await fetch(
      `https://api.vapi.ai/usage?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vapiSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If usage endpoint doesn't exist, estimate from call logs
      logger.warn('Vapi usage API not available, estimating from call logs');
      return await estimateVapiUsageFromLogs(startOfMonth, endOfMonth);
    }

    const data = await response.json();
    const totalMinutes = data.totalMinutes || 0;
    const totalCost = totalMinutes * RATES.vapi;

    return {
      totalMinutes,
      totalCost,
      callCount: data.callCount || 0,
    };
  } catch (error) {
    logger.error('Error fetching Vapi usage', { error });
    // Fallback to estimating from call logs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return await estimateVapiUsageFromLogs(startOfMonth, endOfMonth);
  }
}

/**
 * Estimate Vapi usage from call logs (fallback)
 */
async function estimateVapiUsageFromLogs(startDate: Date, endDate: Date) {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return { totalMinutes: 0, totalCost: 0, callCount: 0 };
  }

  const { data: calls, error } = await supabaseAdmin
    .from('calls')
    .select('id, created_at, ended_at, metadata')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('call_status', 'ended');

  if (error || !calls) {
    return { totalMinutes: 0, totalCost: 0, callCount: 0 };
  }

  let totalMinutes = 0;

  const callsData = (calls as any[]) || [];
  for (const call of callsData) {
    if (call.ended_at && call.created_at) {
      const start = new Date(call.created_at);
      const end = new Date(call.ended_at);
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      totalMinutes += durationMinutes;
    } else {
      // Estimate 5 minutes per call if no end time
      totalMinutes += 5;
    }
  }

  return {
    totalMinutes,
    totalCost: totalMinutes * RATES.vapi,
    callCount: calls.length,
  };
}

/**
 * Calculate burn rate from last 24 hours of call logs
 */
export async function calculateBurnRate(): Promise<BurnRateData> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return {
      totalCost: 0,
      vapiCost: 0,
      gpt4oCost: 0,
      elevenlabsCost: 0,
      totalMinutes: 0,
      callCount: 0,
      hourlyRate: 0,
      dailyProjection: 0,
    };
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Fetch calls from last 24 hours
  const { data: calls, error } = await supabaseAdmin
    .from('calls')
    .select('id, created_at, ended_at, metadata, user_id')
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .eq('call_status', 'ended');

  if (error || !calls || calls.length === 0) {
    return {
      totalCost: 0,
      vapiCost: 0,
      gpt4oCost: 0,
      elevenlabsCost: 0,
      totalMinutes: 0,
      callCount: 0,
      hourlyRate: 0,
      dailyProjection: 0,
    };
  }

  let totalMinutes = 0;
  let vapiMinutes = 0;
  let gpt4oMinutes = 0;
  let elevenlabsMinutes = 0;

  const callsData = (calls as any[]) || [];
  for (const call of callsData) {
    let durationMinutes = 5; // Default estimate

    if (call.ended_at && call.created_at) {
      const start = new Date(call.created_at);
      const end = new Date(call.ended_at);
      const durationMs = end.getTime() - start.getTime();
      durationMinutes = durationMs / (1000 * 60);
    }

    totalMinutes += durationMinutes;
    vapiMinutes += durationMinutes; // Vapi handles the call
    gpt4oMinutes += durationMinutes; // GPT-4o is used for AI responses
    elevenlabsMinutes += durationMinutes; // ElevenLabs is used for voice
  }

  const vapiCost = vapiMinutes * RATES.vapi;
  const gpt4oCost = gpt4oMinutes * RATES.gpt4o;
  const elevenlabsCost = elevenlabsMinutes * RATES.elevenlabs;
  const totalCost = vapiCost + gpt4oCost + elevenlabsCost;

  // Calculate hourly rate (last 24 hours / 24)
  const hourlyRate = totalCost / 24;
  const dailyProjection = hourlyRate * 24;

  return {
    totalCost,
    vapiCost,
    gpt4oCost,
    elevenlabsCost,
    totalMinutes,
    callCount: calls.length,
    hourlyRate,
    dailyProjection,
  };
}

/**
 * Get daily spend for the current day
 */
export async function getDailySpend(): Promise<DailySpend> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return {
      date: new Date().toISOString().split('T')[0],
      total: 0,
      vapi: 0,
      gpt4o: 0,
      elevenlabs: 0,
      callCount: 0,
    };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data: calls, error } = await supabaseAdmin
    .from('calls')
    .select('id, created_at, ended_at, metadata')
    .gte('created_at', startOfDay.toISOString())
    .eq('call_status', 'ended');

  if (error || !calls || calls.length === 0) {
    return {
      date: now.toISOString().split('T')[0],
      total: 0,
      vapi: 0,
      gpt4o: 0,
      elevenlabs: 0,
      callCount: 0,
    };
  }

  let vapiMinutes = 0;
  let gpt4oMinutes = 0;
  let elevenlabsMinutes = 0;

  const callsData = (calls as any[]) || [];
  for (const call of callsData) {
    let durationMinutes = 5; // Default estimate

    if (call.ended_at && call.created_at) {
      const start = new Date(call.created_at);
      const end = new Date(call.ended_at);
      const durationMs = end.getTime() - start.getTime();
      durationMinutes = durationMs / (1000 * 60);
    }

    vapiMinutes += durationMinutes;
    gpt4oMinutes += durationMinutes;
    elevenlabsMinutes += durationMinutes;
  }

  const vapi = vapiMinutes * RATES.vapi;
  const gpt4o = gpt4oMinutes * RATES.gpt4o;
  const elevenlabs = elevenlabsMinutes * RATES.elevenlabs;
  const total = vapi + gpt4o + elevenlabs;

  return {
    date: now.toISOString().split('T')[0],
    total,
    vapi,
    gpt4o,
    elevenlabs,
    callCount: calls.length,
  };
}

/**
 * Get top spenders (users or scenarios)
 */
export async function getTopSpenders(limit: number = 10): Promise<TopSpender[]> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return [];
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Fetch calls with user profiles
  const { data: calls, error } = await supabaseAdmin
    .from('calls')
    .select(`
      id,
      user_id,
      created_at,
      ended_at,
      metadata,
      profiles:user_id (
        id,
        name,
        email
      )
    `)
    .gte('created_at', startOfDay.toISOString())
    .eq('call_status', 'ended');

  if (error || !calls || calls.length === 0) {
    return [];
  }

  // Group by user_id
  const userSpend: Map<string, { minutes: number; callCount: number; user: any; scenario?: string }> = new Map();

  const callsData = (calls as any[]) || [];
  for (const call of callsData) {
    const userId = call.user_id;
    let durationMinutes = 5; // Default estimate

    if (call.ended_at && call.created_at) {
      const start = new Date(call.created_at);
      const end = new Date(call.ended_at);
      const durationMs = end.getTime() - start.getTime();
      durationMinutes = durationMs / (1000 * 60);
    }

    const cost = durationMinutes * (RATES.vapi + RATES.gpt4o + RATES.elevenlabs);
    const scenario = (call.metadata as any)?.scenario || (call.metadata as any)?.battleTestScenario;

    if (!userSpend.has(userId)) {
      userSpend.set(userId, {
        minutes: 0,
        callCount: 0,
        user: (call as any).profiles,
        scenario,
      });
    }

    const userData = userSpend.get(userId)!;
    userData.minutes += durationMinutes;
    userData.callCount += 1;
  }

  // Convert to array and calculate costs
  const topSpenders: TopSpender[] = Array.from(userSpend.entries()).map(([userId, data]) => {
    const totalCost = data.minutes * (RATES.vapi + RATES.gpt4o + RATES.elevenlabs);
    const averageCostPerCall = data.callCount > 0 ? totalCost / data.callCount : 0;

    return {
      userId,
      userName: data.user?.name || 'Unknown',
      userEmail: data.user?.email || 'unknown@example.com',
      totalCost,
      callCount: data.callCount,
      averageCostPerCall,
      scenario: data.scenario,
    };
  });

  // Sort by total cost descending
  topSpenders.sort((a, b) => b.totalCost - a.totalCost);

  return topSpenders.slice(0, limit);
}

/**
 * Check budget thresholds and trigger warnings/kill switch
 */
export async function checkBudgetThresholds(): Promise<{
  dailySpend: number;
  threshold: 'none' | 'warning' | 'killSwitch';
  actionTaken: boolean;
  message: string;
}> {
  const dailySpend = await getDailySpend();
  const total = dailySpend.total;

  if (total >= BUDGET_THRESHOLDS.killSwitch) {
    // Kill switch: Deactivate all assistants
    const deactivated = await deactivateAllAssistants();
    return {
      dailySpend: total,
      threshold: 'killSwitch',
      actionTaken: deactivated,
      message: `Daily spend exceeded $${BUDGET_THRESHOLDS.killSwitch}. All assistants deactivated.`,
    };
  } else if (total >= BUDGET_THRESHOLDS.warning) {
    // Warning: Send notification
    const notified = await sendBudgetWarning(total);
    return {
      dailySpend: total,
      threshold: 'warning',
      actionTaken: notified,
      message: `Daily spend exceeded $${BUDGET_THRESHOLDS.warning}. Warning notification sent.`,
    };
  }

  return {
    dailySpend: total,
    threshold: 'none',
    actionTaken: false,
    message: `Daily spend: $${total.toFixed(2)} (within limits)`,
  };
}

/**
 * Send budget warning notification (Slack or Email)
 */
async function sendBudgetWarning(dailySpend: number): Promise<boolean> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const emailApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  const message = `⚠️ Budget Warning: Daily spend has reached $${dailySpend.toFixed(2)} (threshold: $${BUDGET_THRESHOLDS.warning})`;

  // Try Slack first
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message,
              },
            },
          ],
        }),
      });
      return true;
    } catch (error) {
      logger.error('Error sending Slack notification', { error });
    }
  }

  // Fallback to email
  if (emailApiKey && emailFrom && adminEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: adminEmail,
          subject: 'Budget Warning - Sales Goat App',
          html: `<p>${message}</p>`,
        }),
      });
      return true;
    } catch (error) {
      logger.error('Error sending email notification', { error });
    }
  }

  logger.warn('No notification method configured - budget warning not sent');
  return false;
}

/**
 * Deactivate all Vapi assistants (kill switch)
 */
async function deactivateAllAssistants(): Promise<boolean> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;

  if (!vapiSecretKey) {
    logger.error('VAPI_SECRET_KEY not configured - cannot deactivate assistants');
    return false;
  }

  try {
    // Fetch all assistants
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assistants: ${response.statusText}`);
    }

    const assistants = await response.json();

    // Deactivate each assistant
    let deactivatedCount = 0;
    for (const assistant of assistants) {
      try {
        await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vapiSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'inactive',
          }),
        });
        deactivatedCount++;
      } catch (error) {
        logger.error('Error deactivating assistant', { assistantId: assistant.id, error });
      }
    }

    logger.warn(`Deactivated ${deactivatedCount} assistants due to budget kill switch`);
    return deactivatedCount > 0;
  } catch (error) {
    logger.error('Error deactivating assistants', { error });
    return false;
  }
}

/**
 * Fetch Supabase usage and calculate monthly cost
 */
export async function getSupabaseUsage(): Promise<SupabaseUsage> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN; // Management API token

  if (!supabaseUrl || !supabaseAccessToken) {
    return {
      dbSizeGB: 0,
      egressGB: 0,
      funcInvocations: 0,
      dbCost: 0,
      egressCost: 0,
      funcCost: 0,
      totalCost: 0,
      period: 'unknown',
    };
  }

  try {
    // Extract project ref from URL
    const url = new URL(supabaseUrl);
    const projectRef = url.hostname.split('.')[0];

    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/usage?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract usage metrics (adjust based on actual API response structure)
    const dbSizeGB = (data.db_size || data.database_size || 0) / (1024 * 1024 * 1024); // Convert bytes to GB
    const egressGB = (data.egress || data.bandwidth || 0) / (1024 * 1024 * 1024); // Convert bytes to GB
    const funcInvocations = data.func_invocations || data.function_invocations || 0;

    // Calculate costs
    const dbCost = dbSizeGB * SUPABASE_RATES.dbSize;
    const egressCost = egressGB * SUPABASE_RATES.egress;
    // Function invocations: First 2M are free, then $2 per 1M
    const funcInvocationsOverFree = Math.max(0, funcInvocations - 2000000);
    const funcCost = (funcInvocationsOverFree / 1000000) * 2;

    const totalCost = dbCost + egressCost + funcCost;

    return {
      dbSizeGB,
      egressGB,
      funcInvocations,
      dbCost,
      egressCost,
      funcCost,
      totalCost,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
  } catch (error) {
    logger.error('Error fetching Supabase usage', { error });
    return {
      dbSizeGB: 0,
      egressGB: 0,
      funcInvocations: 0,
      dbCost: 0,
      egressCost: 0,
      funcCost: 0,
      totalCost: 0,
      period: 'error',
    };
  }
}

/**
 * Fetch Vercel usage and calculate monthly cost
 */
export async function getVercelUsage(): Promise<VercelUsage> {
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID; // Optional, for team accounts

  if (!vercelToken) {
    return {
      fluidComputeHours: 0,
      bandwidthGB: 0,
      fluidComputeCost: 0,
      bandwidthCost: 0,
      totalCost: 0,
      withinBudget: true,
      budgetCap: VERCEL_BUDGET_CAP,
      period: 'unknown',
    };
  }

  try {
    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Vercel billing API endpoint
    const url = vercelTeamId
      ? `https://api.vercel.com/v1/billing/usage?teamId=${vercelTeamId}&start=${startOfMonth.getTime()}&end=${endOfMonth.getTime()}`
      : `https://api.vercel.com/v1/billing/usage?start=${startOfMonth.getTime()}&end=${endOfMonth.getTime()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If API fails, estimate from webhook traffic
      logger.warn('Vercel API not available, estimating from call logs');
      return await estimateVercelUsageFromLogs();
    }

    const data = await response.json();
    
    // Extract usage metrics
    // Vercel API returns usage in different formats, adjust based on actual response
    const fluidComputeHours = data.fluidCompute?.hours || data.compute?.hours || data.usage?.compute || 0;
    const bandwidthGB = (data.bandwidth?.bytes || data.egress?.bytes || data.usage?.bandwidth || 0) / (1024 * 1024 * 1024);

    // Vercel pricing (approximate - adjust based on your plan)
    // Fluid Compute: ~$0.18 per GB-hour
    // Bandwidth: ~$0.10 per GB (first 100GB free on Pro)
    const fluidComputeCost = fluidComputeHours * 0.18;
    const bandwidthOverFree = Math.max(0, bandwidthGB - 100); // First 100GB free
    const bandwidthCost = bandwidthOverFree * 0.10;

    const totalCost = fluidComputeCost + bandwidthCost;
    const withinBudget = totalCost <= VERCEL_BUDGET_CAP;

    // Check for bandwidth anomaly (spike detection)
    await checkVercelBandwidthAnomaly(bandwidthGB, data);

    return {
      fluidComputeHours,
      bandwidthGB,
      fluidComputeCost,
      bandwidthCost,
      totalCost,
      withinBudget,
      budgetCap: VERCEL_BUDGET_CAP,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
  } catch (error) {
    logger.error('Error fetching Vercel usage', { error });
    // Fallback to estimation
    return await estimateVercelUsageFromLogs();
  }
}

/**
 * Estimate Vercel usage from call logs (fallback)
 */
async function estimateVercelUsageFromLogs(): Promise<VercelUsage> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return {
      fluidComputeHours: 0,
      bandwidthGB: 0,
      fluidComputeCost: 0,
      bandwidthCost: 0,
      totalCost: 0,
      withinBudget: true,
      budgetCap: VERCEL_BUDGET_CAP,
      period: 'unknown',
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Estimate from webhook calls (each call generates ~1MB of bandwidth)
  const { data: calls, error } = await supabaseAdmin
    .from('calls')
    .select('id, created_at, transcript')
    .gte('created_at', startOfMonth.toISOString());

  if (error || !calls) {
    return {
      fluidComputeHours: 0,
      bandwidthGB: 0,
      fluidComputeCost: 0,
      bandwidthCost: 0,
      totalCost: 0,
      withinBudget: true,
      budgetCap: VERCEL_BUDGET_CAP,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
  }

  // Estimate: Each webhook call uses ~1MB bandwidth, ~0.1 compute seconds
  const estimatedBandwidthGB = (calls.length * 1) / 1024; // 1MB per call
  const estimatedComputeHours = (calls.length * 0.1) / 3600; // 0.1 seconds per call

  const fluidComputeCost = estimatedComputeHours * 0.18;
  const bandwidthOverFree = Math.max(0, estimatedBandwidthGB - 100);
  const bandwidthCost = bandwidthOverFree * 0.10;
  const totalCost = fluidComputeCost + bandwidthCost;

  return {
    fluidComputeHours: estimatedComputeHours,
    bandwidthGB: estimatedBandwidthGB,
    fluidComputeCost,
    bandwidthCost,
    totalCost,
    withinBudget: totalCost <= VERCEL_BUDGET_CAP,
    budgetCap: VERCEL_BUDGET_CAP,
    period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  };
}

/**
 * Check for Vercel bandwidth anomaly (potential bot attack)
 */
async function checkVercelBandwidthAnomaly(currentBandwidthGB: number, usageData: any): Promise<void> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return;
  }

  // Get average bandwidth for last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Estimate from call logs
  const { data: recentCalls } = await supabaseAdmin
    .from('calls')
    .select('id, created_at')
    .gte('created_at', sevenDaysAgo.toISOString());

  if (!recentCalls || recentCalls.length === 0) {
    return;
  }

  // Calculate average daily bandwidth
  const avgDailyCalls = recentCalls.length / 7;
  const avgDailyBandwidthGB = (avgDailyCalls * 1) / 1024; // 1MB per call

  // Check if current bandwidth is 3x higher than average (anomaly threshold)
  const anomalyThreshold = avgDailyBandwidthGB * 3;
  const currentDailyBandwidth = currentBandwidthGB / (now.getDate()); // Approximate daily from monthly

  if (currentDailyBandwidth > anomalyThreshold && currentDailyBandwidth > 10) {
    // Send urgent Slack alert
    await sendVercelAnomalyAlert(currentBandwidthGB, avgDailyBandwidthGB, currentDailyBandwidth);
  }
}

/**
 * Send urgent Slack alert for Vercel bandwidth anomaly
 */
async function sendVercelAnomalyAlert(
  currentBandwidthGB: number,
  avgDailyBandwidthGB: number,
  currentDailyBandwidth: number
): Promise<boolean> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhook) {
    logger.warn('SLACK_WEBHOOK_URL not configured - cannot send Vercel anomaly alert');
    return false;
  }

  const message = `🚨 URGENT ALERT: Vercel Egress Anomaly Detected\n\n` +
    `Current Daily Bandwidth: ${currentDailyBandwidth.toFixed(2)} GB\n` +
    `Average Daily Bandwidth: ${avgDailyBandwidthGB.toFixed(2)} GB\n` +
    `Monthly Total: ${currentBandwidthGB.toFixed(2)} GB\n\n` +
    `⚠️ Potential bot attack or unexpected traffic spike.\n` +
    `Verify training volume and check for suspicious activity.`;

  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
        ],
      }),
    });
    return true;
  } catch (error) {
    logger.error('Error sending Vercel anomaly alert', { error });
    return false;
  }
}

/**
 * Calculate total infrastructure costs
 */
export async function getInfrastructureCosts(): Promise<InfrastructureCosts> {
  const [dailySpend, supabaseUsage, vercelUsage] = await Promise.all([
    getDailySpend(),
    getSupabaseUsage(),
    getVercelUsage(),
  ]);

  // Project monthly API costs from daily spend
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const projectedMonthlyApiCost = (dailySpend.total / currentDay) * daysInMonth;

  return {
    api: {
      vapi: (dailySpend.vapi / currentDay) * daysInMonth,
      gpt4o: (dailySpend.gpt4o / currentDay) * daysInMonth,
      elevenlabs: (dailySpend.elevenlabs / currentDay) * daysInMonth,
      total: projectedMonthlyApiCost,
    },
    infrastructure: {
      supabase: supabaseUsage.totalCost,
      vercel: vercelUsage.totalCost,
      total: supabaseUsage.totalCost + vercelUsage.totalCost,
    },
    grandTotal: projectedMonthlyApiCost + supabaseUsage.totalCost + vercelUsage.totalCost,
  };
}

/**
 * Calculate profit margin from signed contracts
 */
export async function getProfitMargin(): Promise<ProfitMargin> {
  const { supabaseAdmin } = await import('./supabase');
  if (!supabaseAdmin) {
    return {
      projectedRevenue: 0,
      totalCosts: 0,
      profitMargin: 0,
      profitMarginPercentage: 0,
      contractsSigned: 0,
    };
  }

  // Get signed contracts (contract_signed = true)
  const { data: signedContracts, error } = await supabaseAdmin
    .from('calls')
    .select('id, final_offer_price, suggested_buy_price')
    .eq('contract_signed', true)
    .not('final_offer_price', 'is', null);

  if (error || !signedContracts) {
    return {
      projectedRevenue: 0,
      totalCosts: 0,
      profitMargin: 0,
      profitMarginPercentage: 0,
      contractsSigned: 0,
    };
  }

  // Calculate revenue from signed $82,700 contracts
  // For now, we'll use the standard $82,700 price point
  const signedContractsData = (signedContracts as any[]) || [];
  const contractsSigned = signedContractsData.length;
  const projectedRevenue = contractsSigned * 82700;

  // Get total infrastructure costs
  const infrastructureCosts = await getInfrastructureCosts();
  const totalCosts = infrastructureCosts.grandTotal;

  const profitMargin = projectedRevenue - totalCosts;
  const profitMarginPercentage = projectedRevenue > 0
    ? (profitMargin / projectedRevenue) * 100
    : 0;

  return {
    projectedRevenue,
    totalCosts,
    profitMargin,
    profitMarginPercentage,
    contractsSigned,
  };
}
