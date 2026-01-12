'use client';

/**
 * ContractWalkthrough Component
 * Displays the contract walk-through interface with clause highlighting
 * Synchronizes with AI's explanation in real-time
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, AlertCircle, DollarSign, Home, Scale } from 'lucide-react';
import { getContractKnowledge, type ContractClause } from '@/lib/contractKnowledge';

interface ContractWalkthroughProps {
  transcript: string;
  isActive: boolean;
  onClauseHighlight?: (clauseNumber: string) => void;
}

interface ObjectionTip {
  clauseNumber: string;
  tip: string;
  isActive: boolean;
}

export default function ContractWalkthrough({
  transcript,
  isActive,
  onClauseHighlight,
}: ContractWalkthroughProps) {
  const [currentClause, setCurrentClause] = useState<ContractClause | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [objectionTip, setObjectionTip] = useState<ObjectionTip | null>(null);
  const contract = getContractKnowledge();

  useEffect(() => {
    if (!isActive || !transcript) return;

    const lowerTranscript = transcript.toLowerCase();

    // Detect which clause is being discussed
    for (const clause of contract.clauses) {
      const clauseKeywords = [
        clause.title.toLowerCase(),
        `clause ${clause.clauseNumber}`,
        clause.clauseNumber,
        ...clause.keyPoints.map(kp => kp.toLowerCase()),
      ];

      const isDiscussingClause = clauseKeywords.some(keyword =>
        lowerTranscript.includes(keyword)
      );

      if (isDiscussingClause && currentClause?.clauseNumber !== clause.clauseNumber) {
        setCurrentClause(clause);
        setHighlightedSection(clause.clauseNumber);
        onClauseHighlight?.(clause.clauseNumber);
      }
    }

    // Detect purchase price discussion
    if (
      (lowerTranscript.includes('purchase price') ||
        lowerTranscript.includes('total price') ||
        lowerTranscript.includes('earnest money') ||
        lowerTranscript.includes('cash at close')) &&
      highlightedSection !== 'purchase-price'
    ) {
      setHighlightedSection('purchase-price');
      onClauseHighlight?.('purchase-price');
    }

    // Detect closing costs discussion
    if (
      (lowerTranscript.includes('closing costs') ||
        lowerTranscript.includes('closing cost')) &&
      highlightedSection !== 'closing-costs'
    ) {
      setHighlightedSection('closing-costs');
      onClauseHighlight?.('closing-costs');
    }

    // Detect AS-IS condition discussion
    if (
      (lowerTranscript.includes('as is') ||
        lowerTranscript.includes('as-is') ||
        lowerTranscript.includes('fixtures')) &&
      highlightedSection !== 'as-is'
    ) {
      setHighlightedSection('as-is');
      onClauseHighlight?.('as-is');
    }

    // Mark section as completed when confirmation question is asked
    if (
      lowerTranscript.includes('does that make sense') ||
      lowerTranscript.includes('any questions') ||
      lowerTranscript.includes('do you understand')
    ) {
      if (highlightedSection) {
        setCompletedSections(prev => new Set(prev).add(highlightedSection));
      }
    }
  }, [transcript, isActive, currentClause, highlightedSection, onClauseHighlight, contract.clauses]);

  if (!isActive) return null;

  const getSectionIcon = (section: string) => {
    if (completedSections.has(section)) {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
    if (highlightedSection === section) {
      return <AlertCircle className="w-4 h-4 text-yellow-400 animate-pulse" />;
    }
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Scale className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Purchase Agreement Walk-Through</h3>
              <p className="text-xs text-gray-400">Following along with the contract explanation</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {completedSections.size} / {contract.clauses.length + 3} sections completed
          </div>
        </div>

        {/* Contract Sections */}
        <div className="space-y-4">
          {/* Purchase Price Section */}
          <motion.div
            animate={{
              backgroundColor:
                highlightedSection === 'purchase-price'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : completedSections.has('purchase-price')
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(0, 0, 0, 0.2)',
              borderColor:
                highlightedSection === 'purchase-price'
                  ? 'rgba(59, 130, 246, 0.5)'
                  : completedSections.has('purchase-price')
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
            }}
            className="rounded-lg border p-4 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              {getSectionIcon('purchase-price')}
              <h4 className="font-semibold text-white">Purchase Price</h4>
            </div>
            <div className="text-sm text-gray-300 space-y-1 ml-7">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span>Total: ${contract.purchasePrice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span>Earnest Money: ${contract.purchasePrice.earnestMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span>Cash at Close: ${contract.purchasePrice.cashAtClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          {/* Closing Costs Section */}
          <motion.div
            animate={{
              backgroundColor:
                highlightedSection === 'closing-costs'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : completedSections.has('closing-costs')
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(0, 0, 0, 0.2)',
              borderColor:
                highlightedSection === 'closing-costs'
                  ? 'rgba(59, 130, 246, 0.5)'
                  : completedSections.has('closing-costs')
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
            }}
            className="rounded-lg border p-4 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              {getSectionIcon('closing-costs')}
              <h4 className="font-semibold text-white">Closing Costs</h4>
            </div>
            <p className="text-sm text-gray-300 ml-7">{contract.closingCosts.explanation}</p>
          </motion.div>

          {/* AS-IS Condition Section */}
          <motion.div
            animate={{
              backgroundColor:
                highlightedSection === 'as-is'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : completedSections.has('as-is')
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(0, 0, 0, 0.2)',
              borderColor:
                highlightedSection === 'as-is'
                  ? 'rgba(59, 130, 246, 0.5)'
                  : completedSections.has('as-is')
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
            }}
            className="rounded-lg border p-4 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              {getSectionIcon('as-is')}
              <h4 className="font-semibold text-white">AS-IS Condition</h4>
            </div>
            <p className="text-sm text-gray-300 ml-7">{contract.asIsCondition.explanation}</p>
          </motion.div>

          {/* Contract Clauses */}
          {contract.clauses.map((clause) => (
            <motion.div
              key={clause.clauseNumber}
              animate={{
                backgroundColor:
                  highlightedSection === clause.clauseNumber
                    ? 'rgba(59, 130, 246, 0.2)'
                    : completedSections.has(clause.clauseNumber)
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(0, 0, 0, 0.2)',
                borderColor:
                  highlightedSection === clause.clauseNumber
                    ? 'rgba(59, 130, 246, 0.5)'
                    : completedSections.has(clause.clauseNumber)
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(255, 255, 255, 0.1)',
              }}
              className="rounded-lg border p-4 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                {getSectionIcon(clause.clauseNumber)}
                <h4 className="font-semibold text-white">
                  Clause {clause.clauseNumber} - {clause.title}
                </h4>
              </div>
              <div className="text-sm text-gray-300 ml-7 space-y-2">
                <p className="italic">{clause.plainEnglish}</p>
                {clause.keyPoints.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                    {clause.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live Objection Tip (for Clause 17) */}
        <AnimatePresence>
          {objectionTip && objectionTip.isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/20 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-yellow-400 mb-1">
                    Live Objection Tip
                  </h4>
                  <p className="text-sm text-white leading-relaxed">
                    {objectionTip.tip}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Progress</span>
            <span>
              {completedSections.size} / {contract.clauses.length + 3} sections
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(completedSections.size / (contract.clauses.length + 3)) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
