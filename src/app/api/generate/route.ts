import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GenerateRequest, MODEL_CONFIGS, ExamData } from '@/lib/types';
import { buildSystemPrompt, buildResponseSchema } from '@/lib/geminiPrompt';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { inputMode, modelMode, textPrompt, matrixText, imageBase64, imageMimeType, structure } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env.local' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelConfig = MODEL_CONFIGS[modelMode] || MODEL_CONFIGS.standard;

    // Resolve model dynamically: support GEMINI_PRO_MODEL, GEMINI_FLASH_MODEL, GEMINI_MODEL
    let selectedModel: string = modelConfig.model;
    if (modelMode === 'advanced') {
      selectedModel = process.env.GEMINI_PRO_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
    } else if (modelMode === 'economy' || modelMode === 'standard') {
      selectedModel = process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    }

    // Automatic safety guard: sanitize any deprecated gemini-2.5 models
    if (selectedModel.includes('2.5-pro')) {
      selectedModel = process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview';
    } else if (selectedModel.includes('2.5-flash')) {
      selectedModel = process.env.GEMINI_FLASH_MODEL || 'gemini-3.8-flash';
    }

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema() as any,
      temperature: 0.7,
      maxOutputTokens: 16384,
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
          return NextResponse.json({ success: false, error: 'Chưa có ảnh đầu vào' }, { status: 400 });
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
      // Fallback: if selectedModel failed with 404 or unsupported, retry with alternate modern model
      const fallbackModel = selectedModel === 'gemini-3.8-flash' ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';
      console.info(`Attempting fallback to model: ${fallbackModel}`);
      const fallbackGenModel = genAI.getGenerativeModel({
        model: fallbackModel,
        generationConfig,
        systemInstruction,
      });
      result = await fallbackGenModel.generateContent(parts);
    }
    const response = result.response;
    const text = response.text();

    let examData: ExamData;
    try {
      examData = JSON.parse(text);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ success: false, error: 'Không thể phân tích kết quả từ AI. Vui lòng thử lại.' }, { status: 500 });
      }
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
    return NextResponse.json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi tạo đề thi. Vui lòng thử lại.',
    }, { status: 500 });
  }
}
