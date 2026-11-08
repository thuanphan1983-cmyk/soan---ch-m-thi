'use client';

import React, { useState, useRef } from 'react';
import { ExamData, Question } from '@/lib/types';
import MathRenderer from './MathRenderer';
import VariationTableSVG from './VariationTableSVG';
import FunctionGraphSVG from './FunctionGraphSVG';
import QuestionEditModal from './QuestionEditModal';
import { exportExamDocx, exportAnswerDocx } from '@/lib/exportDocx';

interface ExamPreviewProps {
  examData: ExamData | null;
  isLoading: boolean;
}

export default function ExamPreview({ examData: initialExam, isLoading }: ExamPreviewProps) {
  const [exam, setExam] = useState<ExamData | null>(initialExam);
  const [viewMode, setViewMode] = useState<'exam' | 'solutions'>('exam');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isExportingExam, setIsExportingExam] = useState(false);
  const [isExportingAnswers, setIsExportingAnswers] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    setExam(initialExam);
  }, [initialExam]);

  // Handle single question update from modal
  const handleSaveQuestion = (updated: Question) => {
    if (!exam) return;
    const updatedQuestions = exam.questions.map(q => q.id === updated.id ? updated : q);
    setExam({ ...exam, questions: updatedQuestions });
  };

  // Handle regenerate single question
  const handleRegenerateQuestion = async (question: Question) => {
    if (!exam) return;
    setRegeneratingId(question.id);
    try {
      const storedKey = typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '') : '';
      const res = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedKey ? { 'x-api-key': storedKey } : {})
        },
        body: JSON.stringify({ question, grade: exam.grade, apiKey: storedKey || undefined }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Máy chủ phản hồi định dạng không hợp lệ');
      }
      if (!res.ok || !data.success) {
        throw new Error(data?.error || data?.message || 'Không thể đổi câu hỏi.');
      }
      if (data.question) {
        const updatedQuestions = exam.questions.map(q => q.id === question.id ? data.question : q);
        setExam({ ...exam, questions: updatedQuestions });
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi đổi câu hỏi.');
    } finally {
      setRegeneratingId(null);
    }
  };

  // Collect all SVGs in preview container
  const collectSVGs = (): Map<string, SVGElement> => {
    const map = new Map<string, SVGElement>();
    if (!previewContainerRef.current) return map;
    const svgs = previewContainerRef.current.querySelectorAll('svg');
    svgs.forEach((svg) => {
      if (svg.id) {
        map.set(svg.id, svg);
      }
    });
    return map;
  };

  // Export handlers
  const handleExportExam = async () => {
    if (!exam) return;
    setIsExportingExam(true);
    try {
      const svgMap = collectSVGs();
      await exportExamDocx(exam, svgMap);
    } catch (e: any) {
      alert('Lỗi khi xuất Word: ' + e.message);
    } finally {
      setIsExportingExam(false);
    }
  };

  const handleExportAnswers = async () => {
    if (!exam) return;
    setIsExportingAnswers(true);
    try {
      const svgMap = collectSVGs();
      await exportAnswerDocx(exam, svgMap);
    } catch (e: any) {
      alert('Lỗi khi xuất Word: ' + e.message);
    } finally {
      setIsExportingAnswers(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <h3 className="text-lg font-bold text-gray-800">Gemini đang biên soạn đề thi...</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Hệ thống đang thẩm định tính chính xác toán học, dựng bảng biến thiên và đồ thị theo chuẩn Bộ GD&ĐT.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!exam) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
        <div className="py-16 space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-serif">
            ∫dx
          </div>
          <h3 className="text-lg font-bold text-gray-800">Chưa có đề thi nào</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Chọn nguồn đầu vào bên trái (Mô tả, Bảng đặc tả hoặc Ảnh chụp) và nhấn &quot;Tạo Đề Thi bằng AI&quot; để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  // Group questions by part
  const partMap: Record<string, Question[]> = { 'I': [], 'II': [], 'III': [], 'IV': [] };
  exam.questions.forEach(q => {
    if (partMap[q.part]) partMap[q.part].push(q);
  });

  const partNames: Record<string, string> = {
    'I': 'PHẦN I: CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
    'II': 'PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG/SAI',
    'III': 'PHẦN III: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN',
    'IV': 'PHẦN IV: CÂU HỎI TỰ LUẬN',
  };

  const getCognitiveBadge = (level: string) => {
    switch (level) {
      case 'NB':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">Nhận biết</span>;
      case 'TH':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800">Thông hiểu</span>;
      case 'VD':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">Vận dụng</span>;
      case 'VDC':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">Vận dụng cao</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Top action toolbar */}
      <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 backdrop-blur-md">
        {/* View toggle */}
        <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('exam')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'exam' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📄 Xem Đề Thi
          </button>
          <button
            onClick={() => setViewMode('solutions')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'solutions' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💡 Xem Đáp Án & Lời Giải
          </button>
        </div>

        {/* 2 Clear Word Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExam}
            disabled={isExportingExam}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isExportingExam ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Xuất Đề Thi (.docx)
          </button>

          <button
            onClick={handleExportAnswers}
            disabled={isExportingAnswers}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isExportingAnswers ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
            Xuất Đáp Án & Lời Giải (.docx)
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        ref={previewContainerRef}
        className="p-6 overflow-y-auto max-h-[calc(100vh-14rem)] space-y-8 font-serif leading-relaxed text-gray-900"
      >
        {/* Exam Official Header */}
        <div className="border-b-2 border-gray-900 pb-5 text-center space-y-1">
          <div className="flex justify-between items-start text-xs font-sans text-gray-500 uppercase tracking-wider mb-2">
            <span>SỞ GIÁO DỤC VÀ ĐÀO TẠO</span>
            <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">MÃ ĐỀ: {exam.code}</span>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900">{exam.title}</h2>
          <p className="text-sm italic text-gray-700">
            Môn: {exam.subject} • Lớp {exam.grade} • Thời gian làm bài: {exam.duration} phút
          </p>
        </div>

        {/* Loop through Parts */}
        {(['I', 'II', 'III', 'IV'] as const).map(partKey => {
          const questions = partMap[partKey];
          if (!questions || questions.length === 0) return null;

          return (
            <div key={partKey} className="space-y-6">
              {/* Part title */}
              <div className="bg-slate-100 px-4 py-2 rounded-lg border-l-4 border-blue-600">
                <h3 className="font-sans font-bold text-sm text-gray-900 uppercase">
                  {partNames[partKey]}
                </h3>
              </div>

              {/* Questions list */}
              <div className="space-y-6">
                {questions.map((q) => {
                  const isRegenerating = regeneratingId === q.id;

                  return (
                    <div
                      key={q.id || q.number}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-sm space-y-3 relative group"
                    >
                      {/* Top bar for question actions */}
                      <div className="flex items-center justify-between font-sans border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700">Câu {q.number}:</span>
                          {getCognitiveBadge(q.cognitive_level)}
                          <span className="text-[11px] text-gray-500 italic">[{q.topic}]</span>
                        </div>

                        {/* Question Action Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Sửa nội dung câu hỏi"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleRegenerateQuestion(q)}
                            disabled={isRegenerating}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                            title="Đổi câu khác cùng dạng"
                          >
                            {isRegenerating ? '⏳ Đang đổi...' : '🔄 Đổi câu khác'}
                          </button>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="text-[15px] leading-relaxed">
                        <span className="font-bold">Câu {q.number}: </span>
                        <MathRenderer text={q.content} />
                      </div>

                      {/* Variation Table SVG */}
                      {q.variation_table && (
                        <div className="my-3 flex justify-center bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto">
                          <VariationTableSVG
                            id={`svg-q${q.number}`}
                            data={q.variation_table}
                            width={560}
                          />
                        </div>
                      )}

                      {/* Function Graph SVG */}
                      {q.graph_data && (
                        <div className="my-3 flex justify-center bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto">
                          <FunctionGraphSVG
                            id={`svg-q${q.number}`}
                            data={q.graph_data}
                            width={460}
                            height={340}
                          />
                        </div>
                      )}

                      {/* Part I: Multiple Choice Options */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4 text-sm">
                          {q.options.map((opt) => {
                            const isCorrect = opt.label === q.correct_answer;
                            const showAnswer = viewMode === 'solutions';

                            return (
                              <div
                                key={opt.label}
                                className={`p-2 rounded-lg border transition-all ${
                                  showAnswer && isCorrect
                                    ? 'border-green-500 bg-green-50/80 font-bold text-green-900 shadow-sm'
                                    : 'border-gray-200 bg-slate-50/50'
                                }`}
                              >
                                <span className={`font-bold mr-2 ${showAnswer && isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                                  {opt.label}.
                                </span>
                                <MathRenderer text={opt.content} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Part II: True/False Statements */}
                      {q.type === 'true_false' && q.statements && (
                        <div className="space-y-2 pl-4 text-sm">
                          {q.statements.map((stmt) => {
                            const showAnswer = viewMode === 'solutions';

                            return (
                              <div
                                key={stmt.label}
                                className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-slate-50/50"
                              >
                                <div>
                                  <span className="font-bold mr-2 text-gray-700">{stmt.label})</span>
                                  <MathRenderer text={stmt.content} />
                                </div>
                                {showAnswer && (
                                  <span
                                    className={`font-sans text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wide ${
                                      stmt.isTrue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {stmt.isTrue ? 'Đúng' : 'Sai'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Part III: Short Answer */}
                      {q.type === 'short_answer' && viewMode === 'solutions' && q.answer_value && (
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center gap-2">
                          <span className="font-sans font-bold text-blue-900">Đáp số:</span>
                          <span className="font-bold text-blue-700">
                            <MathRenderer text={q.answer_value} />
                          </span>
                        </div>
                      )}

                      {/* Part IV: Essay solution steps */}
                      {q.type === 'essay' && viewMode === 'solutions' && q.solution_steps && (
                        <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-sm space-y-1.5">
                          <div className="font-sans font-bold text-purple-900 text-xs uppercase">Hướng dẫn chấm tự luận:</div>
                          {q.solution_steps.map((step, idx) => (
                            <div key={idx} className="pl-3 border-l-2 border-purple-300">
                              <MathRenderer text={step} />
                            </div>
                          ))}
                          {q.score && (
                            <div className="text-right text-xs italic text-purple-800">Điểm: {q.score}đ</div>
                          )}
                        </div>
                      )}

                      {/* Detailed Solution (in Solution view) */}
                      {viewMode === 'solutions' && q.detailed_solution && (
                        <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-sm space-y-1">
                          <div className="font-sans font-bold text-amber-900 text-xs flex items-center gap-1">
                            <span>💡 Lời giải chi tiết:</span>
                          </div>
                          <div className="text-gray-800 leading-relaxed pl-2">
                            <MathRenderer text={q.detailed_solution} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Question Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
}
