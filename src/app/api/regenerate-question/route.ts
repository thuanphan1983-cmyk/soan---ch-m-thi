import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question } from '@/lib/types';
import { formatGeminiError } from '@/lib/geminiError';
import { getGeminiApiKey } from '@/lib/apiKey';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu gửi lên không đúng định dạng JSON.'
      }, { status: 400 });
    }

    const { question, grade = 12 } = body;
    if (!question) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin câu hỏi cần đổi' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey(request, body);
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào Vercel Settings > Environment Variables hoặc nhập trực tiếp trên giao diện web.'
      }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let regenModel = process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    if (regenModel.includes('3.8') || regenModel.includes('3.1') || regenModel.includes('2.5')) {
      regenModel = 'gemini-2.0-flash';
    }

    const model = genAI.getGenerativeModel({
      model: regenModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    });

    const prompt = `Bạn là chuyên gia soạn đề Toán THPT chuẩn Bộ GD&ĐT (chương trình GDPT 2018).
Hãy tạo một câu hỏi MỚI hoàn toàn tương đương (cùng dạng toán, cùng chủ đề, cùng mức độ nhận thức, cùng phần) để thay thế câu hỏi sau:

- Lớp: ${grade}
- Phần: ${question.part}
- Loại câu: ${question.type}
- Mức độ: ${question.cognitive_level}
- Chủ đề: ${question.topic}
- Nội dung câu cũ: ${question.content}

YÊU CẦU BẮT BUỘC:
1. Đổi toàn bộ số liệu, hàm số hoặc ngữ cảnh, giữ nguyên độ khó và phương pháp giải.
2. Công thức toán học định dạng LaTeX bằng $...$ hoặc $$...$$.
3. Đáp án phải chính xác 100%.
4. Trả về đúng định dạng JSON câu hỏi đơn lẻ (không có mảng bọc ngoài) gồm các trường:
{
  "number": ${question.number},
  "part": "${question.part}",
  "type": "${question.type}",
  "cognitive_level": "${question.cognitive_level}",
  "topic": "${question.topic}",
  "content": "...",
  "options": [ {"label": "A", "content": "..."}, {"label": "B", "content": "..."}, {"label": "C", "content": "..."}, {"label": "D", "content": "..."} ],
  "correct_answer": "A",
  "statements": [ {"label": "a", "content": "...", "isTrue": true}, {"label": "b", "content": "...", "isTrue": false}, {"label": "c", "content": "...", "isTrue": true}, {"label": "d", "content": "...", "isTrue": false} ],
  "answer_value": "...",
  "variation_table": { "x_nodes": [...], "y_prime_signs": [...], "y_values": [...] },
  "graph_data": { "func_expression": "...", "func_js": "...", "x_range": [-5,5], "y_range": [-10,10] },
  "detailed_solution": "..."
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let newQuestion: Question;
    try {
      newQuestion = JSON.parse(text);
    } catch {
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          newQuestion = JSON.parse(match[0]);
        } catch {
          return NextResponse.json({ success: false, error: 'Không thể phân tích dữ liệu JSON câu hỏi mới' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ success: false, error: 'Không thể phân tích dữ liệu AI trả về' }, { status: 500 });
      }
    }

    newQuestion.id = question.id || `q-${question.number}`;
    newQuestion.number = question.number;
    newQuestion.part = question.part;
    newQuestion.type = question.type;

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    const friendlyError = formatGeminiError(error);
    const status = error?.status === 429 ? 429 : 500;
    return NextResponse.json({
      success: false,
      error: friendlyError || error?.message || 'Lỗi đổi câu hỏi từ máy chủ',
    }, { status });
  }
}
