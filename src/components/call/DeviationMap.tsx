'use client';

/**
 * Deviation Map Component
 * Visual timeline and comparison view for script adherence analysis
 */

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { DeviationAnalysis, GateDeviation } from '@/lib/analyzeDeviation';

interface DeviationMapProps {
  analysis: DeviationAnalysis;
  callDuration?: number; // Duration in seconds
  className?: string;
}

export default function DeviationMap({ analysis, callDuration = 0, className = '' }: DeviationMapProps) {
  const { gates, overallFaithfulness, criticalSkips, goldenMoment, coachingInsights } = analysis;

  // Calculate timeline segments (simplified - assumes equal distribution)
  const getTimelineSegments = () => {
    if (callDuration === 0 || gates.length === 0) {
      return gates.map((gate) => ({
        gate,
        startPercent: ((gate.gate - 1) / 5) * 100,
        widthPercent: 100 / 5,
        status: getSegmentStatus(gate),
      }));
    }

    // If we have duration, we could map gates to actual timestamps
    // For now, use equal distribution
    return gates.map((gate) => ({
      gate,
      startPercent: ((gate.gate - 1) / 5) * 100,
      widthPercent: 100 / 5,
      status: getSegmentStatus(gate),
    }));
  };

  const getSegmentStatus = (gate: GateDeviation): 'on-script' | 'paraphrased' | 'off-script' => {
    if (gate.faithfulnessScore >= 80) return 'on-script';
    if (gate.faithfulnessScore >= 60) return 'paraphrased';
    return 'off-script';
  };

  const getSegmentColor = (status: string) => {
    switch (status) {
      case 'on-script':
        return '#22C55E';
      case 'paraphrased':
        return '#EAB308';
      case 'off-script':
        return '#EF4444';
      default:
        return '#666';
    }
  };

  const timelineSegments = getTimelineSegments();
  const lowAdherenceGates = gates.filter((g) => g.faithfulnessScore < 60);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Faithfulness Score */}
      <div
        className="rounded-2xl p-6 border border-white/10"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Script Adherence</h3>
          <div
            className="text-3xl font-bold"
            style={{
              color: overallFaithfulness >= 80 ? '#22C55E' : overallFaithfulness >= 60 ? '#EAB308' : '#EF4444',
            }}
          >
            {overallFaithfulness}%
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Call Timeline</div>
          <div className="relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            {timelineSegments.map((segment, index) => (
              <motion.div
                key={segment.gate.gate}
                initial={{ width: 0 }}
                animate={{ width: `${segment.widthPercent}%` }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="absolute h-full"
                style={{
                  left: `${segment.startPercent}%`,
                  backgroundColor: getSegmentColor(segment.status),
                  boxShadow: `0 0 20px ${getSegmentColor(segment.status)}80`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Start</span>
            <span>{callDuration > 0 ? `${Math.round(callDuration / 60)}m` : 'End'}</span>
          </div>
        </div>

        {/* Gate Scores */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {gates.map((gate) => {
            const status = getSegmentStatus(gate);
            return (
              <motion.div
                key={gate.gate}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: gate.gate * 0.1 }}
                className="text-center p-2 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: getSegmentColor(status) + '40',
                }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: getSegmentColor(status) }}>
                  Gate {gate.gate}
                </div>
                <div className="text-lg font-bold" style={{ color: getSegmentColor(status) }}>
                  {gate.faithfulnessScore}%
                </div>
                {gate.isCriticalSkip && (
                  <div className="text-xs text-red-400 mt-1">⚠️ Skipped</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Critical Skips Alert */}
      {criticalSkips.length > 0 && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="rounded-2xl p-6 border border-red-500/30"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-bold text-red-400">Critical Skips Detected</h3>
          </div>
          <div className="space-y-2">
            {criticalSkips.map((skip) => (
              <div key={skip.gate} className="text-sm text-red-300">
                • <strong>Gate {skip.gate}:</strong> {skip.gateName} ({skip.faithfulnessScore}% adherence)
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Comparison View */}
      {lowAdherenceGates.length > 0 && (
        <div
          className="rounded-2xl p-6 border border-white/10"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <h3 className="text-lg font-bold text-white mb-4">Script Comparison</h3>
          <div className="space-y-6">
            {lowAdherenceGates.map((gate) => (
              <motion.div
                key={gate.gate}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: gate.gate * 0.1 }}
                className="space-y-3"
              >
                <div className="text-sm font-semibold text-gray-400">
                  Gate {gate.gate}: {gate.gateName}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Master Script */}
                  <div className="p-4 rounded-lg border border-[#22C55E]/30" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <div className="text-xs text-[#22C55E] mb-2 font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Master Script
                    </div>
                    <div className="text-sm text-white leading-relaxed italic">
                      "{gate.masterScript}"
                    </div>
                  </div>

                  {/* What Was Actually Said */}
                  <div className="p-4 rounded-lg border border-amber-500/30" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                    <div className="text-xs text-amber-400 mb-2 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      What You Said
                    </div>
                    <div className="text-sm text-white leading-relaxed">
                      {gate.actualTranscript ? (
                        <span className="italic">"{gate.actualTranscript}"</span>
                      ) : (
                        <span className="text-gray-500">No matching segment found</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coaching Insights */}
      {coachingInsights.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 border border-amber-500/30"
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.2)',
          }}
        >
          <h3 className="text-lg font-bold text-amber-400 mb-4">Script Coaching</h3>
          <div className="space-y-3">
            {coachingInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="text-sm text-white leading-relaxed flex items-start gap-3"
              >
                <span className="text-amber-400 font-bold mt-1">•</span>
                <span>{insight}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Golden Moment */}
      {goldenMoment && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="rounded-2xl p-6 border border-[#22C55E]/30"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">⭐</div>
            <h3 className="text-lg font-bold text-[#22C55E]">Golden Moment</h3>
          </div>
          <div className="text-sm text-gray-300 mb-2">
            Your best script adherence was in <strong>Gate {goldenMoment.gate}: {goldenMoment.gateName}</strong>
          </div>
          <div className="text-sm text-white italic p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            "{goldenMoment.transcript}"
          </div>
          <div className="text-xs text-[#22C55E] mt-2">
            {Math.round(goldenMoment.similarity * 100)}% similarity to master script
          </div>
        </motion.div>
      )}
    </div>
  );
}
