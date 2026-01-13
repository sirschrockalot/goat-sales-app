'use client';

/**
 * Billing Dashboard Component
 * 
 * Features:
 * - Live Meter showing total spend for current day
 * - Credit Status for ElevenLabs and Twilio
 * - Top Spender chart showing which rep/scenario costs the most
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Zap,
  CreditCard,
  Users,
  Activity,
  BarChart3,
  Database,
  Server,
  TrendingDown,
  CheckCircle
} from 'lucide-react';

interface CreditStatus {
  provider: 'elevenlabs' | 'twilio';
  balance: number;
  limit?: number;
  percentageRemaining: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface BurnRateData {
  totalCost: number;
  vapiCost: number;
  gpt4oCost: number;
  elevenlabsCost: number;
  totalMinutes: number;
  callCount: number;
  hourlyRate: number;
  dailyProjection: number;
}

interface DailySpend {
  date: string;
  total: number;
  vapi: number;
  gpt4o: number;
  elevenlabs: number;
  callCount: number;
}

interface TopSpender {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  callCount: number;
  averageCostPerCall: number;
  scenario?: string;
}

interface BudgetCheck {
  dailySpend: number;
  threshold: 'none' | 'warning' | 'killSwitch';
  actionTaken: boolean;
  message: string;
}

interface SupabaseUsage {
  dbSizeGB: number;
  egressGB: number;
  funcInvocations: number;
  dbCost: number;
  egressCost: number;
  funcCost: number;
  totalCost: number;
  period: string;
}

interface VercelUsage {
  fluidComputeHours: number;
  bandwidthGB: number;
  fluidComputeCost: number;
  bandwidthCost: number;
  totalCost: number;
  withinBudget: boolean;
  budgetCap: number;
  period: string;
}

interface InfrastructureCosts {
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

interface ProfitMargin {
  projectedRevenue: number;
  totalCosts: number;
  profitMargin: number;
  profitMarginPercentage: number;
  contractsSigned: number;
}

interface BillingData {
  credits: {
    elevenlabs: CreditStatus;
    twilio: CreditStatus;
  };
  usage: {
    vapi: {
      totalMinutes: number;
      totalCost: number;
      callCount: number;
    };
    burnRate: BurnRateData;
    dailySpend: DailySpend;
  };
  infrastructure: {
    supabase: SupabaseUsage;
    vercel: VercelUsage;
    costs: InfrastructureCosts;
  };
  profitMargin: ProfitMargin;
  topSpenders: TopSpender[];
  budgetCheck: BudgetCheck;
}

export default function BillingDashboard() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchBillingData();
    
    // Auto-refresh every 10 seconds for real-time updates (reduced from 30s)
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchBillingData, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/billing');
      if (response.ok) {
        const billingData = await response.json();
        setData(billingData);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'text-[#22C55E]';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
    }
  };

  const getStatusBgColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-[#22C55E]/20';
      case 'warning':
        return 'bg-yellow-500/20';
      case 'critical':
        return 'bg-red-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 text-gray-400">
        No billing data available
      </div>
    );
  }

  const { credits, usage, infrastructure, profitMargin, topSpenders, budgetCheck } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Billing & Usage Monitor</h2>
            <p className="text-sm text-gray-400">Track costs and prevent bill shock</p>
          </div>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
            autoRefresh
              ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]'
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
        </button>
      </div>

      {/* Budget Alert */}
      {budgetCheck.threshold !== 'none' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            budgetCheck.threshold === 'killSwitch'
              ? 'bg-red-500/20 border-red-500/50'
              : 'bg-yellow-500/20 border-yellow-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${
              budgetCheck.threshold === 'killSwitch' ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <div>
              <p className={`font-semibold ${
                budgetCheck.threshold === 'killSwitch' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {budgetCheck.threshold === 'killSwitch' ? 'KILL SWITCH ACTIVATED' : 'BUDGET WARNING'}
              </p>
              <p className="text-sm text-gray-300">{budgetCheck.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Live Meter - Daily Spend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Today's Spend</span>
            </div>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(usage.dailySpend.total)}
          </div>
          <div className="text-xs text-gray-400">
            {usage.dailySpend.callCount} calls • {usage.burnRate.dailyProjection.toFixed(2)} projected
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Hourly Rate</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(usage.burnRate.hourlyRate)}
          </div>
          <div className="text-xs text-gray-400">
            Last 24 hours average
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Total Minutes</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {Math.round(usage.burnRate.totalMinutes)}
          </div>
          <div className="text-xs text-gray-400">
            {usage.burnRate.callCount} calls today
          </div>
        </motion.div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Cost Breakdown (Last 24h)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Vapi</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(usage.burnRate.vapiCost)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(usage.burnRate.vapiCost / usage.burnRate.totalCost) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">GPT-4o</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(usage.burnRate.gpt4oCost)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(usage.burnRate.gpt4oCost / usage.burnRate.totalCost) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">ElevenLabs</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(usage.burnRate.elevenlabsCost)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(usage.burnRate.elevenlabsCost / usage.burnRate.totalCost) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Credit Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${getStatusBgColor(credits.elevenlabs.status)} flex items-center justify-center`}>
                <CreditCard className={`w-5 h-5 ${getStatusColor(credits.elevenlabs.status)}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white">ElevenLabs</h3>
                <p className="text-xs text-gray-400">Character Credits</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${getStatusColor(credits.elevenlabs.status)}`}>
              {credits.elevenlabs.percentageRemaining.toFixed(1)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Remaining</span>
              <span className="text-white font-semibold">
                {credits.elevenlabs.balance.toLocaleString()} {credits.elevenlabs.limit ? `/ ${credits.elevenlabs.limit.toLocaleString()}` : ''}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  credits.elevenlabs.status === 'healthy' ? 'bg-[#22C55E]' :
                  credits.elevenlabs.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${credits.elevenlabs.percentageRemaining}%` }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${getStatusBgColor(credits.twilio.status)} flex items-center justify-center`}>
                <CreditCard className={`w-5 h-5 ${getStatusColor(credits.twilio.status)}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Twilio</h3>
                <p className="text-xs text-gray-400">Account Balance</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${getStatusColor(credits.twilio.status)}`}>
              {credits.twilio.percentageRemaining.toFixed(1)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance</span>
              <span className="text-white font-semibold">
                {formatCurrency(credits.twilio.balance)}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  credits.twilio.status === 'healthy' ? 'bg-[#22C55E]' :
                  credits.twilio.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${credits.twilio.percentageRemaining}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Infrastructure Costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supabase Burn */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Supabase Burn</h3>
                <p className="text-xs text-gray-400">Monthly Infrastructure</p>
              </div>
            </div>
            <span className="text-lg font-bold text-white">
              {formatCurrency(infrastructure.supabase.totalCost)}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">DB Size</span>
              <span className="text-white">{infrastructure.supabase.dbSizeGB.toFixed(2)} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Egress</span>
              <span className="text-white">{infrastructure.supabase.egressGB.toFixed(2)} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Functions</span>
              <span className="text-white">{infrastructure.supabase.funcInvocations.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Period</span>
                <span className="text-white">{infrastructure.supabase.period}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vercel Fluid Compute */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                infrastructure.vercel.withinBudget ? 'bg-blue-500/20' : 'bg-red-500/20'
              }`}>
                <Server className={`w-5 h-5 ${
                  infrastructure.vercel.withinBudget ? 'text-blue-400' : 'text-red-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Vercel Fluid Compute</h3>
                <p className="text-xs text-gray-400">Monthly Infrastructure</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-lg font-bold ${
                infrastructure.vercel.withinBudget ? 'text-white' : 'text-red-400'
              }`}>
                {formatCurrency(infrastructure.vercel.totalCost)}
              </span>
              {!infrastructure.vercel.withinBudget && (
                <div className="text-xs text-red-400 mt-1">Over Budget</div>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Compute Hours</span>
              <span className="text-white">{infrastructure.vercel.fluidComputeHours.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Bandwidth</span>
              <span className="text-white">{infrastructure.vercel.bandwidthGB.toFixed(2)} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Budget Cap</span>
              <span className="text-white">{formatCurrency(infrastructure.vercel.budgetCap)}/mo</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                {infrastructure.vercel.withinBudget ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Within Budget
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Over Budget
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Profit Margin Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-6 border ${
          profitMargin.profitMargin >= 0
            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
            : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {profitMargin.profitMargin >= 0 ? (
              <TrendingUp className="w-6 h-6 text-green-400" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">Profit Margin Indicator</h3>
              <p className="text-sm text-gray-400">Revenue from signed contracts vs total costs</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${
              profitMargin.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(profitMargin.profitMargin)}
            </div>
            <div className="text-sm text-gray-400">
              {profitMargin.profitMarginPercentage.toFixed(1)}% margin
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Projected Revenue</div>
            <div className="text-xl font-semibold text-white">
              {formatCurrency(profitMargin.projectedRevenue)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {profitMargin.contractsSigned} contracts @ $82,700
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Costs</div>
            <div className="text-xl font-semibold text-white">
              {formatCurrency(profitMargin.totalCosts)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              API + Infrastructure
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Infrastructure Budget</div>
            <div className="text-xl font-semibold text-white">
              $1,000/mo
            </div>
            <div className={`text-xs mt-1 ${
              infrastructure.costs.grandTotal <= 1000 ? 'text-green-400' : 'text-red-400'
            }`}>
              {infrastructure.costs.grandTotal <= 1000 ? 'Within Budget' : 'Over Budget'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Spenders */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Top Spenders (Today)</h3>
          </div>
        </div>
        {topSpenders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No spending data available
          </div>
        ) : (
          <div className="space-y-3">
            {topSpenders.map((spender, index) => (
              <motion.div
                key={spender.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{spender.userName}</div>
                    <div className="text-xs text-gray-400">
                      {spender.userEmail}
                      {spender.scenario && (
                        <span className="ml-2 text-yellow-400">• {spender.scenario}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">{formatCurrency(spender.totalCost)}</div>
                  <div className="text-xs text-gray-400">
                    {spender.callCount} calls • {formatCurrency(spender.averageCostPerCall)} avg
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
