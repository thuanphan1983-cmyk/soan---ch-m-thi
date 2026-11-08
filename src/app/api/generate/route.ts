import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateRequest, MODEL_CONFIGS, ExamData } from '@/lib/types';
import { buildSystemPrompt, buildResponseSchema } from '@/lib/geminiPrompt';
import { formatGeminiError } from '@/lib/geminiError';
import { getGeminiApiKey } from '@/lib/apiKey';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body: GenerateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu yêu cầu gửi lên không đúng định dạng JSON.'
      }, { status: 400 });
    }

    const { inputMode, modelMode = 'standard', textPrompt, matrixText, imageBase64, imageMimeType, structure } = body;

    const apiKey = getGeminiApiKey(request, body);
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào Vercel Settings > Environment Variables hoặc bấm nút "🔑 Cài đặt API Key" trên thanh tiêu đề.'
      }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelConfig = MODEL_CONFIGS[modelMode] || MODEL_CONFIGS.standard;

    // Resolve model
    let selectedModel: string = 'gemini-2.0-flash';
    if (modelMode === 'advanced') {
      selectedModel = process.env.GEMINI_PRO_MODEL || modelConfig.model || 'gemini-1.5-pro';
    } else if (modelMode === 'economy') {
      selectedModel = process.env.GEMINI_FLASH_MODEL || modelConfig.model || 'gemini-1.5-flash';
    } else {
      selectedModel = process.env.GEMINI_MODEL || modelConfig.model || 'gemini-2.0-flash';
    }

    // Automatic safety guard: sanitize invalid or non-existent models
    if (selectedModel.includes('3.8') || selectedModel.includes('3.1') || selectedModel.includes('2.5')) {
      selectedModel = modelMode === 'advanced' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';
    }

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema() as any,
      temperature: 0.7,
      maxOutputTokens: 8192,
    };
    const systemInstruction = buildSystemPrompt(structure);

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig,
      systemInstruction,
    });

    let userPrompt = '';
    const parts: any[] = [];

    switch (inputMode) {
      case 'text':
        userPrompt = textPrompt || 'Tạo một đề kiểm tra Toán 12 tổng hợp, cấu trúc chuẩn Bộ GD&ĐT.';
        parts.push({ text: userPrompt });
        break;

      case 'matrix':
        userPrompt = `Dựa vào bảng ma trận/đặc tả sau đây để soạn đề thi Toán. Đảm bảo khớp 100% số câu, đơn vị kiến thức và mức độ nhận thức:\n\n${matrixText}`;
        parts.push({ text: userPrompt });
        break;

      case 'image':
        if (!imageBase64 || !imageMimeType) {
          return NextResponse.json({ success: false, error: 'Chưa có ảnh đầu vào hợp lệ' }, { status: 400 });
        }
        userPrompt = 'Phân tích đề thi/đề cương trong ảnh sau. Trích xuất toàn bộ nội dung và sinh đề thi tương tự (thay đổi số liệu, giữ nguyên dạng toán và mức độ khó). Đảm bảo đúng cấu trúc JSON schema.';
        parts.push(
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: userPrompt }
        );
        break;

      default:
        return NextResponse.json({ success: false, error: 'Chế độ nhập không hợp lệ' }, { status: 400 });
    }

    let result;
    try {
      result = await model.generateContent(parts);
    } catch (genError: any) {
      console.warn(`Error generating with model ${selectedModel}:`, genError?.message);
      // Fallback: if selectedModel failed, try gemini-1.5-flash as the fallback model
      const fallbackModel = selectedModel !== 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.0-flash';
      console.info(`Attempting fallback to ${fallbackModel}...`);
      try {
        const fallbackGenModel = genAI.getGenerativeModel({
          model: fallbackModel,
          generationConfig,
          systemInstruction,
        });
        result = await fallbackGenModel.generateContent(parts);
      } catch (fallbackErr: any) {
        console.error(`Fallback model ${fallbackModel} also failed:`, fallbackErr?.message);
        throw genError;
      }
    }

    const response = result.response;
    const text = response.text();

    if (!text || !text.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Mô hình AI không trả về dữ liệu. Vui lòng bấm tạo lại.'
      }, { status: 500 });
    }

    let examData: ExamData;
    try {
      examData = JSON.parse(text);
    } catch {
      // Try to clean markdown fences if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      try {
        examData = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            examData = JSON.parse(jsonMatch[0]);
          } catch {
            return NextResponse.json({
              success: false,
              error: 'Không thể phân tích dữ liệu JSON trả về từ AI. Vui lòng thử lại.'
            }, { status: 500 });
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Không tìm thấy cấu trúc JSON hợp lệ trong kết quả từ AI. Vui lòng thử lại.'
          }, { status: 500 });
        }
      }
    }

    if (!examData || !Array.isArray(examData.questions)) {
      return NextResponse.json({
        success: false,
        error: 'Cấu trúc đề thi trả về không hợp lệ (thiếu danh sách câu hỏi).'
      }, { status: 500 });
    }

    // Post-process: ensure question numbers are sequential and assign IDs
    let questionNumber = 1;
    examData.questions = examData.questions.map((q, idx) => ({
      ...q,
      id: `q-${idx + 1}`,
      number: questionNumber++,
    }));

    return NextResponse.json({ success: true, exam: examData });
  } catch (error: any) {
    console.error('Generate error:', error);
    const friendlyError = formatGeminiError(error);
    const status = error?.status === 429 ? 429 : 500;
    return NextResponse.json({
      success: false,
      error: friendlyError || error?.message || 'Lỗi xử lý tạo đề thi từ máy chủ',
    }, { status });
  }
}
