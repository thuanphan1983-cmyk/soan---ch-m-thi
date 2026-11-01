'use client';

import React, { useState, useCallback } from 'react';
import { ExamData, ExamStructure, ModelMode, InputMode, GenerateResponse } from '@/lib/types';
import ModelSelector from '@/components/ModelSelector';
import InputTabs from '@/components/InputTabs';
import ExamStructureConfig from '@/components/ExamStructureConfig';
import ExamPreview from '@/components/ExamPreview';

export default function HomePage() {
  // --- State ---
  const [modelMode, setModelMode] = useState<ModelMode>('standard');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textPrompt, setTextPrompt] = useState('');
  const [matrixText, setMatrixText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const [structure, setStructure] = useState<ExamStructure>({
    partI: 12,
    partII: 4,
    partIII: 6,
    partIV: 0,
  });
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Handlers ---
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMode,
          modelMode,
          textPrompt: inputMode === 'text' ? textPrompt : undefined,
          matrixText: inputMode === 'matrix' ? matrixText : undefined,
          imageBase64: inputMode === 'image' ? imageBase64 : undefined,
          imageMimeType: inputMode === 'image' ? imageMimeType : undefined,
          structure,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (data.success && data.exam) {
        setExamData(data.exam);
      } else {
        setError(data.error || 'Đã xảy ra lỗi không xác định.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [inputMode, modelMode, textPrompt, matrixText, imageBase64, imageMimeType, structure]);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setImageBase64(base64);
    setImageMimeType(mimeType);
  }, []);

  return (
    <div className="min-h-screen">
      {/* === HEADER === */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-bold">Σ</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Soạn Đề Toán THPT</h1>
                <p className="text-xs text-gray-500">Chuẩn Bộ GD&ĐT • GDPT 2018</p>
              </div>
            </div>
            <ModelSelector value={modelMode} onChange={setModelMode} />
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: Input */}
          <div className="space-y-5">
            {/* Input Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nguồn đầu vào
                </h2>
              </div>
              <InputTabs
                inputMode={inputMode}
                onModeChange={setInputMode}
                textPrompt={textPrompt}
                onTextChange={setTextPrompt}
                matrixText={matrixText}
                onMatrixChange={setMatrixText}
                onImageUpload={handleImageUpload}
                imageBase64={imageBase64}
              />
            </div>

            {/* Exam Structure Config */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  Cấu trúc đề thi
                </h2>
              </div>
              <ExamStructureConfig value={structure} onChange={setStructure} />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-3
                ${isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  <span>Đang tạo đề thi...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <span>Tạo Đề Thi bằng AI</span>
                </>
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Lỗi tạo đề</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ExamPreview examData={examData} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* === FOOTER === */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            Hệ Thống Soạn Đề Toán THPT Chuẩn Bộ GD&ĐT • Powered by Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
