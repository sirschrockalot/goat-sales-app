/**
 * Daily Manager Recap Analytics
 * Queries Supabase for team performance metrics over the last 24 hours
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface RepPerformance {
  userId: string;
  name: string;
  email: string;
  totalCalls: number;
  averageGoatScore: number;
  averageScriptAdherence: number;
  goatModePercentage: number; // Percentage of calls with score >= 85
}

export interface DailyRecapData {
  date: string;
  teamAverageGoatScore: number;
  teamAverageYesterday: number | null;
  teamAverageChange: number; // Percentage change
  scriptAdherenceLeader: RepPerformance | null;
  scriptHole: {
    gate: number;
    gateName: string;
    averageAdherence: number;
  } | null;
  topRebuttal: {
    text: string;
    callId: string;
    goatScore: number;
    repName: string;
  } | null;
  repPerformance: RepPerformance[];
  executiveSummary: string;
  actionableAdvice: string;
}

const GATE_NAMES = [
  'The Intro (Approval/Denial)',
  'Fact Find (The Why)',
  'The Pitch (Inside/Outside)',
  'The Offer (Virtual Withdraw)',
  'The Close (Agreement)',
];

/**
 * Get daily recap data for the last 24 hours
 */
export async function getDailyRecap(): Promise<DailyRecapData> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get today's calls
  const { data: todayCalls, error: todayError } = await supabaseAdmin
    .from('calls')
    .select('*')
    .gte('created_at', todayStart.toISOString())
    .eq('call_status', 'ended')
    .not('goat_score', 'is', null);

  if (todayError) {
    console.error('Error fetching today\'s calls:', todayError);
    throw new Error('Failed to fetch today\'s calls');
  }

  // Get yesterday's calls for comparison
  const yesterdayStart = new Date(yesterday);
  const yesterdayEnd = new Date(todayStart);
  
  const { data: yesterdayCalls, error: yesterdayError } = await supabaseAdmin
    .from('calls')
    .select('goat_score')
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', yesterdayEnd.toISOString())
    .eq('call_status', 'ended')
    .not('goat_score', 'is', null);

  if (yesterdayError) {
    console.error('Error fetching yesterday\'s calls:', yesterdayError);
  }

  // Calculate team averages
  const todayScores = (todayCalls || []).map((c) => c.goat_score || 0);
  const teamAverageGoatScore = todayScores.length > 0
    ? Math.round(todayScores.reduce((sum, score) => sum + score, 0) / todayScores.length)
    : 0;

  const yesterdayScores = (yesterdayCalls || []).map((c) => c.goat_score || 0);
  const teamAverageYesterday = yesterdayScores.length > 0
    ? Math.round(yesterdayScores.reduce((sum, score) => sum + score, 0) / yesterdayScores.length)
    : null;

  const teamAverageChange = teamAverageYesterday
    ? Math.round(((teamAverageGoatScore - teamAverageYesterday) / teamAverageYesterday) * 100)
    : 0;

  // Calculate rep performance
  const repMap = new Map<string, {
    userId: string;
    name: string;
    email: string;
    calls: any[];
    scores: number[];
    scriptAdherences: number[];
  }>();

  // Fetch profiles separately for better performance
  const userIds = [...new Set((todayCalls || []).map((c) => c.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { name: p.name || 'Unknown Rep', email: p.email || '' }])
  );

  (todayCalls || []).forEach((call) => {
    const userId = call.user_id;
    const profile = profileMap.get(userId) || { name: 'Unknown Rep', email: '' };

    if (!repMap.has(userId)) {
      repMap.set(userId, {
        userId,
        name: profile.name,
        email: profile.email,
        calls: [],
        scores: [],
        scriptAdherences: [],
      });
    }

    const rep = repMap.get(userId)!;
    rep.calls.push(call);
    rep.scores.push(call.goat_score || 0);

    // Extract script adherence score
    if (call.script_adherence && typeof call.script_adherence === 'object') {
      const adherence = call.script_adherence as any;
      if (adherence.overallFaithfulness !== undefined) {
        rep.scriptAdherences.push(adherence.overallFaithfulness);
      }
    }
  });

  const repPerformance: RepPerformance[] = Array.from(repMap.values()).map((rep) => {
    const averageGoatScore = rep.scores.length > 0
      ? Math.round(rep.scores.reduce((sum, s) => sum + s, 0) / rep.scores.length)
      : 0;
    
    const averageScriptAdherence = rep.scriptAdherences.length > 0
      ? Math.round(rep.scriptAdherences.reduce((sum, s) => sum + s, 0) / rep.scriptAdherences.length)
      : 0;

    const goatModeCalls = rep.scores.filter((s) => s >= 85).length;
    const goatModePercentage = rep.scores.length > 0
      ? Math.round((goatModeCalls / rep.scores.length) * 100)
      : 0;

    return {
      userId: rep.userId,
      name: rep.name,
      email: rep.email,
      totalCalls: rep.calls.length,
      averageGoatScore,
      averageScriptAdherence,
      goatModePercentage,
    };
  });

  // Find script adherence leader
  const scriptAdherenceLeader = repPerformance.length > 0
    ? repPerformance.reduce((leader, rep) => 
        rep.averageScriptAdherence > leader.averageScriptAdherence ? rep : leader
      )
    : null;

  // Find "The Script Hole" (weakest gate)
  const gateAdherences: { gate: number; total: number; count: number }[] = Array(8)
    .fill(0)
    .map((_, i) => ({ gate: i + 1, total: 0, count: 0 }));

  (todayCalls || []).forEach((call) => {
    if (call.script_adherence && typeof call.script_adherence === 'object') {
      const adherence = call.script_adherence as any;
      if (adherence.gates && Array.isArray(adherence.gates)) {
        adherence.gates.forEach((gate: any) => {
          if (gate.gate >= 1 && gate.gate <= 8) {
            gateAdherences[gate.gate - 1].total += gate.faithfulnessScore || 0;
            gateAdherences[gate.gate - 1].count += 1;
          }
        });
      }
    }
  });

  const gateAverages = gateAdherences.map((g) => ({
    gate: g.gate,
    gateName: GATE_NAMES[g.gate - 1],
    averageAdherence: g.count > 0 ? Math.round(g.total / g.count) : 0,
  }));

  const scriptHole = gateAverages.length > 0
    ? gateAverages.reduce((weakest, gate) =>
        gate.averageAdherence < weakest.averageAdherence ? gate : weakest
      )
    : null;

  // Find top rebuttal (highest scoring rebuttal_of_the_day)
  const topRebuttalCall = (todayCalls || [])
    .filter((c) => c.rebuttal_of_the_day && c.rebuttal_of_the_day !== 'None')
    .sort((a, b) => (b.goat_score || 0) - (a.goat_score || 0))[0];

  const topRebuttal = topRebuttalCall
    ? {
        text: topRebuttalCall.rebuttal_of_the_day || '',
        callId: topRebuttalCall.id,
        goatScore: topRebuttalCall.goat_score || 0,
        repName: profileMap.get(topRebuttalCall.user_id)?.name || 'Unknown Rep',
      }
    : null;

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    teamAverageGoatScore,
    teamAverageChange,
    repPerformance.length,
    scriptHole
  );

  // Generate actionable advice
  const actionableAdvice = generateActionableAdvice(scriptHole);

  return {
    date: todayStart.toISOString().split('T')[0],
    teamAverageGoatScore,
    teamAverageYesterday,
    teamAverageChange,
    scriptAdherenceLeader,
    scriptHole,
    topRebuttal,
    repPerformance: repPerformance.sort((a, b) => b.averageGoatScore - a.averageGoatScore),
    executiveSummary,
    actionableAdvice,
  };
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  teamAverage: number,
  change: number,
  repCount: number,
  scriptHole: { gate: number; gateName: string; averageAdherence: number } | null
): string {
  const changeText = change > 0
    ? `up ${change}% from yesterday`
    : change < 0
    ? `down ${Math.abs(change)}% from yesterday`
    : 'flat from yesterday';

  if (teamAverage >= 85) {
    return `Your team is in Goat Mode today! Average score of ${teamAverage}/100 (${changeText}). ${repCount} rep${repCount !== 1 ? 's' : ''} crushed it.${scriptHole ? ` Watch out for ${scriptHole.gateName}—it's the weakest link at ${scriptHole.averageAdherence}% adherence.` : ''}`;
  } else if (teamAverage >= 70) {
    return `Solid day for the team with an average score of ${teamAverage}/100 (${changeText}).${scriptHole ? ` The ${scriptHole.gateName} needs work—only ${scriptHole.averageAdherence}% adherence today.` : ''} Time to tighten up the script.`;
  } else {
    return `Tough day. Team average is ${teamAverage}/100 (${changeText}).${scriptHole ? ` The ${scriptHole.gateName} is dragging everyone down at ${scriptHole.averageAdherence}% adherence.` : ''} Focus on fundamentals tomorrow.`;
  }
}

