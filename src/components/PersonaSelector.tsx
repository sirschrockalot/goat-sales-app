'use client';

/**
 * Persona Selector Component
 * Horizontal carousel for selecting AI sparring partners
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PersonaMode } from '@/lib/vapi-client';

interface Persona {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  avatar: string;
  description: string;
}

const ACQUISITION_PERSONAS: Persona[] = [
  {
    id: 'skeptic',
    name: 'The Skeptic',
    difficulty: 'Hard',
    avatar: '🤔',
    description: 'Highly skeptical, tests your approach',
  },
  {
    id: 'busy-professional',
    name: 'The Busy Professional',
    difficulty: 'Medium',
    avatar: '👔',
    description: 'Time-constrained, needs quick value',
  },
  {
    id: 'savvy-shopper',
    name: 'The Savvy Shopper',
    difficulty: 'Easy',
    avatar: '🛒',
    description: 'Price-focused, comparison shopping',
  },
];

const DISPOSITION_PERSONAS: Persona[] = [
  {
    id: 'analyst',
    name: 'The Analyst',
    difficulty: 'Hard',
    avatar: '📊',
    description: 'Data-driven, ROI focused',
  },
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager',
    difficulty: 'Medium',
    avatar: '💼',
    description: 'Manages multiple properties',
  },
  {
    id: 'new-investor',
    name: 'New Investor',
    difficulty: 'Easy',
    avatar: '🎯',
    description: 'Learning the ropes',
  },
];

export default function PersonaSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'acquisition') as PersonaMode;
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [roleReversal, setRoleReversal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const personas = mode === 'acquisition' ? ACQUISITION_PERSONAS : DISPOSITION_PERSONAS;

  useEffect(() => {
    // Center the middle card on mount
    if (scrollRef.current) {
      const cardWidth = 120;
      const scrollPosition = cardWidth * selectedIndex - (scrollRef.current.clientWidth / 2) + (cardWidth / 2);
      scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleStartCall = async () => {
    // Request microphone permission before navigating to call
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Microphone permission granted');
      }
      
      // Navigate to live call page
      const selectedPersona = personas[selectedIndex];
      const params = new URLSearchParams({
        mode,
        persona: selectedPersona.id,
        ...(roleReversal && mode === 'acquisition' ? { roleReversal: 'true' } : {}),
      });
      router.push(`/live-call?${params.toString()}`);
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Hard':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/')}
          className="mb-4 text-gray-400 active:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold">Select Your Sparring Partner</h1>
      </div>

      {/* Persona Carousel */}
      <div className="flex-1 flex items-center justify-center">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8 px-4 w-full"
        >
          {personas.map((persona, index) => {
            const isSelected = index === selectedIndex;
            const borderColor = mode === 'acquisition' ? '#22C55E' : '#3B82F6';
            const glowColor = mode === 'acquisition' 
              ? 'rgba(34, 197, 94, 0.5)' 
              : 'rgba(59, 130, 246, 0.5)';

            return (
              <div
                key={persona.id}
                onClick={() => setSelectedIndex(index)}
                className="flex-shrink-0 w-32 h-32 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer snap-center active:scale-95"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: isSelected ? borderColor : 'rgba(255, 255, 255, 0.2)',
                  opacity: isSelected ? 1 : 0.5,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isSelected ? `0 0 20px ${glowColor}` : 'none'
                }}
              >
                <div className="text-5xl mb-2">{persona.avatar}</div>
                <div className="text-xs font-semibold text-center px-2">{persona.name}</div>
                <div className={`text-xs ${getDifficultyColor(persona.difficulty)}`}>
                  {persona.difficulty}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {personas.map((_, index) => {
            const isSelected = index === selectedIndex;
            const dotColor = mode === 'acquisition' ? '#22C55E' : '#3B82F6';
            return (
              <div
                key={index}
                className="rounded-full transition-all"
                style={{
                  width: isSelected ? '24px' : '8px',
                  height: '8px',
                  backgroundColor: isSelected ? dotColor : 'rgba(255, 255, 255, 0.2)'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Role Reversal Toggle (Acquisition Mode Only) */}
      {mode === 'acquisition' && (
        <div className="mb-4 p-4 rounded-xl border" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white mb-1">🎓 Learning Mode</div>
              <div className="text-xs text-gray-400">
                AI acts as acquisition agent • You act as seller • Learn by example
              </div>
            </div>
            <button
              onClick={() => setRoleReversal(!roleReversal)}
              className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                roleReversal ? 'bg-[#22C55E]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                  roleReversal ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Start Call Button */}
      <button
        onClick={handleStartCall}
        className="w-full py-4 rounded-2xl font-bold text-lg bg-[#22C55E] text-white active:scale-[0.98] transition-all duration-200 mb-6 breathing-glow"
      >
        {roleReversal && mode === 'acquisition' ? 'START LEARNING CALL' : 'START CALL'}
      </button>
    </div>
  );
}
