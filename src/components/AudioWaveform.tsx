'use client';

/**
 * Audio Waveform Visualization Component
 * Shows live audio activity during calls
 */

import { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  intensity?: number; // 0-1, controls bar heights
}

export default function AudioWaveform({ isActive, intensity = 0.5 }: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Initialize bars
    const initialBars = Array.from({ length: 20 }, () => Math.random() * 0.3);
    setBars(initialBars);
  }, []);

  useEffect(() => {
    if (!isActive) {
      // Fade out when inactive
      const interval = setInterval(() => {
        setBars((prev) => prev.map((bar) => Math.max(0, bar * 0.9)));
      }, 100);
      return () => clearInterval(interval);
    }

    // Animate bars when active
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => {
          // Create wave-like pattern
          const base = Math.random() * intensity;
          return Math.min(1, base + Math.random() * 0.3);
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, intensity]);

  return (
    <div className="flex items-center justify-center gap-1 h-20 w-full">
      {bars.map((height, index) => {
        const barHeight = Math.max(4, height * 60);
        const isGreen = index % 2 === 0;

        return (
          <div
            key={index}
            className="w-2 rounded-full transition-all duration-100"
            style={{ 
              height: `${barHeight}px`,
              backgroundColor: isGreen ? '#22C55E' : '#3B82F6'
            }}
          />
        );
      })}
    </div>
  );
}
