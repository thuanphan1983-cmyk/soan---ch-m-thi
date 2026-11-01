import { ExamStructure } from './types';

export function buildSystemPrompt(structure: ExamStructure): string {
  return `Bạn là chuyên gia soạn đề thi Toán THPT theo chương trình GDPT 2018, chuẩn Bộ GD&ĐT Việt Nam.

## QUY TẮC BẮT BUỘC:
1. Mọi công thức toán học viết bằng LaTeX: dùng $...$ cho inline, $$...$$ cho display.
2. Đáp án phải chính xác 100% - giải thử từng câu trước khi đưa vào đề.
3. Phần I: Mỗi câu có đúng 4 phương án A, B, C, D, chỉ có 1 đáp án đúng.
4. Phần II: Mỗi câu gồm 4 mệnh đề a, b, c, d. Mỗi mệnh đề rõ ràng Đúng hoặc Sai. Phân bổ mức độ NB/TH/VD/VDC theo bản đặc tả.
5. Phần III: Đáp án là một giá trị số duy nhất, rõ ràng.
6. Phần IV: Tự luận có lời giải chi tiết từng bước, có thang điểm.

## CẤU TRÚC ĐỀ YÊU CẦU:
- Phần I (Trắc nghiệm nhiều lựa chọn): ${structure.partI} câu
- Phần II (Đúng/Sai): ${structure.partII} câu (mỗi câu 4 mệnh đề)
- Phần III (Trả lời ngắn): ${structure.partIII} câu
- Phần IV (Tự luận): ${structure.partIV} câu

## QUY TẮC BẢNG BIẾN THIÊN VÀ ĐỒ THỊ:
- Khi câu hỏi liên quan đến bảng xét dấu đạo hàm hoặc bảng biến thiên, PHẢI cung cấp trường "variation_table" trong JSON với format:
  {"x_nodes": ["-\\\\infty", ...nghiệm..., "+\\\\infty"], "y_prime_signs": ["+", "0", "-", ...], "y_values": [...giá trị CĐ/CT...], "undefined_at": [...]}
- Khi câu hỏi cần đồ thị hàm số, PHẢI cung cấp trường "graph_data" với format:
  {"func_expression": "LaTeX", "func_js": "x**3 - 3*x", "x_range": [-5, 5], "y_range": [-10, 10], "critical_points": [{"x": -1, "y": 3, "label": "CĐ(-1;3)"}], "asymptotes": [...]}

## PHÂN BỔ MỨC ĐỘ NHẬN THỨC:
- NB (Nhận biết): ~30% - Nhận dạng, tái hiện kiến thức cơ bản
- TH (Thông hiểu): ~30% - Áp dụng 1-2 bước tính toán
- VD (Vận dụng): ~25% - Kết hợp nhiều bước, bài toán thực tế
- VDC (Vận dụng cao): ~15% - Bài phân hóa sâu, tối ưu hóa

## CHỦ ĐỀ TOÁN THPT (CHƯƠNG TRÌNH GDPT 2018):
Lớp 10: Mệnh đề logic, Tập hợp, Bất phương trình, Hàm số bậc 2, Lượng giác, Thống kê, Xác suất, Vector.
Lớp 11: Hàm số lượng giác, Dãy số - Cấp số, Giới hạn, Đạo hàm (cơ bản), Tổ hợp - Xác suất, Đường thẳng - Mặt phẳng.
Lớp 12: Ứng dụng đạo hàm (khảo sát hàm số, GTLN-GTNN), Nguyên hàm - Tích phân, Số phức, Hình học tọa độ không gian, Thống kê - Xác suất nâng cao.

Trả lời CHÍNH XÁC theo JSON schema được cung cấp. Không thêm bất kỳ text nào ngoài JSON.`;
}

export function buildResponseSchema() {
  return {
    type: "object" as const,
    properties: {
      code: { type: "string" as const, description: "Mã đề thi" },
      title: { type: "string" as const, description: "Tiêu đề đề thi" },
      subject: { type: "string" as const, description: "Môn thi" },
      grade: { type: "number" as const, description: "Lớp" },
      duration: { type: "number" as const, description: "Thời gian (phút)" },
      questions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            number: { type: "number" as const },
            part: { type: "string" as const, enum: ["I", "II", "III", "IV"] },
            type: { type: "string" as const, enum: ["multiple_choice", "true_false", "short_answer", "essay"] },
            cognitive_level: { type: "string" as const, enum: ["NB", "TH", "VD", "VDC"] },
            topic: { type: "string" as const },
            content: { type: "string" as const },
            options: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  label: { type: "string" as const },
                  content: { type: "string" as const },
                },
                required: ["label", "content"],
              },
            },
            correct_answer: { type: "string" as const },
            statements: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  label: { type: "string" as const },
                  content: { type: "string" as const },
                  isTrue: { type: "boolean" as const },
                  cognitive_level: { type: "string" as const },
                },
                required: ["label", "content", "isTrue"],
              },
            },
            answer_value: { type: "string" as const },
            solution_steps: { type: "array" as const, items: { type: "string" as const } },
            score: { type: "number" as const },
            variation_table: {
              type: "object" as const,
              properties: {
                x_nodes: { type: "array" as const, items: { type: "string" as const } },
                y_prime_signs: { type: "array" as const, items: { type: "string" as const } },
                y_values: { type: "array" as const, items: { type: "string" as const } },
                undefined_at: { type: "array" as const, items: { type: "string" as const } },
                func_label: { type: "string" as const },
                derivative_label: { type: "string" as const },
              },
              required: ["x_nodes", "y_prime_signs"],
            },
            graph_data: {
              type: "object" as const,
              properties: {
                func_expression: { type: "string" as const },
                func_js: { type: "string" as const },
                x_range: { type: "array" as const, items: { type: "number" as const } },
                y_range: { type: "array" as const, items: { type: "number" as const } },
                critical_points: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      x: { type: "number" as const },
                      y: { type: "number" as const },
                      label: { type: "string" as const },
                    },
                    required: ["x", "y"],
                  },
                },
                asymptotes: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      type: { type: "string" as const },
                      equation: { type: "string" as const },
                      value: { type: "number" as const },
                      slope: { type: "number" as const },
                      intercept: { type: "number" as const },
                    },
                    required: ["type", "equation"],
                  },
                },
              },
              required: ["func_expression", "func_js", "x_range", "y_range"],
            },
            detailed_solution: { type: "string" as const },
          },
          required: ["number", "part", "type", "cognitive_level", "topic", "content"],
        },
      },
    },
    required: ["code", "title", "subject", "grade", "duration", "questions"],
  };
}
