'use client';

/**
 * Audio Player Component
 * Minimal audio player for call playback with timestamp jumping
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  recordingUrl: string | null;
  transcript?: string;
  logicGates?: Array<{
    name: string;
    passed: boolean;
    timestamp?: number;
  }>;
}

export default function AudioPlayer({
  recordingUrl,
  transcript,
  logicGates,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const jumpToTimestamp = (timestamp: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = timestamp;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!recordingUrl) {
    return (
      <div
        className="rounded-2xl p-4 border border-white/10 text-center text-gray-400 text-sm"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        No recording available
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="rounded-2xl p-4 border border-white/10"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
    >
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[#22C55E] flex items-center justify-center text-white hover:bg-[#16a34a] transition-colors"
          style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22C55E] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Logic Gate Timestamps - if available */}
      {logicGates && logicGates.some((g) => !g.passed && g.timestamp) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400 mb-2">Jump to missed steps:</div>
          <div className="flex flex-wrap gap-2">
            {logicGates.map((gate, index) => {
              if (gate.passed || !gate.timestamp) return null;
              return (
                <button
                  key={index}
                  onClick={() => jumpToTimestamp(gate.timestamp!)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-1"
                >
                  <SkipForward className="w-3 h-3" />
                  {gate.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <audio ref={audioRef} src={recordingUrl} />
    </div>
  );
}
