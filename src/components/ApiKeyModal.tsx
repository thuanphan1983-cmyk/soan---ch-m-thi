'use client';

import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '';
      if (stored) {
        setSavedKey(stored);
        setApiKey(stored);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('GEMINI_API_KEY');
      setSavedKey(null);
      onKeySaved('');
      setMessage('Đã xóa API key lưu cục bộ.');
      setTimeout(() => onClose(), 800);
      return;
    }

    localStorage.setItem('gemini_api_key', trimmed);
    setSavedKey(trimmed);
    onKeySaved(trimmed);
    setMessage('Đã lưu API key thành công!');
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setSavedKey(null);
    onKeySaved('');
    setMessage('Đã xóa API key khỏi trình duyệt.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base shadow">
              🔑
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Cài đặt Gemini API Key</h3>
              <p className="text-xs text-gray-500">Dùng cho Vercel & Trình duyệt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Nếu bạn chưa cài biến môi trường trên Vercel, hãy dán mã <strong className="text-gray-900">Gemini API Key</strong> của bạn vào đây. Khóa này sẽ được lưu an toàn trong trình duyệt (<code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">localStorage</code>) của bạn.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Mã API Key (AIzaSy...)</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-blue-600 hover:underline"
              >
                {showKey ? 'Ẩn' : 'Hiện'}
              </button>
            </label>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Dán mã API Key của bạn vào đây..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono transition-all"
            />
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
            <span className="text-base shrink-0">💡</span>
            <div>
              Chưa có khóa API? Bạn có thể tạo miễn phí 100% trong 1 phút tại:{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                Google AI Studio ↗
              </a>
            </div>
          </div>

          {message && (
            <div className="text-xs font-medium text-green-700 bg-green-50 p-2.5 rounded-xl border border-green-200 text-center animate-in fade-in">
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {savedKey ? (
            <button
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium"
            >
              Xóa khóa
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
              Lưu API Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
