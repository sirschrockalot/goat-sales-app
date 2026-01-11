'use client';

/**
 * UnderwriterResponse Component
 * Displays simulated underwriter feedback during hold period
 * Provides "Battle Card" with approved price and reasons
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, DollarSign, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { getGauntletLevel } from '@/lib/gauntletLevels';

interface UnderwriterResponseProps {
  isVisible: boolean;
  gauntletLevel?: number;
  currentOffer?: number;
  arv?: number;
  repairs?: number;
  onClose: () => void;
}

interface UnderwriterDecision {
  maxApprovedPrice: number;
  requiredTerms: string[];
  battleCard: {
    reason: string;
    justification: string;
  }[];
  underwriterNotes: string;
}

export default function UnderwriterResponse({
  isVisible,
  gauntletLevel,
  currentOffer,
  arv,
  repairs,
  onClose,
}: UnderwriterResponseProps) {
  const [decision, setDecision] = useState<UnderwriterDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible && !decision) {
      // Simulate underwriter processing time (1-2 seconds)
      const timer = setTimeout(() => {
        generateUnderwriterDecision();
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isVisible, decision]);

  const generateUnderwriterDecision = () => {
    // Get gauntlet level config for suggested price
    const levelConfig = gauntletLevel ? getGauntletLevel(gauntletLevel) : null;
    const suggestedPrice = levelConfig?.suggestedBuyPrice || 180000;

    // Calculate max approved price (typically 5-10% below suggested for negotiation room)
    const maxApprovedPrice = Math.round(suggestedPrice * 0.92);

    // Generate battle card reasons based on property data
    const battleCard: UnderwriterDecision['battleCard'] = [];

    if (repairs && repairs > 30000) {
      battleCard.push({
        reason: 'High Repair Costs',
        justification: `Estimated repairs at $${repairs.toLocaleString()} exceed our standard threshold. This impacts our margin calculations.`,
      });
    }

    if (arv && arv > 250000) {
      battleCard.push({
        reason: 'ARV Validation',
        justification: `Recent comps in the area show ARV closer to $${(arv * 0.95).toLocaleString()}. We need to account for market volatility.`,
      });
    } else {
      battleCard.push({
        reason: 'Market Conditions',
        justification: 'Current market conditions require conservative pricing. Recent sales in the area have been trending lower.',
      });
    }

    if (gauntletLevel && gauntletLevel >= 3) {
      battleCard.push({
        reason: 'Property Condition',
        justification: 'Foundation and structural concerns require additional due diligence. We need to factor in potential hidden costs.',
      });
    }

    // Default battle card if no specific reasons
    if (battleCard.length === 0) {
      battleCard.push({
        reason: 'Standard Underwriting',
        justification: 'Based on our standard underwriting criteria, we need to maintain a minimum profit margin of 20%.',
      });
    }

    const requiredTerms: string[] = [
      'As-is condition',
      '7-14 day closing',
      'Cash offer',
      'No contingencies',
    ];

    const underwriterNotes = `Based on our analysis, we can approve up to $${maxApprovedPrice.toLocaleString()}. This accounts for repair estimates, market conditions, and our standard margin requirements.`;

    setDecision({
      maxApprovedPrice,
      requiredTerms,
      battleCard,
      underwriterNotes,
    });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="w-full max-w-2xl rounded-xl border border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Underwriting Department</h3>
                  <p className="text-xs text-gray-400">Internal Review</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg bg-white/10 p-2 text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mb-4 h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent"
                />
                <p className="text-sm text-gray-400">Consulting with underwriters...</p>
              </div>
            ) : decision ? (
              <div className="space-y-6">
                {/* Max Approved Price */}
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">APPROVED</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    <span className="text-3xl font-bold text-white">
                      {decision.maxApprovedPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{decision.underwriterNotes}</p>
                </div>

                {/* Required Terms */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-white">Required Terms:</h4>
                  <div className="space-y-2">
                    {decision.requiredTerms.map((term, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        <span className="text-xs text-gray-300">{term}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Battle Card */}
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">BATTLE CARD</h4>
                    <span className="text-xs text-gray-400">(Use these when presenting to seller)</span>
                  </div>
                  <div className="space-y-3">
                    {decision.battleCard.map((item, idx) => (
                      <div key={idx} className="rounded-lg bg-black/20 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-semibold text-yellow-400">{item.reason}</span>
                        </div>
                        <p className="text-xs text-gray-300">{item.justification}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={onClose}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Return to Call
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
