'use client';

/**
 * Deal Calculator Component
 * Real-time calculator that updates as the rep talks
 * Shows ARV, Repairs, Wholesale Fee, and Offer Ceiling
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { calculateMAO, type ExitStrategy } from '@/lib/financialFramework';

interface DealCalculatorProps {
  transcript: string;
  exitStrategy?: ExitStrategy;
  suggestedMaxOffer?: number; // From gauntlet level
}

export default function DealCalculator({ transcript, exitStrategy = 'fix_and_flip', suggestedMaxOffer }: DealCalculatorProps) {
  const [arv, setARV] = useState<number | null>(null);
  const [repairs, setRepairs] = useState<number | null>(null);
  const [wholesaleFee, setWholesaleFee] = useState<number | null>(null);
  const [currentOffer, setCurrentOffer] = useState<number | null>(null);
  const [offerCeiling, setOfferCeiling] = useState<number | null>(null);

  // Extract values from transcript in real-time
  useEffect(() => {
    if (!transcript) return;

    // Extract ARV mentions
    const arvPattern = /(?:ARV|after repair value|value after repair)[\s:]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand)?/gi;
    const arvMatch = transcript.match(arvPattern);
    if (arvMatch) {
      const lastMatch = arvMatch[arvMatch.length - 1];
      const arvStr = lastMatch.replace(/[$,]/g, '').toLowerCase();
      let arvValue = parseFloat(arvStr);
      if (arvStr.includes('k') || arvStr.includes('thousand')) {
        arvValue = arvValue * 1000;
      }
      if (arvValue > 0 && arvValue !== arv) {
        setARV(arvValue);
      }
    }

    // Extract repair mentions
    const repairPattern = /(?:repairs?|rehab|renovation)[\s:]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand)?/gi;
    const repairMatch = transcript.match(repairPattern);
    if (repairMatch) {
      const lastMatch = repairMatch[repairMatch.length - 1];
      const repairStr = lastMatch.replace(/[$,]/g, '').toLowerCase();
      let repairValue = parseFloat(repairStr);
      if (repairStr.includes('k') || repairStr.includes('thousand')) {
        repairValue = repairValue * 1000;
      }
      if (repairValue > 0 && repairValue !== repairs) {
        setRepairs(repairValue);
      }
    }

    // Extract wholesale fee mentions (typically 5-10k or 3-5% of ARV)
    const feePattern = /(?:wholesale fee|assignment fee|fee)[\s:]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand)?/gi;
    const feeMatch = transcript.match(feePattern);
    if (feeMatch) {
      const lastMatch = feeMatch[feeMatch.length - 1];
      const feeStr = lastMatch.replace(/[$,]/g, '').toLowerCase();
      let feeValue = parseFloat(feeStr);
      if (feeStr.includes('k') || feeStr.includes('thousand')) {
        feeValue = feeValue * 1000;
      }
      if (feeValue > 0 && feeValue !== wholesaleFee) {
        setWholesaleFee(feeValue);
      }
    }

    // Extract current offer mentions
    const offerPattern = /(?:offer|I'll pay|I can do|let's do)[\s:]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand)?/gi;
    const offerMatch = transcript.match(offerPattern);
    if (offerMatch) {
      const lastMatch = offerMatch[offerMatch.length - 1];
      const offerStr = lastMatch.replace(/[$,]/g, '').toLowerCase();
      let offerValue = parseFloat(offerStr);
      if (offerStr.includes('k') || offerStr.includes('thousand')) {
        offerValue = offerValue * 1000;
      }
      if (offerValue > 0 && offerValue !== currentOffer) {
        setCurrentOffer(offerValue);
      }
    }

    // Calculate offer ceiling (MAO) if we have ARV and repairs
    if (arv && repairs) {
      const mao = calculateMAO(arv, repairs, exitStrategy);
      setOfferCeiling(mao);
    }
  }, [transcript, arv, repairs, exitStrategy]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isOverCeiling = currentOffer && offerCeiling && currentOffer > offerCeiling;
  const isOverSuggested = currentOffer && suggestedMaxOffer && currentOffer > suggestedMaxOffer;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-[#22C55E]" />
        <h3 className="text-sm font-semibold text-white">Deal Calculator</h3>
      </div>

      <div className="space-y-3">
        {/* ARV */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">ARV</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(arv)}</span>
        </div>

        {/* Repairs */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Repairs</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(repairs)}</span>
        </div>

        {/* Wholesale Fee */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Wholesale Fee</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(wholesaleFee)}</span>
        </div>

        <div className="h-px bg-white/10 my-2" />

        {/* Offer Ceiling (MAO) */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Offer Ceiling</span>
          <span className="text-sm font-bold text-[#22C55E]">{formatCurrency(offerCeiling)}</span>
        </div>

        {/* Current Offer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Current Offer</span>
          <AnimatePresence mode="wait">
            {isOverCeiling || isOverSuggested ? (
              <motion.div
                key="warning"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold text-red-400">{formatCurrency(currentOffer)}</span>
              </motion.div>
            ) : currentOffer ? (
              <motion.div
                key="good"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <span className="text-sm font-bold text-[#22C55E]">{formatCurrency(currentOffer)}</span>
              </motion.div>
            ) : (
              <span className="text-sm text-gray-500">—</span>
            )}
          </AnimatePresence>
        </div>

        {/* Warning Messages */}
        <AnimatePresence>
          {isOverCeiling && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30"
            >
              <p className="text-xs text-red-400">
                ⚠️ Over MAO by {formatCurrency(currentOffer! - offerCeiling!)} ({((currentOffer! - offerCeiling!) / offerCeiling! * 100).toFixed(1)}%)
              </p>
            </motion.div>
          )}
          {isOverSuggested && suggestedMaxOffer && !isOverCeiling && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
            >
              <p className="text-xs text-yellow-400">
                ⚠️ Over suggested max by {formatCurrency(currentOffer! - suggestedMaxOffer)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exit Strategy Indicator */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Exit Strategy</span>
            <span className="text-xs font-semibold text-gray-300 capitalize">
              {exitStrategy.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
