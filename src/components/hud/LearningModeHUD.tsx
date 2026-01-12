'use client';

/**
 * LearningModeHUD Component
 * Reverse HUD that tracks AI's voice against script segments
 * Highlights script lines in real-time as AI speaks them
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVapi } from '@/contexts/VapiContext';
import { BookOpen, CheckCircle2, Radio } from 'lucide-react';

interface ScriptSegment {
  gate_number: number;
  gate_name: string;
  script_text: string;
  keywords: string[];
}

interface LearningModeHUDProps {
  mode: 'acquisition' | 'disposition';
  currentGate?: number;
}

export default function LearningModeHUD({ mode, currentGate }: LearningModeHUDProps) {
  const { transcript, callStatus } = useVapi();
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [highlightedSegment, setHighlightedSegment] = useState<ScriptSegment | null>(null);
  const [completedGates, setCompletedGates] = useState<Set<number>>(new Set());

  // Fetch script segments on mount
  useEffect(() => {
    const fetchScriptSegments = async () => {
      try {
        const table = mode === 'acquisition' ? 'script_segments' : 'dispo_script_segments';
        const response = await fetch(`/api/script/text?mode=${mode}&gateNumber=all`);
        if (response.ok) {
          const data = await response.json();
          setScriptSegments(data.segments || []);
        }
      } catch (error) {
        console.error('Error fetching script segments:', error);
      }
    };

    fetchScriptSegments();
  }, [mode]);

  // Track AI's speech against script segments
  useEffect(() => {
    if (!transcript || scriptSegments.length === 0) return;

    // Handle both string and array transcript formats
    const transcriptArray = transcript as any;
    const transcriptText = typeof transcript === 'string' 
      ? transcript.toLowerCase()
      : Array.isArray(transcriptArray) && transcriptArray.length > 0
        ? (transcriptArray[transcriptArray.length - 1] as any)?.content?.toLowerCase() || ''
        : '';

    if (!transcriptText) return;

    const aiText = transcriptText;

    // Find matching script segment
    for (const segment of scriptSegments) {
      // Check if AI's speech contains keywords from this segment
      const keywords = segment.keywords || [];
      const scriptText = segment.script_text.toLowerCase();

      // Check for keyword matches or script text similarity
      const hasKeywordMatch = keywords.some(keyword => 
        aiText.includes(keyword.toLowerCase())
      );
      const hasScriptMatch = scriptText.split(' ').some(word => 
        word.length > 4 && aiText.includes(word)
      );

      if (hasKeywordMatch || hasScriptMatch) {
        setHighlightedSegment(segment);
        
        // Mark gate as completed if we've moved past it
        if (currentGate && segment.gate_number < currentGate) {
          setCompletedGates(prev => new Set([...prev, segment.gate_number]));
        }
        break;
      }
    }
  }, [transcript, scriptSegments, currentGate]);

  // Get current gate's script segment
  const currentGateSegment = scriptSegments.find(s => s.gate_number === currentGate);

  if (callStatus?.status !== 'connected') {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-lg font-bold text-white">Learning Mode: AI Script Tracker</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Radio className="w-4 h-4" />
          <span>Tracking AI's Voice</span>
        </div>
      </div>

      {/* Current Gate Highlight */}
      {currentGateSegment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 border-2 border-[#22C55E]/50"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">
              Gate {currentGateSegment.gate_number}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-300">{currentGateSegment.gate_name}</span>
          </div>
          <p className="text-sm text-white leading-relaxed">
            {currentGateSegment.script_text}
          </p>
        </motion.div>
      )}

      {/* Highlighted Segment (AI is currently speaking this) */}
      <AnimatePresence>
        {highlightedSegment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl p-4 border-2 border-[#22C55E]"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 rounded-full bg-[#22C55E]"
              />
              <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">
                AI Speaking Now
              </span>
            </div>
            <p className="text-sm text-white leading-relaxed font-medium">
              {highlightedSegment.script_text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed Gates Progress */}
      {completedGates.size > 0 && (
        <div className="rounded-xl p-4 border border-[#22C55E]/30 bg-[#22C55E]/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">
              Completed Gates
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(completedGates).map(gateNum => (
              <div
                key={gateNum}
                className="px-3 py-1 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/50"
              >
                <span className="text-xs font-semibold text-[#22C55E]">Gate {gateNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-xl p-4 border border-white/10 bg-white/5">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-white">Learning Mode:</strong> Watch how the AI (The Master Closer) follows the script perfectly. 
          Script lines will highlight in <span className="text-[#22C55E]">Goat Emerald</span> as the AI speaks them. 
          Pay attention to the exact phrases, tonality, and timing.
        </p>
      </div>
    </div>
  );
}
