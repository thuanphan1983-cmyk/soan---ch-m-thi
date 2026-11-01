import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { question, grade = 12 } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key chưa được cấu hình' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    });

    const prompt = `Bạn là chuyên gia soạn đề Toán THPT chuẩn Bộ GD&ĐT (chương trình GDPT 2018).
Hãy tạo một câu hỏi MỚI hoàn toàn tương đương (cùng dạng toán, cùng chủ đề, cùng mức độ nhận thức, cùng phần) để thay thế câu hỏi sau:

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
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        newQuestion = JSON.parse(match[0]);
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
    console.error('Regenerate question error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi đổi câu hỏi' }, { status: 500 });
  }
}
