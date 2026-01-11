/**
 * Ambient Noise Hook
 * Plays quiet office background noise during calls for realism
 */

import { useEffect, useRef } from 'react';
import { getAmbientNoiseConfig } from '@/lib/vapiConfig';

/**
 * Hook to play ambient noise during active calls
 * Uses Web Audio API to generate or play background noise
 */
export function useAmbientNoise(isActive: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const config = getAmbientNoiseConfig();
    
    if (!isActive || !config.enabled) {
      // Stop ambient noise when call is not active
      if (audioContextRef.current && noiseBufferRef.current) {
        try {
          noiseBufferRef.current.stop();
          noiseBufferRef.current.disconnect();
        } catch (e) {
          // Ignore errors when stopping
        }
        noiseBufferRef.current = null;
      }
      return;
    }

    // Create audio context for ambient noise
    const initAmbientNoise = async () => {
      try {
        // Create AudioContext if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        
        // Resume audio context if suspended (required by some browsers)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Create gain node for volume control
        if (!gainNodeRef.current) {
          gainNodeRef.current = audioContext.createGain();
          gainNodeRef.current.connect(audioContext.destination);
        }

        const gainNode = gainNodeRef.current;
        gainNode.gain.value = config.volume; // 0.02 = 2% volume

        // Generate pink noise (more natural than white noise)
        const bufferSize = audioContext.sampleRate * 2; // 2 seconds of audio
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate pink noise (1/f noise)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11; // Scale down
          b6 = white * 0.115926;
        }

        // Create buffer source and loop it
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gainNode);
        source.start(0);

        noiseBufferRef.current = source;
      } catch (error) {
        console.warn('Failed to initialize ambient noise:', error);
        // Silently fail - ambient noise is optional
      }
    };

    initAmbientNoise();

    // Cleanup on unmount or when call ends
    return () => {
      if (noiseBufferRef.current) {
        try {
          noiseBufferRef.current.stop();
          noiseBufferRef.current.disconnect();
        } catch (e) {
          // Ignore errors
        }
        noiseBufferRef.current = null;
      }
    };
  }, [isActive]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);
}
