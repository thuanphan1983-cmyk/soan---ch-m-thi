'use client';

import React from 'react';
import { ModelMode, MODEL_CONFIGS } from '@/lib/types';

interface ModelSelectorProps {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const modes: ModelMode[] = ['economy', 'standard', 'advanced'];

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      {modes.map((mode) => {
        const config = MODEL_CONFIGS[mode];
        const isActive = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            title={`${config.label}: ${config.description}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${isActive
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <span className="text-sm">{config.icon}</span>
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
