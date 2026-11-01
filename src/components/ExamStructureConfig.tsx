'use client';

import React from 'react';
import { ExamStructure } from '@/lib/types';

interface ExamStructureConfigProps {
  value: ExamStructure;
  onChange: (structure: ExamStructure) => void;
}

const PARTS = [
  {
    key: 'partI' as const,
    label: 'Phần I',
    description: 'Trắc nghiệm 4 lựa chọn (A, B, C, D)',
    icon: '🔘',
    color: 'blue',
    min: 0,
    max: 30,
    defaultVal: 12,
  },
  {
    key: 'partII' as const,
    label: 'Phần II',
    description: 'Đúng/Sai (4 mệnh đề a, b, c, d)',
    icon: '✅',
    color: 'emerald',
    min: 0,
    max: 12,
    defaultVal: 4,
  },
  {
    key: 'partIII' as const,
    label: 'Phần III',
    description: 'Trả lời ngắn (Điền kết quả số)',
    icon: '✏️',
    color: 'amber',
    min: 0,
    max: 12,
    defaultVal: 6,
  },
  {
    key: 'partIV' as const,
    label: 'Phần IV',
    description: 'Tự luận (Trình bày lời giải chi tiết)',
    icon: '📐',
    color: 'purple',
    min: 0,
    max: 10,
    defaultVal: 0,
  },
];

export default function ExamStructureConfig({ value, onChange }: ExamStructureConfigProps) {
  const totalQuestions = value.partI + value.partII + value.partIII + value.partIV;
  // Phần II: mỗi câu = 4 mệnh đề (1 điểm), Phần I,III: mỗi câu 0.25 hoặc tính theo tổng
  const estimatedScore = value.partI * 0.25 + value.partII * 1 + value.partIII * 0.25 + value.partIV * 0.5;

  return (
    <div className="p-5 space-y-4">
      {PARTS.map((part) => (
        <div key={part.key} className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 w-64">
            <span className="text-lg">{part.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{part.label}</p>
              <p className="text-xs text-gray-500">{part.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => onChange({ ...value, [part.key]: Math.max(part.min, value[part.key] - 1) })}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors"
            >
              −
            </button>
            <input
              type="number"
              value={value[part.key]}
              onChange={(e) => {
                const num = Math.min(part.max, Math.max(part.min, parseInt(e.target.value) || 0));
                onChange({ ...value, [part.key]: num });
              }}
              min={part.min}
              max={part.max}
              className="w-14 h-8 text-center text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <button
              onClick={() => onChange({ ...value, [part.key]: Math.min(part.max, value[part.key] + 1) })}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors"
            >
              +
            </button>
            <span className="text-xs text-gray-400 ml-1">câu</span>
          </div>
        </div>
      ))}

      {/* Summary bar */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Tổng:</span>
            <span className="text-sm font-bold text-gray-800">{totalQuestions} câu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">≈</span>
            <span className="text-sm font-bold text-blue-600">{estimatedScore.toFixed(1)} điểm</span>
          </div>
        </div>
        <button
          onClick={() => onChange({ partI: 12, partII: 4, partIII: 6, partIV: 0 })}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Đặt lại mặc định
        </button>
      </div>
    </div>
  );
}
