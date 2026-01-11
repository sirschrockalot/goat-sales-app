'use client';

/**
 * Call Debrief Screen
 * Shows performance review with grade, logic gates, and AI coach feedback
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVapi } from '@/contexts/VapiContext';

interface LogicGateResult {
  name: string;
  passed: boolean;
}

export default function DebriefPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transcript, transcriptionHistory } = useVapi();

  const [callResult, setCallResult] = useState<{
    id: string;
    goat_score: number;
    logic_gates: LogicGateResult[];
    rebuttal_of_the_day: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // After call ends, the webhook processes the transcript
    // Poll for the most recent call result with retries
    const fetchLatestCall = async (retries = 5, delay = 2000) => {
      try {
        const response = await fetch('/api/calls/latest', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.goat_score !== undefined) {
            setCallResult(data);
            
            // Generate feedback based on score
            if (data.goat_score >= 90) {
              setFeedback('Excellent work! You mastered all the GOAT Framework steps. Keep this energy.');
            } else if (data.goat_score >= 80) {
              setFeedback('AI Coach: You missed the final logic gate. Try using the "Information Weapon" technique next time.');
            } else if (data.goat_score >= 70) {
              setFeedback('AI Coach: Good effort, but focus on uncovering the "Why" before discussing price.');
            } else {
              setFeedback('AI Coach: Review the GOAT Framework. Focus on setting the Approval/Denial frame from the start.');
            }
            setLoading(false);
            return; // Success, stop retrying
          }
        } else if (response.status === 404) {
          // Call not found yet, retry if we have retries left
          if (retries > 0) {
            console.log(`Call not found yet, retrying... (${retries} retries left)`);
            setTimeout(() => fetchLatestCall(retries - 1, delay), delay);
            return;
          }
        }
        
        // If we get here, either no data or out of retries
        if (retries === 0) {
          console.error('Failed to fetch call result after retries');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching call result:', error);
        // Retry on error if we have retries left
        if (retries > 0) {
          setTimeout(() => fetchLatestCall(retries - 1, delay), delay);
        } else {
          setLoading(false);
        }
      }
    };

    // Start fetching with retries
    fetchLatestCall();
  }, []);

  const getGradeFromScore = (score: number): string => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-400">Analyzing your call...</div>
        </div>
      </div>
    );
  }

  if (!callResult && !loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-red-400 mb-2">Call analysis not available</div>
          <div className="text-sm text-gray-400 mb-4">
            The call transcript may not have been processed yet. This can happen if:
          </div>
          <ul className="text-xs text-gray-500 text-left space-y-1 mb-4">
            <li>• The call was too short</li>
            <li>• No transcript was generated</li>
            <li>• The webhook is still processing</li>
          </ul>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-2xl bg-[#22C55E] text-white"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const grade = getGradeFromScore(callResult.goat_score);
  const gradeColor = getGradeColor(callResult.goat_score);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/')}
          className="mb-4 text-gray-400 active:text-white transition-colors"
        >
          ← Back to Home
        </button>
        <h1 className="text-3xl font-bold">Call Debrief</h1>
      </div>

      {/* Grade Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className={`text-8xl font-bold mb-2 ${gradeColor}`}>
          {grade}
        </div>
        <div className="text-2xl text-gray-400">{callResult.goat_score}/100</div>
      </div>

      {/* Logic Gate Checklist */}
      <div 
        className="rounded-2xl p-6 border border-white/10 mb-6"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <h2 className="text-xl font-semibold mb-4">Logic Gates</h2>
        <div className="space-y-3">
          {callResult.logic_gates.map((gate, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5"
            >
              <span className="text-sm">{gate.name}</span>
              {gate.passed ? (
                <span className="text-2xl text-green-400">✓</span>
              ) : (
                <span className="text-2xl text-red-400">✗</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Coach Feedback */}
      <div 
        className="rounded-2xl p-6 border border-white/10 mb-6"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="text-sm text-gray-400 mb-2">AI Coach Feedback</div>
        <div className="text-base">{feedback}</div>
      </div>

      {/* Rebuttal of the Day */}
      {callResult.rebuttal_of_the_day && callResult.rebuttal_of_the_day !== 'None' && (
        <div 
          className="rounded-2xl p-6 border border-[#22C55E]/30 mb-6"
          style={{ 
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
          }}
        >
          <div className="text-sm text-[#22C55E] mb-2 font-semibold">🔥 Rebuttal of the Day</div>
          <div className="text-base italic">"{callResult.rebuttal_of_the_day}"</div>
        </div>
      )}

      {/* Retry Button */}
      <button
        onClick={() => router.push('/persona-select')}
        className="w-full py-4 rounded-2xl font-bold text-lg bg-[#22C55E] text-white active:scale-[0.98] transition-all duration-200 mb-6 breathing-glow"
      >
        RETRY SCENARIO
      </button>
    </div>
  );
}
