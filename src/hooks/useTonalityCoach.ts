/**
 * Tonality Coach Hook
 * Monitors audio levels and speech patterns to calculate "Mirroring" score
 * Helps reps match the pace and energy of the person they're speaking with
 */

import { useState, useEffect, useRef } from 'react';
import { useVapi } from '@/contexts/VapiContext';

interface TonalityMetrics {
  mirroringScore: number; // 0-100, how well rep matches speaker's pace/energy
  paceMatch: number; // 0-100, similarity in words per minute
  energyMatch: number; // 0-100, similarity in volume/intonation
  isInSync: boolean; // True when mirroring score > 70
  speakerPace: number; // Speaker's WPM
  repPace: number; // Rep's WPM
}

interface AudioEvent {
  timestamp: number;
  volume: number;
  isRep: boolean; // true for rep, false for speaker/AI
}

const PACE_TOLERANCE = 20; // ±20 WPM is considered "matched"
const ENERGY_TOLERANCE = 0.15; // ±15% volume difference is considered "matched"
const MIRRORING_THRESHOLD = 70; // Score above 70 = "in sync"

export function useTonalityCoach(isActive: boolean): TonalityMetrics {
  const { transcriptionHistory, isActive: vapiIsActive } = useVapi();
  const active = isActive || vapiIsActive;

  const [mirroringScore, setMirroringScore] = useState(50);
  const [paceMatch, setPaceMatch] = useState(50);
  const [energyMatch, setEnergyMatch] = useState(50);
  const [speakerPace, setSpeakerPace] = useState(0);
  const [repPace, setRepPace] = useState(0);

  const audioEventsRef = useRef<AudioEvent[]>([]);
  const speakerTranscriptRef = useRef<string>('');
  const repTranscriptRef = useRef<string>('');
  const lastSpeakerSpeechTimeRef = useRef<number>(0);
  const lastRepSpeechTimeRef = useRef<number>(0);

  // Track transcriptions to calculate WPM
  useEffect(() => {
    if (!active) {
      speakerTranscriptRef.current = '';
      repTranscriptRef.current = '';
      return;
    }

    // Separate speaker (assistant) and rep (user) transcriptions
    const speakerMessages = transcriptionHistory
      .filter((e) => e.role === 'assistant')
      .map((e) => e.transcript)
      .join(' ');

    const repMessages = transcriptionHistory
      .filter((e) => e.role === 'user')
      .map((e) => e.transcript)
      .join(' ');

    speakerTranscriptRef.current = speakerMessages;
    repTranscriptRef.current = repMessages;

    // Calculate WPM for speaker
    if (speakerMessages) {
      const speakerWordCount = speakerMessages.split(/\s+/).length;
      const speakerDuration = lastSpeakerSpeechTimeRef.current > 0
        ? (Date.now() - lastSpeakerSpeechTimeRef.current) / 1000 / 60 // minutes
        : 1; // Default to 1 minute if no previous time
      const speakerWPM = speakerWordCount / Math.max(speakerDuration, 0.1);
      setSpeakerPace(Math.round(speakerWPM));
    }

    // Calculate WPM for rep
    if (repMessages) {
      const repWordCount = repMessages.split(/\s+/).length;
      const repDuration = lastRepSpeechTimeRef.current > 0
        ? (Date.now() - lastRepSpeechTimeRef.current) / 1000 / 60
        : 1;
      const repWPM = repWordCount / Math.max(repDuration, 0.1);
      setRepPace(Math.round(repWPM));
    }
  }, [transcriptionHistory, active]);

  // Calculate pace match
  useEffect(() => {
    if (!active || speakerPace === 0 || repPace === 0) {
      setPaceMatch(50);
      return;
    }

    const paceDifference = Math.abs(speakerPace - repPace);
    const matchPercentage = Math.max(0, 100 - (paceDifference / PACE_TOLERANCE) * 100);
    setPaceMatch(Math.min(100, matchPercentage));
  }, [speakerPace, repPace, active]);

  // Calculate energy match (based on volume consistency)
  useEffect(() => {
    if (!active || audioEventsRef.current.length < 10) {
      setEnergyMatch(50);
      return;
    }

    // Separate rep and speaker audio events
    const repEvents = audioEventsRef.current.filter((e) => e.isRep);
    const speakerEvents = audioEventsRef.current.filter((e) => !e.isRep);

    if (repEvents.length === 0 || speakerEvents.length === 0) {
      setEnergyMatch(50);
      return;
    }

    // Calculate average volume for each
    const repAvgVolume = repEvents.reduce((sum, e) => sum + e.volume, 0) / repEvents.length;
    const speakerAvgVolume = speakerEvents.reduce((sum, e) => sum + e.volume, 0) / speakerEvents.length;

    // Calculate match percentage
    const volumeDifference = Math.abs(repAvgVolume - speakerAvgVolume);
    const matchPercentage = Math.max(0, 100 - (volumeDifference / ENERGY_TOLERANCE) * 100);
    setEnergyMatch(Math.min(100, matchPercentage));
  }, [audioEventsRef.current.length, active]);

  // Calculate overall mirroring score
  useEffect(() => {
    if (!active) {
      setMirroringScore(50);
      return;
    }

    // Weighted average: 60% pace, 40% energy
    const overallScore = (paceMatch * 0.6) + (energyMatch * 0.4);
    setMirroringScore(Math.round(overallScore));
  }, [paceMatch, energyMatch, active]);

  // Simulate audio events (in production, this would come from Vapi SDK)
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      // Simulate audio level events
      // In production, these would come from Vapi's audioLevel events
      const repVolume = 0.5 + Math.random() * 0.3; // 0.5-0.8
      const speakerVolume = 0.4 + Math.random() * 0.4; // 0.4-0.8

      audioEventsRef.current.push(
        { timestamp: Date.now(), volume: repVolume, isRep: true },
        { timestamp: Date.now(), volume: speakerVolume, isRep: false }
      );

      // Keep only last 50 events
      if (audioEventsRef.current.length > 50) {
        audioEventsRef.current.shift();
      }
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [active]);

  const isInSync = mirroringScore >= MIRRORING_THRESHOLD;

  return {
    mirroringScore,
    paceMatch,
    energyMatch,
    isInSync,
    speakerPace,
    repPace,
  };
}
