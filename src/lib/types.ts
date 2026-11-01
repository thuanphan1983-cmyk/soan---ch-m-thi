// ============================================================
// HỆ THỐNG SOẠN ĐỀ TOÁN THPT - TYPE DEFINITIONS
// ============================================================

// --- Model Configuration ---
export type GeminiModel = 
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-pro';

export type ModelMode = 'economy' | 'standard' | 'advanced';

export interface ModelConfig {
  mode: ModelMode;
  model: GeminiModel;
  label: string;
  description: string;
  icon: string;
}

export const MODEL_CONFIGS: Record<ModelMode, ModelConfig> = {
  economy: {
    mode: 'economy',
    model: 'gemini-2.5-flash-lite',
    label: 'Siêu Tiết Kiệm',
    description: 'Flash-Lite: Tạo đề cơ bản, trích xuất ma trận',
    icon: '⚡',
  },
  standard: {
    mode: 'standard',
    model: 'gemini-2.5-flash',
    label: 'Tiêu Chuẩn',
    description: 'Flash: Cân bằng chất lượng và chi phí',
    icon: '🔥',
  },
  advanced: {
    mode: 'advanced',
    model: 'gemini-2.5-pro',
    label: 'Chuyên Sâu',
    description: 'Pro: Giải chi tiết, câu VDC phức tạp',
    icon: '🧠',
  },
};

// --- Input Types ---
export type InputMode = 'text' | 'matrix' | 'image';

export interface ExamStructure {
  partI: number;    // Trắc nghiệm 4 lựa chọn
  partII: number;   // Đúng/Sai (mỗi câu 4 mệnh đề)
  partIII: number;  // Trả lời ngắn
  partIV: number;   // Tự luận
}

export interface GenerateRequest {
  inputMode: InputMode;
  modelMode: ModelMode;
  textPrompt?: string;
  matrixText?: string;
  imageBase64?: string;
  imageMimeType?: string;
  structure: ExamStructure;
  examCode?: string;
  subject?: string;
  duration?: number;
  grade?: number;
}

// --- Variation Table Data ---
export interface VariationTableData {
  x_nodes: string[];
  y_prime_signs: string[];
  y_values?: string[];
  undefined_at?: string[];
  func_label?: string;       // e.g. "y" or "f(x)"
  derivative_label?: string; // e.g. "y'" or "f'(x)"
}

// --- Graph Data ---
export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}

export interface Asymptote {
  type: 'vertical' | 'horizontal' | 'oblique';
  equation: string;
  value?: number;
  slope?: number;
  intercept?: number;
}

export interface GraphData {
  func_expression: string;       // LaTeX expression
  func_js: string;               // JavaScript evaluable expression e.g. "x**3 - 3*x + 1"
  x_range: [number, number];
  y_range: [number, number];
  critical_points?: GraphPoint[];
  inflection_points?: GraphPoint[];
  intercepts?: GraphPoint[];
  asymptotes?: Asymptote[];
  discontinuities?: number[];
}

// --- Question Types ---
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export interface MultipleChoiceOption {
  label: string;  // A, B, C, D
  content: string; // LaTeX content
}

export interface TrueFalseStatement {
  label: string;  // a, b, c, d
  content: string;
  isTrue: boolean;
  cognitive_level?: CognitiveLevel;
}

export interface Question {
  id: string;
  number: number;
  part: 'I' | 'II' | 'III' | 'IV';
  type: QuestionType;
  cognitive_level: CognitiveLevel;
  topic: string;
  content: string;  // LaTeX formatted question text
  
  // For multiple choice
  options?: MultipleChoiceOption[];
  correct_answer?: string;
  
  // For true/false
  statements?: TrueFalseStatement[];
  
  // For short answer
  answer_value?: string;
  
  // For essay
  solution_steps?: string[];
  score?: number;
  
  // Visual elements
  variation_table?: VariationTableData;
  graph_data?: GraphData;
  
  // Detailed solution
  detailed_solution?: string;
}

// --- Exam ---
export interface ExamData {
  code: string;
  title: string;
  subject: string;
  grade: number;
  duration: number;
  school?: string;
  semester?: string;
  academic_year?: string;
  questions: Question[];
}

// --- API Response ---
export interface GenerateResponse {
  success: boolean;
  exam?: ExamData;
  error?: string;
}
