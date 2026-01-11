'use client';

/**
 * Live HUD Component
 * Shows real-time sales training metrics and Approval/Denial logic gate status
 */

import { useEffect, useState } from 'react';
import type { TranscriptionEvent, CallStatus } from '@/lib/vapi-client';
import type { PersonaConfig } from '@/lib/personas';
import {
  getCurrentStep,
  checkApprovalDenialGate,
  getPersonaConfig,
} from '@/lib/personas';

interface LiveHUDProps {
  transcript: string;
  personaMode: 'acquisition' | 'disposition';
  callStatus: CallStatus;
}

export default function LiveHUD({
  transcript,
  personaMode,
  callStatus,
}: LiveHUDProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [gateStatus, setGateStatus] = useState<'approval' | 'denial' | 'pending'>('pending');
  const [persona, setPersona] = useState<PersonaConfig | null>(null);

  useEffect(() => {
    const personaConfig = getPersonaConfig(personaMode);
    setPersona(personaConfig);
  }, [personaMode]);

  useEffect(() => {
    if (!persona || !transcript) return;

    const step = getCurrentStep(persona, transcript);
    setCurrentStep(step);

    const gate = checkApprovalDenialGate(persona, transcript);
    setGateStatus(gate);
  }, [transcript, persona]);

  if (!persona) return null;

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'active';
    return 'pending';
  };

  const getGateStatusColor = () => {
    switch (gateStatus) {
      case 'approval':
        return 'bg-green-500 text-white';
      case 'denial':
        return 'bg-red-500 text-white';
      default:
        return 'bg-yellow-500 text-black';
    }
  };

  const getGateStatusText = () => {
    switch (gateStatus) {
      case 'approval':
        return '✓ APPROVAL GATE MET';
      case 'denial':
        return '✗ DENIAL GATE MET';
      default:
        return '⏳ PENDING';
    }
  };

  return (
    <div 
      className="fixed top-4 right-4 w-80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-4 z-50"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">Live Training HUD</h3>
        <div className="text-sm text-gray-400 mt-1">
          Mode: <span className="font-semibold capitalize">{personaMode}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Status: <span className="font-semibold capitalize">{callStatus.status}</span>
        </div>
      </div>

      {/* Approval/Denial Gate Status */}
      <div className={`mb-4 p-3 rounded-lg text-center font-bold ${getGateStatusColor()}`}>
        <div className="text-sm">{getGateStatusText()}</div>
        <div className="text-xs mt-1 opacity-90">
          {gateStatus === 'pending' && 'Complete all 8 steps to trigger gate'}
        </div>
      </div>

      {/* GOAT Framework Steps */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">GOAT Framework Steps:</h4>
        {persona.dialogueGates.map((gate) => {
          const status = getStepStatus(gate.step);
          return (
            <div
              key={gate.step}
              className={`p-2 rounded text-xs border ${
                status === 'completed'
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : status === 'active'
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-bold">Step {gate.step}:</span> {gate.name}
                </span>
                {status === 'completed' && (
                  <span className="text-green-600">✓</span>
                )}
                {status === 'active' && (
                  <span className="text-blue-600 animate-pulse">●</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Indicator */}
      {currentStep > 0 && (
        <div className="mt-4 p-2 bg-disposition/20 rounded text-xs text-disposition border border-disposition/30">
          <strong>Current Step:</strong> {persona.dialogueGates[currentStep - 1]?.name || 'N/A'}
        </div>
      )}

      {/* Transcript Preview */}
      {transcript && (
        <div className="mt-4 p-2 bg-white/5 rounded text-xs text-gray-300 max-h-32 overflow-y-auto custom-scrollbar">
          <div className="font-semibold mb-1 text-white">Recent Transcript:</div>
          <div className="text-xs opacity-75">
            {transcript.slice(-200)}...
          </div>
        </div>
      )}
    </div>
  );
}
