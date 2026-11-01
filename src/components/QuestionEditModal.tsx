'use client';

import React, { useState } from 'react';
import { Question } from '@/lib/types';
import MathRenderer from './MathRenderer';

interface QuestionEditModalProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: Question) => void;
}

export default function QuestionEditModal({
  question,
  isOpen,
  onClose,
  onSave,
}: QuestionEditModalProps) {
  const [edited, setEdited] = useState<Question>({ ...question });
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  if (!isOpen) return null;

  const handleContentChange = (content: string) => {
    setEdited(prev => ({ ...prev, content }));
  };

  const handleOptionChange = (idx: number, content: string) => {
    if (!edited.options) return;
    const newOptions = [...edited.options];
    newOptions[idx] = { ...newOptions[idx], content };
    setEdited(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectAnswerChange = (val: string) => {
    setEdited(prev => ({ ...prev, correct_answer: val }));
  };

  const handleStatementChange = (idx: number, content: string, isTrue: boolean) => {
    if (!edited.statements) return;
    const newStatements = [...edited.statements];
    newStatements[idx] = { ...newStatements[idx], content, isTrue };
    setEdited(prev => ({ ...prev, statements: newStatements }));
  };

  const handleSolutionChange = (detailed_solution: string) => {
    setEdited(prev => ({ ...prev, detailed_solution }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-blue-700">Chỉnh sửa Câu {edited.number}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
              Phần {edited.part} • Mức {edited.cognitive_level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Soạn thảo
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Xem trước
            </button>
            <button
              onClick={onClose}
              className="ml-2 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {activeTab === 'edit' ? (
            <>
              {/* Question Content */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nội dung câu hỏi (chèn công thức bằng $...$ hoặc $$...$$):
                </label>
                <textarea
                  value={edited.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Part I Options */}
              {edited.type === 'multiple_choice' && edited.options && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700">Các phương án lựa chọn:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {edited.options.map((opt, idx) => (
                      <div key={opt.label} className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-slate-50">
                        <span className="font-bold text-gray-700 w-6">{opt.label}.</span>
                        <input
                          type="text"
                          value={opt.content}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleCorrectAnswerChange(opt.label)}
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            edited.correct_answer === opt.label
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {edited.correct_answer === opt.label ? 'Đúng' : 'Chọn'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part II Statements */}
              {edited.type === 'true_false' && edited.statements && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700">Mệnh đề Đúng/Sai:</label>
                  {edited.statements.map((stmt, idx) => (
                    <div key={stmt.label} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl bg-slate-50">
                      <span className="font-bold text-gray-700 w-6">{stmt.label})</span>
                      <input
                        type="text"
                        value={stmt.content}
                        onChange={(e) => handleStatementChange(idx, e.target.value, stmt.isTrue)}
                        className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleStatementChange(idx, stmt.content, !stmt.isTrue)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          stmt.isTrue ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Part III Short Answer */}
              {edited.type === 'short_answer' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đáp án số:</label>
                  <input
                    type="text"
                    value={edited.answer_value || ''}
                    onChange={(e) => setEdited(prev => ({ ...prev, answer_value: e.target.value }))}
                    className="w-full max-w-xs p-2.5 border border-gray-300 rounded-xl text-sm font-semibold"
                  />
                </div>
              )}

              {/* Detailed Solution */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lời giải chi tiết:</label>
                <textarea
                  value={edited.detailed_solution || ''}
                  onChange={(e) => handleSolutionChange(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm leading-relaxed"
                />
              </div>
            </>
          ) : (
            /* Live Preview */
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-gray-200">
              <div className="font-serif leading-relaxed">
                <span className="font-bold">Câu {edited.number}: </span>
                <MathRenderer text={edited.content} />
              </div>

              {edited.type === 'multiple_choice' && edited.options && (
                <div className="grid grid-cols-2 gap-3 pl-4">
                  {edited.options.map(opt => (
                    <div
                      key={opt.label}
                      className={`p-2 rounded-lg border font-serif ${
                        opt.label === edited.correct_answer
                          ? 'border-green-500 bg-green-50 font-bold text-green-800'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="mr-2">{opt.label}.</span>
                      <MathRenderer text={opt.content} />
                    </div>
                  ))}
                </div>
              )}

              {edited.type === 'true_false' && edited.statements && (
                <div className="space-y-2 pl-4">
                  {edited.statements.map(stmt => (
                    <div key={stmt.label} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white">
                      <div className="font-serif">
                        <span className="font-bold mr-2">{stmt.label})</span>
                        <MathRenderer text={stmt.content} />
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded font-bold ${stmt.isTrue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {edited.detailed_solution && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 font-serif text-sm">
                  <div className="font-bold text-blue-900 mb-1">Lời giải:</div>
                  <MathRenderer text={edited.detailed_solution} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onSave(edited);
              onClose();
            }}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
