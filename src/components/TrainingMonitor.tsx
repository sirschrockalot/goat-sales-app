'use client';

/**
 * Training Monitor Dashboard
 * Visual monitoring dashboard for autonomous self-play sessions
 * Human-in-the-Loop filter for promoting synthetic tactics to production
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Zap,
  Shield,
  ShieldOff,
  BarChart3,
  Clock,
  DollarSign,
  MessageSquare,
  Award,
  X,
  Rocket,
  Target,
  Sparkles,
} from 'lucide-react';
import RadialGauge from './RadialGauge';

interface Battle {
  id: string;
  personaId: string;
  personaName: string;
  personaType: string;
  personaDescription: string;
  refereeScore: number;
  refereeFeedback: string;
  mathDefenseScore: number;
  humanityScore: number;
  successScore: number;
  verbalYesToMemorandum: boolean;
  winningRebuttal: string | null;
  turns: number;
  tokenUsage: number;
  costUsd: number;
  createdAt: string;
  endedAt: string | null;
  transcript: string;
}

interface PersonaAnalytic {
  personaId: string;
  personaName: string;
  personaType: string;
  totalBattles: number;
  successRate: number;
  averageScore: number;
  verbalYesCount: number;
  averageSuccessScore: number;
}

interface KillSwitchStatus {
  active: boolean;
  activatedAt: string | null;
}

interface ScenarioStatus {
  scenarioId: string;
  rawObjection: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalSessions: number;
  completedSessions: number;
  top3Identified: boolean;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

interface Breakthrough {
  id: string;
  rank: number;
  refereeScore: number;
  conflictResolved: boolean;
  priceMaintained: boolean;
  winningRebuttal: string;
  breakthroughInsight: string;
  battleId: string;
}

interface HumanityGrade {
  battleId: string;
  refereeScore: number;
  humanityGrade: number;
  closenessToCline: number;
  prosodyFeatures: any;
  roboticGapReport: any;
  personaName: string;
  personaType: string;
  createdAt: string;
}

export default function TrainingMonitor() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
  const [analytics, setAnalytics] = useState<PersonaAnalytic[]>([]);
  const [killSwitchStatus, setKillSwitchStatus] = useState<KillSwitchStatus>({
    active: false,
    activatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [promotingTactic, setPromotingTactic] = useState<string | null>(null);
  const [showTacticModal, setShowTacticModal] = useState(false);
  const [selectedTactic, setSelectedTactic] = useState<{
    battleId: string;
    rebuttal: string;
    score: number;
  } | null>(null);

  // Scenario Injector state
  const [rawObjection, setRawObjection] = useState('');
  const [injecting, setInjecting] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioStatus | null>(null);

  // Vocal Soul state
  const [humanityGrades, setHumanityGrades] = useState<HumanityGrade[]>([]);
  const [selectedHumanityBattle, setSelectedHumanityBattle] = useState<HumanityGrade | null>(null);
  const [loadingHumanity, setLoadingHumanity] = useState(false);

  // Breakthrough notifications
  const [breakthroughs, setBreakthroughs] = useState<any[]>([]);
  const [unreadBreakthroughs, setUnreadBreakthroughs] = useState(0);
  const [showBreakthroughModal, setShowBreakthroughModal] = useState(false);
  const [selectedBreakthrough, setSelectedBreakthrough] = useState<any | null>(null);

  // Budget status
  const [budgetStatus, setBudgetStatus] = useState<{
    todaySpend: number;
    dailyCap: number;
    remaining: number;
    percentageUsed: number;
    isThrottled: boolean;
    isExceeded: boolean;
  } | null>(null);

  // Fetch battles
  const fetchBattles = async () => {
    try {
      const response = await fetch('/api/sandbox/battles?limit=50');
      if (response.ok) {
        const data = await response.json();
        setBattles(data.battles || []);
      }
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch persona analytics
  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/sandbox/persona-analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Fetch kill-switch status
  const fetchKillSwitchStatus = async () => {
    try {
      const response = await fetch('/api/sandbox/kill-switch');
      if (response.ok) {
        const data = await response.json();
        setKillSwitchStatus(data);
      }
    } catch (error) {
      console.error('Error fetching kill-switch status:', error);
    }
  };

  // Fetch humanity grades
  const fetchHumanityGrades = async () => {
    setLoadingHumanity(true);
    try {
      const response = await fetch('/api/sandbox/humanity-grades?limit=20');
      if (response.ok) {
        const data = await response.json();
        setHumanityGrades(data.battles || []);
      }
    } catch (error) {
      console.error('Error fetching humanity grades:', error);
    } finally {
      setLoadingHumanity(false);
    }
  };

  // Fetch breakthroughs
  const fetchBreakthroughs = async () => {
    try {
      const response = await fetch('/api/sandbox/breakthroughs?status=pending_review');
      if (response.ok) {
        const data = await response.json();
        setBreakthroughs(data.breakthroughs || []);
        setUnreadBreakthroughs(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching breakthroughs:', error);
    }
  };

  // Fetch budget status
  const fetchBudgetStatus = async () => {
    try {
      const response = await fetch('/api/sandbox/budget-status');
      if (response.ok) {
        const data = await response.json();
        setBudgetStatus(data);
      }
    } catch (error) {
      console.error('Error fetching budget status:', error);
    }
  };

  // Toggle kill-switch
  const toggleKillSwitch = async () => {
    try {
      const action = killSwitchStatus.active ? 'deactivate' : 'activate';
      const response = await fetch('/api/sandbox/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setKillSwitchStatus({
          active: data.active,
          activatedAt: data.activatedAt,
        });
      }
    } catch (error) {
      console.error('Error toggling kill-switch:', error);
    }
  };

  // Promote tactic
  const promoteTactic = async (battleId: string) => {
    setPromotingTactic(battleId);
    try {
      const response = await fetch('/api/sandbox/promote-tactic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId }),
      });

      if (response.ok) {
        alert('Tactic promoted to production successfully!');
        setShowTacticModal(false);
        setSelectedTactic(null);
        // Refresh battles to update UI
        fetchBattles();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error promoting tactic:', error);
      alert('Failed to promote tactic');
    } finally {
      setPromotingTactic(null);
    }
  };

  // Get humanity score color
  const getHumanityColor = (score: number): 'red' | 'yellow' | 'green' => {
    if (score >= 7) return 'green';
    if (score >= 4) return 'yellow';
    return 'red';
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#EAB308';
    return '#EF4444';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Inject scenario
  const handleInjectScenario = async () => {
    if (!rawObjection.trim()) {
      alert('Please enter a raw objection');
      return;
    }

    setInjecting(true);
    try {
      const response = await fetch('/api/sandbox/inject-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawObjection: rawObjection.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveScenario({
          scenarioId: data.scenarioId,
          rawObjection: rawObjection.trim(),
          status: data.status,
          totalSessions: 50,
          completedSessions: 0,
          top3Identified: false,
          progress: 0,
          createdAt: new Date().toISOString(),
          completedAt: null,
        });
        setRawObjection('');
        // Start polling for status
        pollScenarioStatus(data.scenarioId);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error injecting scenario:', error);
      alert('Failed to inject scenario');
    } finally {
      setInjecting(false);
    }
  };

  // Poll scenario status
  const pollScenarioStatus = async (scenarioId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/sandbox/scenario-status?scenarioId=${scenarioId}`);
        if (response.ok) {
          const data = await response.json();
          setActiveScenario(data.scenario);
          setBreakthroughs(data.breakthroughs || []);

          // Continue polling if still running
          if (data.scenario.status === 'running') {
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error('Error polling scenario status:', error);
      }
    };

    poll();
  };

  // Get high-score battles (score > 90)
  const highScoreBattles = battles.filter((b) => b.refereeScore > 90);

  useEffect(() => {
    fetchBattles();
    fetchAnalytics();
    fetchKillSwitchStatus();
    fetchHumanityGrades();
    fetchBreakthroughs();
    fetchBudgetStatus();

    // Refresh every 10 seconds for real-time updates (reduced from 30s)
    const interval = setInterval(() => {
      fetchBattles();
      fetchAnalytics();
      fetchKillSwitchStatus();
      fetchHumanityGrades();
      fetchBreakthroughs();
      fetchBudgetStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Training Monitor</h1>
            <p className="text-gray-400">Autonomous Self-Play Session Dashboard</p>
          </div>

          {/* Breakthrough Notification Badge */}
          {unreadBreakthroughs > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <button
                onClick={() => {
                  setShowBreakthroughModal(true);
                  if (breakthroughs.length > 0) {
                    setSelectedBreakthrough(breakthroughs[0]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-2xl hover:bg-yellow-500/30 transition-all font-semibold"
              >
                <Sparkles className="w-5 h-5" />
                <span>New Elite Tactic Available</span>
                {unreadBreakthroughs > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                    {unreadBreakthroughs}
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Rapid Injector Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-6 h-6 text-acquisition" />
            <h2 className="text-xl font-bold text-white">Rapid Scenario Injector</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Input a real-world objection to brute-force winning rebuttals across 50 parallel sessions
          </p>

          <div className="space-y-4">
            <textarea
              value={rawObjection}
              onChange={(e) => setRawObjection(e.target.value)}
              placeholder='e.g., "The guy said he won&apos;t sign because his lawyer is on vacation"'
              className="w-full h-24 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-acquisition transition-colors resize-none"
              disabled={injecting || (activeScenario?.status === 'running')}
            />

            <button
              onClick={handleInjectScenario}
              disabled={injecting || !rawObjection.trim() || activeScenario?.status === 'running'}
              className="px-6 py-3 bg-acquisition/20 text-acquisition rounded-lg hover:bg-acquisition/30 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {injecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-acquisition border-t-transparent rounded-full animate-spin" />
                  Injecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Inject Scenario
                </>
              )}
            </button>
          </div>

          {/* Live Progress Bar */}
          {activeScenario && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-acquisition" />
                  <span className="text-sm font-semibold text-white">
                    {activeScenario.rawObjection}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {activeScenario.completedSessions} / {activeScenario.totalSessions} sessions
                </span>
              </div>

              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${activeScenario.progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${
                    activeScenario.status === 'completed'
                      ? 'bg-acquisition'
                      : activeScenario.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Status: <span className="text-white font-semibold">{activeScenario.status}</span>
                </span>
                {activeScenario.status === 'running' && (
                  <span className="text-gray-400 animate-pulse">Running...</span>
                )}
              </div>
            </div>
          )}

          {/* Victory Card - Best Performing Rebuttal */}
          {activeScenario?.status === 'completed' && breakthroughs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 bg-gradient-to-br from-acquisition/20 to-blue-500/20 border border-acquisition/50 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Victory Card - Top Rebuttal</h3>
              </div>

              {breakthroughs
                .filter((b) => b.rank === 1)
                .map((breakthrough) => (
                  <div key={breakthrough.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Rank #1</div>
                        <div className="text-2xl font-bold text-acquisition">
                          Score: {breakthrough.refereeScore}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {breakthrough.conflictResolved && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Conflict Resolved
                          </span>
                        )}
                        {breakthrough.priceMaintained && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            Price Maintained
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-sm font-semibold text-gray-400 mb-2">
                        Winning Rebuttal:
                      </div>
                      <div className="text-white whitespace-pre-wrap">{breakthrough.winningRebuttal}</div>
                    </div>

                    {breakthrough.breakthroughInsight && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Breakthrough Insight:
                        </div>
                        <div className="text-gray-300 text-sm">{breakthrough.breakthroughInsight}</div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTactic({
                          battleId: breakthrough.battleId,
                          rebuttal: breakthrough.winningRebuttal,
                          score: breakthrough.refereeScore,
                        });
                        setShowTacticModal(true);
                      }}
                      className="w-full px-4 py-2 bg-acquisition/20 text-acquisition rounded-lg hover:bg-acquisition/30 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Promote to Production
                    </button>
                  </div>
                ))}
            </motion.div>
          )}
        </div>

        {/* Kill Switch */}
        <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Kill Switch</div>
              <div className="text-xs text-gray-500">
                {killSwitchStatus.active
                  ? `Active since ${killSwitchStatus.activatedAt ? formatDate(killSwitchStatus.activatedAt) : 'now'}`
                  : 'Inactive'}
              </div>
            </div>
            <button
              onClick={toggleKillSwitch}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold transition-all ${
                killSwitchStatus.active
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
              }`}
            >
              {killSwitchStatus.active ? (
                <>
                  <ShieldOff className="w-5 h-5" />
                  Deactivate
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Activate Kill Switch
                </>
              )}
            </button>
          </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Total Battles</div>
              <Activity className="w-5 h-5 text-acquisition" />
            </div>
            <div className="text-3xl font-bold text-white">{battles.length}</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">High Scores</div>
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">{highScoreBattles.length}</div>
            <div className="text-sm text-gray-400">Score &gt; 90</div>
          </div>

          <div className="glass-card rounded-2xl p-6 border-2 border-yellow-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Golden Samples</div>
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {battles.filter((b) => b.refereeScore > 95).length}
            </div>
            <div className="text-sm text-gray-400">Score &gt; 95 (Auto-saved)</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Avg Score</div>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {battles.length > 0
                ? Math.round(
                    battles.reduce((sum, b) => sum + b.refereeScore, 0) / battles.length
                  )
                : 0}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Total Cost</div>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              ${battles.reduce((sum, b) => sum + b.costUsd, 0).toFixed(2)}
            </div>
          </div>

          {/* Training Budget Status */}
          {budgetStatus && (
            <div className={`glass-card rounded-2xl p-6 border-2 ${
              budgetStatus.isExceeded 
                ? 'border-red-500/50 bg-red-500/10' 
                : budgetStatus.isThrottled 
                ? 'border-yellow-500/50 bg-yellow-500/10'
                : 'border-green-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-400 text-sm">Training Budget (Today)</div>
                {budgetStatus.isExceeded ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : budgetStatus.isThrottled ? (
                  <Zap className="w-5 h-5 text-yellow-400" />
                ) : (
                  <DollarSign className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${budgetStatus.todaySpend.toFixed(2)} / ${budgetStatus.dailyCap.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                {budgetStatus.percentageUsed.toFixed(1)}% used • ${budgetStatus.remaining.toFixed(2)} remaining
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetStatus.percentageUsed, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${
                    budgetStatus.isExceeded 
                      ? 'bg-red-500' 
                      : budgetStatus.isThrottled 
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {budgetStatus.isExceeded 
                  ? '🚨 Budget exceeded - Training blocked'
                  : budgetStatus.isThrottled 
                  ? '⚡ Throttled - Using GPT-4o-Mini'
                  : '✅ Full quality training'}
              </div>
            </div>
          )}
        </div>

        {/* Vocal Soul Analysis Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-acquisition" />
              <h2 className="text-xl font-bold text-white">Vocal Soul Analysis</h2>
            </div>
            <button
              onClick={fetchHumanityGrades}
              className="text-sm text-gray-400 hover:text-white transition-colors"
              disabled={loadingHumanity}
            >
              {loadingHumanity ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loadingHumanity ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-acquisition border-t-transparent rounded-full animate-spin" />
            </div>
          ) : humanityGrades.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No humanity grades available yet</p>
              <p className="text-sm mt-2">Run vocal soul audits on battle audio files</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Average Closeness to Cline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="glass-card rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Avg Humanity Grade</div>
                  <div className="text-2xl font-bold text-white">
                    {humanityGrades.length > 0
                      ? Math.round(
                          humanityGrades.reduce((sum, h) => sum + h.humanityGrade, 0) /
                            humanityGrades.length
                        )
                      : 0}
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4 border-2 border-yellow-500/30">
                  <div className="text-sm text-gray-400 mb-1">Avg Closeness to Cline</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {humanityGrades.length > 0
                      ? Math.round(
                          humanityGrades.reduce((sum, h) => sum + (h.closenessToCline || 0), 0) /
                            humanityGrades.length
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Target: 98%</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Battles Analyzed</div>
                  <div className="text-2xl font-bold text-white">{humanityGrades.length}</div>
                </div>
              </div>

              {/* Humanity Grades List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {humanityGrades.map((grade) => (
                  <motion.div
                    key={grade.battleId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-4 cursor-pointer hover:border-acquisition/50 transition-all"
                    onClick={() => setSelectedHumanityBattle(grade)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{grade.personaName}</span>
                          <span className="text-xs text-gray-500">({grade.personaType})</span>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Humanity Grade */}
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">Humanity</div>
                            <div
                              className="text-lg font-bold"
                              style={{
                                color:
                                  grade.humanityGrade >= 85
                                    ? '#22C55E'
                                    : grade.humanityGrade >= 70
                                    ? '#EAB308'
                                    : '#EF4444',
                              }}
                            >
                              {grade.humanityGrade}/100
                            </div>
                          </div>

                          {/* Closeness to Cline */}
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">Closeness</div>
                            <div className="text-lg font-bold text-yellow-400">
                              {Math.round(grade.closenessToCline || 0)}%
                            </div>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="flex-1 max-w-xs">
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${grade.closenessToCline || 0}%`,
                                  background: `linear-gradient(to right, 
                                    #EF4444 0%,
                                    #EAB308 50%,
                                    #22C55E 98%,
                                    #22C55E 100%)`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {formatDate(grade.createdAt)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Battle Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Battle Feed</h2>
              <button
                onClick={fetchBattles}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-acquisition border-t-transparent rounded-full animate-spin" />
              </div>
            ) : battles.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No battles found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
                {battles.map((battle) => (
                  <motion.div
                    key={battle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 cursor-pointer hover:border-acquisition/50 transition-all"
                    onClick={() => setSelectedBattle(battle)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{battle.personaName}</span>
                          <span className="text-xs text-gray-500">({battle.personaType})</span>
                          {battle.refereeScore > 90 && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                              High Score
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          {/* Humanity Score Meter */}
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">Humanity</div>
                            <div
                              className="w-16 h-2 rounded-full overflow-hidden"
                              style={{
                                background: `linear-gradient(to right, 
                                  #EF4444 0%, 
                                  #EF4444 ${(battle.humanityScore / 10) * 33}%,
                                  #EAB308 ${(battle.humanityScore / 10) * 33}%,
                                  #EAB308 ${(battle.humanityScore / 10) * 66}%,
                                  #22C55E ${(battle.humanityScore / 10) * 66}%,
                                  #22C55E 100%)`,
                              }}
                            >
                              <div
                                className="h-full bg-white/20"
                                style={{ width: `${(battle.humanityScore / 10) * 100}%` }}
                              />
                            </div>
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color: getHumanityColor(battle.humanityScore) === 'green'
                                  ? '#22C55E'
                                  : getHumanityColor(battle.humanityScore) === 'yellow'
                                  ? '#EAB308'
                                  : '#EF4444',
                              }}
                            >
                              {battle.humanityScore}/10
                            </span>
                          </div>

                          <div className="text-xs text-gray-500">
                            Score: <span style={{ color: getScoreColor(battle.refereeScore) }}>
                              {battle.refereeScore}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {battle.turns} turns
                          </div>
                        </div>

                        {battle.refereeScore > 90 && battle.winningRebuttal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTactic({
                                battleId: battle.id,
                                rebuttal: battle.winningRebuttal!,
                                score: battle.refereeScore,
                              });
                              setShowTacticModal(true);
                            }}
                            className="mt-2 px-3 py-1.5 bg-acquisition/20 text-acquisition text-xs rounded-lg hover:bg-acquisition/30 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-3 h-3" />
                            Review Winning Tactic
                          </button>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: getScoreColor(battle.refereeScore) }}
                        >
                          {battle.refereeScore}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(battle.createdAt)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Persona Performance Analytics */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Persona Difficulty</h2>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-sm text-gray-400 mb-4">
                Success Rate (Hardest to Close)
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {analytics
                  .filter((a) => a.totalBattles > 0)
                  .slice(0, 10)
                  .map((analytic, index) => (
                    <div key={analytic.personaId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">
                            {analytic.personaName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {analytic.totalBattles} battles
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-lg font-bold"
                            style={{
                              color:
                                analytic.successRate < 20
                                  ? '#EF4444'
                                  : analytic.successRate < 50
                                  ? '#EAB308'
                                  : '#22C55E',
                            }}
                          >
                            {analytic.successRate}%
                          </div>
                          <div className="text-xs text-gray-500">success</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${analytic.successRate}%`,
                            backgroundColor:
                              analytic.successRate < 20
                                ? '#EF4444'
                                : analytic.successRate < 50
                                ? '#EAB308'
                                : '#22C55E',
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Viewer Modal */}
      <AnimatePresence>
        {selectedBattle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedBattle(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedBattle.personaName}</h3>
                  <p className="text-sm text-gray-400">{selectedBattle.personaDescription}</p>
                </div>
                <button
                  onClick={() => setSelectedBattle(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Referee Score</div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: getScoreColor(selectedBattle.refereeScore) }}
                  >
                    {selectedBattle.refereeScore}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Math Defense</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedBattle.mathDefenseScore}/10
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Humanity</div>
                  <div
                    className="text-2xl font-bold"
                    style={{
                      color:
                        getHumanityColor(selectedBattle.humanityScore) === 'green'
                          ? '#22C55E'
                          : getHumanityColor(selectedBattle.humanityScore) === 'yellow'
                          ? '#EAB308'
                          : '#EF4444',
                    }}
                  >
                    {selectedBattle.humanityScore}/10
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Success</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedBattle.successScore}/10
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                <div className="space-y-3">
                  {selectedBattle.transcript.split('\n\n').map((line, index) => {
                    const isCloser = line.startsWith('CLOSER:');
                    const isPersona = line.startsWith('PERSONA:');
                    const content = line.replace(/^(CLOSER|PERSONA):\s*/, '');

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          isCloser
                            ? 'bg-acquisition/20 border border-acquisition/30'
                            : isPersona
                            ? 'bg-disposition/20 border border-disposition/30'
                            : 'bg-gray-800/50'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 text-gray-400">
                          {isCloser ? 'APEX CLOSER' : isPersona ? 'PERSONA' : 'SYSTEM'}
                        </div>
                        <div className="text-white whitespace-pre-wrap">{content}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedBattle.refereeFeedback && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-xs font-semibold text-blue-400 mb-2">Referee Feedback</div>
                  <div className="text-sm text-gray-300">{selectedBattle.refereeFeedback}</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactic Promotion Modal */}
      <AnimatePresence>
        {showTacticModal && selectedTactic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            onClick={() => {
              setShowTacticModal(false);
              setSelectedTactic(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Winning Tactic</h3>
                <button
                  onClick={() => {
                    setShowTacticModal(false);
                    setSelectedTactic(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Battle Score: {selectedTactic.score}</div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-white whitespace-pre-wrap">{selectedTactic.rebuttal}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    promoteTactic(selectedTactic.battleId);
                  }}
                  disabled={promotingTactic === selectedTactic.battleId}
                  className="flex-1 px-4 py-3 bg-acquisition/20 text-acquisition rounded-lg hover:bg-acquisition/30 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {promotingTactic === selectedTactic.battleId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-acquisition border-t-transparent rounded-full animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Promote to Production
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTacticModal(false);
                    setSelectedTactic(null);
                  }}
                  className="px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Humanity Grade Detail Modal */}
      <AnimatePresence>
        {selectedHumanityBattle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedHumanityBattle(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Vocal Soul Analysis</h3>
                  <p className="text-sm text-gray-400">{selectedHumanityBattle.personaName}</p>
                </div>
                <button
                  onClick={() => setSelectedHumanityBattle(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Humanity Grade</div>
                  <div
                    className="text-3xl font-bold"
                    style={{
                      color:
                        selectedHumanityBattle.humanityGrade >= 85
                          ? '#22C55E'
                          : selectedHumanityBattle.humanityGrade >= 70
                          ? '#EAB308'
                          : '#EF4444',
                    }}
                  >
                    {selectedHumanityBattle.humanityGrade}/100
                  </div>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Closeness to Cline</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {Math.round(selectedHumanityBattle.closenessToCline || 0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Target: 98%</div>
                </div>
              </div>

              {/* Prosody Features */}
              {selectedHumanityBattle.prosodyFeatures && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Prosody Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Pitch Variance</div>
                      <div className="text-lg font-semibold text-white">
                        {((selectedHumanityBattle.prosodyFeatures.pitchVariance || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Rhythm Variability</div>
                      <div className="text-lg font-semibold text-white">
                        {((selectedHumanityBattle.prosodyFeatures.rhythmVariability || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Jitter</div>
                      <div className="text-lg font-semibold text-white">
                        {((selectedHumanityBattle.prosodyFeatures.jitter || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Shimmer</div>
                      <div className="text-lg font-semibold text-white">
                        {((selectedHumanityBattle.prosodyFeatures.shimmer || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Robotic Gap Report */}
              {selectedHumanityBattle.roboticGapReport && (
                <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Robotic Gap Analysis</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Pitch Variance Gap</div>
                      <div className="text-sm text-white">
                        {((selectedHumanityBattle.roboticGapReport.pitchVarianceGap || 0) * 100).toFixed(1)}%
                        {selectedHumanityBattle.roboticGapReport.pitchVarianceGap > 0.2 && (
                          <span className="text-red-400 ml-2">⚠️ Too monotone</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Rhythm Gap</div>
                      <div className="text-sm text-white">
                        {((selectedHumanityBattle.roboticGapReport.rhythmGap || 0) * 100).toFixed(1)}%
                        {selectedHumanityBattle.roboticGapReport.rhythmGap > 0.2 && (
                          <span className="text-red-400 ml-2">⚠️ Too metronomic</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Turn Latency Gap</div>
                      <div className="text-sm text-white">
                        {selectedHumanityBattle.roboticGapReport.turnLatencyGap?.toFixed(2) || 0}s
                        {selectedHumanityBattle.roboticGapReport.turnLatencyGap > 0.5 && (
                          <span className="text-red-400 ml-2">⚠️ Dead air, not comfortable silence</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Texture Density Gap</div>
                      <div className="text-sm text-white">
                        {selectedHumanityBattle.roboticGapReport.textureDensityGap?.toFixed(1) || 0} textures/min
                        {selectedHumanityBattle.roboticGapReport.textureDensityGap > 3 && (
                          <span className="text-red-400 ml-2">⚠️ Need more textures</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedHumanityBattle.roboticGapReport.recommendations &&
                    selectedHumanityBattle.roboticGapReport.recommendations.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="text-xs font-semibold text-blue-400 mb-2">Recommendations</div>
                        <ul className="space-y-1">
                          {selectedHumanityBattle.roboticGapReport.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-gray-300">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Simplified Spectrogram Visualization */}
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <div className="text-xs font-semibold text-gray-400 mb-3">Tonality Comparison</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Eric Cline (Gold Standard)</span>
                    <span className="text-yellow-400">100%</span>
                  </div>
                  <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden relative">
                    {/* Gold standard bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-yellow-500/50" />
                    {/* AI performance overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-acquisition/50 to-acquisition/30"
                      style={{ width: `${selectedHumanityBattle.closenessToCline || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">AI Performance</span>
                    <span className="text-acquisition">{Math.round(selectedHumanityBattle.closenessToCline || 0)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breakthrough Modal */}
      <AnimatePresence>
        {showBreakthroughModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            onClick={() => {
              setShowBreakthroughModal(false);
              setSelectedBreakthrough(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Elite Tactics - Pending Review</h3>
                </div>
                <button
                  onClick={() => {
                    setShowBreakthroughModal(false);
                    setSelectedBreakthrough(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                {breakthroughs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No breakthroughs pending review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {breakthroughs.map((breakthrough) => (
                      <div
                        key={breakthrough.battleId}
                        className="p-4 bg-gradient-to-br from-yellow-500/20 to-acquisition/20 border border-yellow-500/50 rounded-xl cursor-pointer hover:border-yellow-400 transition-all"
                        onClick={() => setSelectedBreakthrough(breakthrough)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">{breakthrough.personaName}</span>
                              <span className="text-xs text-gray-500">({breakthrough.personaType})</span>
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                Score: {breakthrough.refereeScore}
                              </span>
                            </div>
                            {breakthrough.humanityGrade && (
                              <div className="text-sm text-gray-400">
                                Humanity: {breakthrough.humanityGrade}/100
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(breakthrough.detectedAt || breakthrough.createdAt)}
                          </div>
                        </div>

                        {breakthrough.definingMoment && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-yellow-400 mb-1">Defining Moment:</div>
                            <div className="text-sm text-gray-300 italic">"{breakthrough.definingMoment}"</div>
                          </div>
                        )}

                        {breakthrough.tacticalSnippet && (
                          <div className="p-3 bg-gray-900/50 rounded-lg">
                            <div className="text-xs font-semibold text-acquisition mb-1">Tactical Snippet:</div>
                            <div className="text-sm text-white">{breakthrough.tacticalSnippet}</div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                // First, promote the tactic
                                const promoteResponse = await fetch('/api/sandbox/promote-tactic', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ battleId: breakthrough.battleId }),
                                });

                                if (!promoteResponse.ok) {
                                  const error = await promoteResponse.json();
                                  alert(`Error promoting: ${error.error}`);
                                  return;
                                }

                                // Then, update status
                                const statusResponse = await fetch('/api/sandbox/breakthroughs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    battleId: breakthrough.battleId,
                                    action: 'promote',
                                  }),
                                });

                                if (statusResponse.ok) {
                                  await fetchBreakthroughs();
                                  alert('Breakthrough promoted to production!');
                                }
                              } catch (error) {
                                console.error('Error promoting breakthrough:', error);
                                alert('Failed to promote breakthrough');
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-acquisition/20 text-acquisition rounded-lg hover:bg-acquisition/30 transition-colors text-sm font-semibold"
                          >
                            Promote to Production
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch('/api/sandbox/breakthroughs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    battleId: breakthrough.battleId,
                                    action: 'mark_reviewed',
                                  }),
                                });
                                if (response.ok) {
                                  await fetchBreakthroughs();
                                }
                              } catch (error) {
                                console.error('Error marking reviewed:', error);
                              }
                            }}
                            className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Mark Reviewed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
