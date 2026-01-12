/**
 * Training Analytics
 * Aggregates training progress data for admin dashboard
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';

export interface RepAnalytics {
  userId: string;
  name: string;
  email: string;
  assignedPath: 'acquisitions' | 'dispositions' | null;
  gauntletLevel: number;
  totalXP: number;
  averageScore: number;
  totalCalls: number;
  velocity: number; // Levels completed per day since account creation
  gateMastery: Record<string, number>; // Gate name -> pass rate (0-100)
  managerNote: string; // AI-generated coaching recommendation
}

export interface PathComparison {
  path: 'acquisitions' | 'dispositions';
  totalReps: number;
  averageLevel: number;
  averageScore: number;
  averageXP: number;
  totalCalls: number;
}

export interface GateMasteryData {
  gateName: string;
  passRate: number; // 0-100
  totalAttempts: number;
  totalPasses: number;
}

export interface TrainingAnalytics {
  reps: RepAnalytics[];
  pathComparison: PathComparison[];
  gateMastery: GateMasteryData[];
}

// Gate names mapping for both paths
const ACQUISITION_GATES = [
  'Approval/Denial Intro',
  'Fact-Finding',
  'Property Condition',
  'Tone',
  'The Clinch',
];

const DISPOSITION_GATES = [
  'The Hook (The Numbers)',
  'The Narrative (Comp Analysis)',
  'The Scarcity Anchor',
  'The Terms',
  'The Clinch (Assignment)',
];

/**
 * Generate AI coaching recommendation for a rep
 */
function generateManagerNote(rep: {
  name: string;
  assignedPath: 'acquisitions' | 'dispositions' | null;
  averageScore: number;
  gauntletLevel: number;
  gateMastery: Record<string, number>;
  velocity: number;
}): string {
  const { name, assignedPath, averageScore, gauntletLevel, gateMastery, velocity } = rep;
  const pathName = assignedPath === 'acquisitions' ? 'Acquisitions' : 'Dispositions';

  // Find weakest gate
  const weakestGate = Object.entries(gateMastery)
    .sort((a, b) => a[1] - b[1])[0];

  // Find strongest gate
  const strongestGate = Object.entries(gateMastery)
    .sort((a, b) => b[1] - a[1])[0];

  // Generate note based on performance
  if (averageScore >= 90 && gauntletLevel >= 4) {
    return `${name} is crushing ${pathName} - Level ${gauntletLevel} with ${averageScore}% average. Keep pushing for Level 5!`;
  } else if (averageScore >= 85 && gauntletLevel >= 3) {
    return `${name} is excelling in ${pathName} (Level ${gauntletLevel}, ${averageScore}% avg). Focus on mastering "${weakestGate[0]}" to reach the next level.`;
  } else if (averageScore >= 80 && gauntletLevel >= 2) {
    return `${name} is making solid progress in ${pathName} (Level ${gauntletLevel}). Strongest in "${strongestGate[0]}" but needs work on "${weakestGate[0]}" (${Math.round(weakestGate[1])}% pass rate).`;
  } else if (averageScore >= 70) {
    return `${name} is building momentum in ${pathName}. Average score ${averageScore}% - focus on "${weakestGate[0]}" fundamentals to break into Level 2.`;
  } else if (velocity > 0.1) {
    return `${name} is progressing quickly (${velocity.toFixed(2)} levels/day) but needs to improve execution. Average ${averageScore}% - prioritize "${weakestGate[0]}" practice.`;
  } else {
    return `${name} needs more practice in ${pathName}. Current average ${averageScore}% - start with Level 1 fundamentals and focus on "${weakestGate[0]}".`;
  }
}

/**
 * Calculate gate mastery from logic_gates array
 */
function calculateGateMastery(
  calls: Array<{ logic_gates: any; persona_mode: string }>,
  path: 'acquisitions' | 'dispositions' | null
): Record<string, number> {
  const gateNames = path === 'dispositions' ? DISPOSITION_GATES : ACQUISITION_GATES;
  const gateStats: Record<string, { passes: number; attempts: number }> = {};

  // Initialize all gates
  gateNames.forEach((gateName) => {
    gateStats[gateName] = { passes: 0, attempts: 0 };
  });

  // Process each call
  calls.forEach((call) => {
    const gates = call.logic_gates as Array<{ name: string; passed: boolean }> | null;
    if (!gates || !Array.isArray(gates)) return;

    gates.forEach((gate) => {
      // Match gate by name (handle variations)
      const matchingGate = gateNames.find((g) =>
        gate.name.includes(g) || g.includes(gate.name.split('(')[0].trim())
      );

      if (matchingGate) {
        gateStats[matchingGate].attempts++;
        if (gate.passed) {
          gateStats[matchingGate].passes++;
        }
      }
    });
  });

  // Calculate pass rates
  const mastery: Record<string, number> = {};
  Object.entries(gateStats).forEach(([gateName, stats]) => {
    mastery[gateName] = stats.attempts > 0
      ? Math.round((stats.passes / stats.attempts) * 100)
      : 0;
  });

  return mastery;
}

/**
 * Get training analytics for all reps
 */
