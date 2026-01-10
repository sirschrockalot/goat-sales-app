'use client';

/**
 * Persona Toggle Component
 * Allows switching between Acquisition and Disposition modes
 */

import { useState } from 'react';
import type { PersonaMode } from '@/lib/vapi-client';
import { getPersonaConfig } from '@/lib/personas';

interface PersonaToggleProps {
  currentMode: PersonaMode;
  onModeChange: (mode: PersonaMode) => void;
}

export default function PersonaToggle({
  currentMode,
  onModeChange,
}: PersonaToggleProps) {
  const acquisitionPersona = getPersonaConfig('acquisition');
  const dispositionPersona = getPersonaConfig('disposition');

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Select Training Mode
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acquisition Mode */}
        <button
          onClick={() => onModeChange('acquisition')}
          className={`
            p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              currentMode === 'acquisition'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800">
              {acquisitionPersona.name}
            </h4>
            {currentMode === 'acquisition' && (
              <span className="text-blue-500 text-xl">✓</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {acquisitionPersona.description}
          </p>
          <div className="text-xs text-gray-500">
            <strong>Characteristics:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {acquisitionPersona.characteristics.slice(0, 3).map((char, idx) => (
                <li key={idx}>{char}</li>
              ))}
            </ul>
          </div>
        </button>

        {/* Disposition Mode */}
        <button
          onClick={() => onModeChange('disposition')}
          className={`
            p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              currentMode === 'disposition'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800">
              {dispositionPersona.name}
            </h4>
            {currentMode === 'disposition' && (
              <span className="text-blue-500 text-xl">✓</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {dispositionPersona.description}
          </p>
          <div className="text-xs text-gray-500">
            <strong>Characteristics:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {dispositionPersona.characteristics.slice(0, 3).map((char, idx) => (
                <li key={idx}>{char}</li>
              ))}
            </ul>
          </div>
        </button>
      </div>

      {/* Current Mode Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <strong>Current Mode:</strong>{' '}
        <span className="capitalize font-semibold text-blue-600">
          {currentMode}
        </span>
      </div>
    </div>
  );
}
