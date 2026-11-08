'use client';

import React, { useCallback, useRef, useState } from 'react';
import { InputMode } from '@/lib/types';

interface InputTabsProps {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  textPrompt: string;
  onTextChange: (text: string) => void;
  matrixText: string;
  onMatrixChange: (text: string) => void;
  onImageUpload: (base64: string, mimeType: string) => void;
  imageBase64: string | null;
}

const TABS: { mode: InputMode; label: string; icon: string }[] = [
  { mode: 'text', label: 'Mô tả yêu cầu', icon: '📝' },
  { mode: 'matrix', label: 'Ma trận / Đặc tả', icon: '📊' },
  { mode: 'image', label: 'Từ Ảnh chụp', icon: '📸' },
];

const EXAMPLE_PROMPTS = [
  'Đề kiểm tra 45 phút chương Ứng dụng đạo hàm - Toán 12, mức độ NB-TH-VD-VDC',
  'Đề thi HK1 Toán 12: Hàm số, Lũy thừa - Logarit, Nguyên hàm - Tích phân',
  'Đề kiểm tra 15 phút: Số phức, mức NB-TH, 10 câu trắc nghiệm',
  'Đề ôn thi TN THPT: Tổng hợp kiến thức lớp 12, trọng tâm hàm số và tích phân',
];

const SAMPLE_MATRIX = `| TT | Chủ đề / Đơn vị kiến thức | Nhận biết | Thông hiểu | Vận dụng | Vận dụng cao | Tổng số câu |
|:--:|:---------------------------|:---------:|:----------:|:--------:|:------------:|:-----------:|
| 1  | Ứng dụng đạo hàm khảo sát  | 2         | 2          | 1        | 1            | 6           |
| 2  | Cực trị & GTLN - GTNN      | 2         | 1          | 2        | 1            | 6           |
| 3  | Tiệm cận của đồ thị hàm số | 1         | 1          | 1        | 0            | 3           |
|    | TỔNG CỘNG                  | 5         | 4          | 4        | 2            | 15          |`;

export default function InputTabs({
  inputMode, onModeChange,
  textPrompt, onTextChange,
  matrixText, onMatrixChange,
  onImageUpload, imageBase64,
}: InputTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matrixFileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<string | null>(null);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      onImageUpload(base64, file.type);
      setExtractedPreview(null);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleMatrixFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onMatrixChange(text);
      }
    };
    reader.readAsText(file);
  }, [onMatrixChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
  }, [handleImageFile]);

  // Extract text from image via API
  const handleExtractFromImage = async () => {
    if (!imageBase64) return;
    setIsExtracting(true);
    try {
      const storedKey = typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '') : '';
      const res = await fetch('/api/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedKey ? { 'x-api-key': storedKey } : {})
        },
        body: JSON.stringify({
          imageBase64,
          imageMimeType: 'image/png',
          apiKey: storedKey || undefined,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Máy chủ phản hồi định dạng không hợp lệ');
      }
      if (!res.ok || !data.success) {
        throw new Error(data?.error || data?.message || 'Không thể trích xuất ảnh.');
      }
      if (data.text) {
        setExtractedPreview(data.text);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi trích xuất ảnh.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200 border-b-2
              ${inputMode === tab.mode
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 animate-fade-in">
        {/* TAB 1: Text description */}
        {inputMode === 'text' && (
          <div className="space-y-3">
            <textarea
              value={textPrompt}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Mô tả yêu cầu đề thi... VD: Đề kiểm tra 45 phút chương Ứng dụng đạo hàm, Toán 12, phân bổ NB 30% - TH 30% - VD 25% - VDC 15%"
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm leading-relaxed placeholder:text-gray-400"
            />
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">💡 Gợi ý nhanh:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onTextChange(prompt)}
                    className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors truncate max-w-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Matrix / Specification */}
        {inputMode === 'matrix' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Dán bảng ma trận hoặc tải file:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMatrixChange(SAMPLE_MATRIX)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Dán mẫu chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => matrixFileInputRef.current?.click()}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                >
                  📁 Chọn file
                </button>
                <input
                  ref={matrixFileInputRef}
                  type="file"
                  accept=".txt,.csv,.md"
                  onChange={(e) => e.target.files?.[0] && handleMatrixFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
            <textarea
              value={matrixText}
              onChange={(e) => onMatrixChange(e.target.value)}
              placeholder="Dán bảng ma trận / đặc tả đề thi vào đây..."
              rows={9}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-mono leading-relaxed placeholder:text-gray-400"
            />
          </div>
        )}

        {/* TAB 3: Image upload */}
        {inputMode === 'image' && (
          <div className="space-y-3">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center py-8 px-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : imageBase64
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
            >
              {imageBase64 ? (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-green-700">Ảnh đã được nạp sẵn sàng!</p>
                  <p className="text-xs text-gray-500 mt-1">Nhấn để thay thế ảnh khác</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V5.25a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Kéo thả ảnh chụp đề thi vào đây</p>
                  <p className="text-xs text-gray-500 mt-1">hoặc nhấn để chọn ảnh từ máy tính (PNG, JPG)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                className="hidden"
              />
            </div>

            {imageBase64 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleExtractFromImage}
                  disabled={isExtracting}
                  className="w-full py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Gemini Vision đang đọc ảnh...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Đọc &amp; Xem trước nội dung bóc tách từ ảnh</span>
                    </>
                  )}
                </button>

                {extractedPreview && (
                  <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap text-gray-800">
                    <div className="font-bold font-sans text-blue-800 mb-1">Kết quả bóc tách:</div>
                    {extractedPreview}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