export async function getTrainingAnalytics(): Promise<TrainingAnalytics> {
  try {
    // OPTIMIZED: Fetch all profiles with their assigned paths in one query
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, assigned_path, gauntlet_level, experience_points, created_at')
      .eq('is_admin', false); // Use eq instead of not for better index usage

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return {
        reps: [],
        pathComparison: [],
        gateMastery: [],
      };
    }

    // OPTIMIZED: Fetch all calls with logic gates in one query, ordered by user_id for efficient grouping
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('user_id, goat_score, logic_gates, persona_mode, created_at')
      .not('goat_score', 'is', null)
      .order('user_id', { ascending: true }); // Order by user_id for efficient grouping

    if (callsError) {
      throw new Error(`Failed to fetch calls: ${callsError.message}`);
    }

    // OPTIMIZED: Pre-group calls by user_id to avoid repeated filtering
    const callsByUserId = new Map<string, typeof calls>();
    (calls || []).forEach((call) => {
      if (!call.user_id) return;
      if (!callsByUserId.has(call.user_id)) {
        callsByUserId.set(call.user_id, []);
      }
      callsByUserId.get(call.user_id)!.push(call);
    });

    // Process each rep (now using pre-grouped calls)
    const reps: RepAnalytics[] = profiles.map((profile) => {
        const userCalls = callsByUserId.get(profile.id) || [];
        const scoredCalls = userCalls.filter((call) => call.goat_score !== null);

        // Calculate metrics
        const totalCalls = scoredCalls.length;
        const totalScore = scoredCalls.reduce((sum, call) => sum + (call.goat_score || 0), 0);
        const averageScore = totalCalls > 0 ? Math.round(totalScore / totalCalls) : 0;
        const totalXP = profile.experience_points || 0;
        const gauntletLevel = profile.gauntlet_level || 1;

        // Calculate velocity (levels per day since account creation)
        const accountAgeDays = profile.created_at
          ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
          : 1;
        const velocity = accountAgeDays > 0 ? (gauntletLevel - 1) / accountAgeDays : 0;

        // Calculate gate mastery
        const gateMastery = calculateGateMastery(
          userCalls,
          profile.assigned_path as 'acquisitions' | 'dispositions' | null
        );

        // Generate manager note
        const managerNote = generateManagerNote({
          name: profile.name || profile.email || 'Unknown',
          assignedPath: profile.assigned_path as 'acquisitions' | 'dispositions' | null,
          averageScore,
          gauntletLevel,
          gateMastery,
          velocity,
        });

        return {
          userId: profile.id,
          name: profile.name || profile.email || 'Unknown',
          email: profile.email || '',
          assignedPath: profile.assigned_path as 'acquisitions' | 'dispositions' | null,
          gauntletLevel,
          totalXP,
          averageScore,
          totalCalls,
          velocity,
          gateMastery,
          managerNote,
        };
      });

    // Calculate path comparison
    const pathComparison: PathComparison[] = [
      {
        path: 'acquisitions',
        totalReps: reps.filter((r) => r.assignedPath === 'acquisitions').length,
        averageLevel: calculateAverage(
          reps.filter((r) => r.assignedPath === 'acquisitions').map((r) => r.gauntletLevel)
        ),
        averageScore: calculateAverage(
          reps.filter((r) => r.assignedPath === 'acquisitions').map((r) => r.averageScore)
        ),
        averageXP: calculateAverage(
          reps.filter((r) => r.assignedPath === 'acquisitions').map((r) => r.totalXP)
        ),
        totalCalls: reps
          .filter((r) => r.assignedPath === 'acquisitions')
          .reduce((sum, r) => sum + r.totalCalls, 0),
      },
      {
        path: 'dispositions',
        totalReps: reps.filter((r) => r.assignedPath === 'dispositions').length,
        averageLevel: calculateAverage(
          reps.filter((r) => r.assignedPath === 'dispositions').map((r) => r.gauntletLevel)
        ),
        averageScore: calculateAverage(
          reps.filter((r) => r.assignedPath === 'dispositions').map((r) => r.averageScore)
        ),
        averageXP: calculateAverage(
          reps.filter((r) => r.assignedPath === 'dispositions').map((r) => r.totalXP)
        ),
        totalCalls: reps
          .filter((r) => r.assignedPath === 'dispositions')
          .reduce((sum, r) => sum + r.totalCalls, 0),
      },
    ];

    // Calculate team-wide gate mastery
    const allGateStats: Record<string, { passes: number; attempts: number }> = {};
    const allGateNames = [...ACQUISITION_GATES, ...DISPOSITION_GATES];

    allGateNames.forEach((gateName) => {
      allGateStats[gateName] = { passes: 0, attempts: 0 };
    });

    (calls || []).forEach((call) => {
      const gates = call.logic_gates as Array<{ name: string; passed: boolean }> | null;
      if (!gates || !Array.isArray(gates)) return;

      gates.forEach((gate) => {
        const matchingGate = allGateNames.find((g) =>
          gate.name.includes(g) || g.includes(gate.name.split('(')[0].trim())
        );

        if (matchingGate) {
          allGateStats[matchingGate].attempts++;
          if (gate.passed) {
            allGateStats[matchingGate].passes++;
          }
        }
      });
    });

    const gateMastery: GateMasteryData[] = Object.entries(allGateStats)
      .map(([gateName, stats]) => ({
        gateName,
        passRate: stats.attempts > 0
          ? Math.round((stats.passes / stats.attempts) * 100)
          : 0,
        totalAttempts: stats.attempts,
        totalPasses: stats.passes,
      }))
      .filter((gate) => gate.totalAttempts > 0) // Only show gates with attempts
      .sort((a, b) => a.passRate - b.passRate); // Sort by worst performance first

    return {
      reps,
      pathComparison,
      gateMastery,
    };
  } catch (error) {
    logger.error('Error getting training analytics', { error });
    throw error;
  }
}

/**
 * Helper function to calculate average
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round(sum / numbers.length);
}