/**
 * Generate actionable advice based on weakest gate
 */
function generateActionableAdvice(
  scriptHole: { gate: number; gateName: string; averageAdherence: number } | null
): string {
  if (!scriptHole) {
    return 'Keep the momentum going. Review the master script daily to maintain consistency.';
  }

  const gate = scriptHole.gate;
  const adherence = scriptHole.averageAdherence;

  if (gate === 1) {
    return `Team is struggling with the Intro. Only ${adherence}% adherence. Re-train the "Approval/Denial" frame tomorrow. Reps need to set the energy and get the "Fair enough?" agreement before moving forward.`;
  } else if (gate === 2) {
    return `The team is rushing past Gate 2 (Fact Find). Only ${adherence}% adherence. They're not uncovering "The Why" properly. Re-train motivation discovery—this is critical for using pain against objections later.`;
  } else if (gate === 3) {
    return `Gate 3 (The Pitch) is weak at ${adherence}% adherence. Reps aren't doing the "Inside/Outside" walkthrough correctly. Re-train property condition questions and the "Shoes" question tomorrow.`;
  } else if (gate === 4) {
    return `The Offer (Gate 4) needs work—only ${adherence}% adherence. Reps are likely negotiating with dollars instead of "Pain & Circumstances." Re-train the Virtual Withdraw anchor and how to pivot back to motivation.`;
  } else if (gate === 5) {
    return `The Hold (Gate 5) needs work—only ${adherence}% adherence. Reps aren't setting up the hold properly. Re-train: "I'm going to plug everything you told me into our system" and give the option to hang on or call back.`;
  } else if (gate === 6) {
    return `The Offer (Gate 6) needs work—only ${adherence}% adherence. Reps aren't explaining "as-is" buying or presenting the number clearly. Re-train the offer presentation and the pause after presenting.`;
  } else if (gate === 7) {
    return `Setting Expectations (Gate 7) is weak at ${adherence}% adherence. Reps aren't walking through all 5 next steps properly. Re-train: Agreement, Welcome Call, Photos/Walkthrough, Title Work, and Closing.`;
  } else if (gate === 8) {
    return `Final Commitment (Gate 8) is weak at ${adherence}% adherence. Reps aren't asking "Are you 100% ready to move forward?" or confirming email. Re-train the commitment question and staying on the line.`;
  }

  return `Gate ${gate} (${scriptHole.gateName}) is the weakest link at ${adherence}% adherence. Focus training on this gate tomorrow.`;
}
