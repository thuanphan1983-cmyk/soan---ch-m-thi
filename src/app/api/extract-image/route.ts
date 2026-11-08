import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMimeType } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key chưa được cấu hình' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let visionModel = process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    if (visionModel.includes('2.5-pro')) visionModel = 'gemini-3.1-pro-preview';
    else if (visionModel.includes('2.5-flash')) visionModel = 'gemini-3.8-flash';

    const model = genAI.getGenerativeModel({
      model: visionModel,
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    });

    const result = await model.generateContent([
      { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
      { text: `Phân tích ảnh đề thi/đề cương Toán THPT này. Trích xuất:
1. Ma trận đề thi (nếu có): số câu theo từng mức độ (NB, TH, VD, VDC)
2. Nội dung từng câu hỏi (chuyển công thức sang LaTeX)
3. Cấu trúc đề: số câu Phần I (trắc nghiệm), Phần II (Đúng/Sai), Phần III (trả lời ngắn), Phần IV (tự luận)

Trả lời dưới dạng văn bản có cấu trúc rõ ràng, giữ nguyên mọi công thức toán học dạng LaTeX.` },
    ]);

    const extractedText = result.response.text();
    return NextResponse.json({ success: true, text: extractedText });
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi trích xuất ảnh',
    }, { status: 500 });
  }
}
