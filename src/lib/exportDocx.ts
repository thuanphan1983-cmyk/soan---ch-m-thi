import {
  Document, Packer, Paragraph, TextRun, Math as DocxMath, MathRun,
  ImageRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel, BorderStyle, convertInchesToTwip,
  Header, Footer, PageNumber, NumberFormat,
  MathFraction, MathSuperScript, MathSubScript, MathRadical,
} from 'docx';
import { saveAs } from 'file-saver';
import { ExamData, Question } from './types';

// ============================================================
// LATEX TO DOCX MATH CONVERSION
// ============================================================

interface MathComponent {
  type: 'run' | 'fraction' | 'superscript' | 'subscript' | 'radical';
  text?: string;
  children?: MathComponent[];
  numerator?: MathComponent[];
  denominator?: MathComponent[];
  base?: MathComponent[];
  superscript?: MathComponent[];
  subscript?: MathComponent[];
  radicand?: MathComponent[];
  degree?: MathComponent[];
}

function tokenizeLatex(latex: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < latex.length) {
    if (latex[i] === '\\') {
      let cmd = '\\';
      i++;
      while (i < latex.length && /[a-zA-Z]/.test(latex[i])) {
        cmd += latex[i];
        i++;
      }
      tokens.push(cmd);
    } else if (latex[i] === '{' || latex[i] === '}' || latex[i] === '^' || latex[i] === '_') {
      tokens.push(latex[i]);
      i++;
    } else if (latex[i] === ' ') {
      i++;
    } else {
      tokens.push(latex[i]);
      i++;
    }
  }
  return tokens;
}

function parseLatexGroup(tokens: string[], pos: number): { components: MathComponent[]; nextPos: number } {
  const components: MathComponent[] = [];
  let i = pos;

  // If starts with {, read until matching }
  if (tokens[i] === '{') {
    i++;
    let depth = 1;
    const groupTokens: string[] = [];
    while (i < tokens.length && depth > 0) {
      if (tokens[i] === '{') depth++;
      if (tokens[i] === '}') depth--;
      if (depth > 0) groupTokens.push(tokens[i]);
      i++;
    }
    // Parse the group tokens
    return { components: parseLatexTokens(groupTokens), nextPos: i };
  }

  // Single token
  if (i < tokens.length) {
    components.push({ type: 'run', text: tokens[i] });
    return { components, nextPos: i + 1 };
  }

  return { components, nextPos: i };
}

function parseLatexTokens(tokens: string[]): MathComponent[] {
  const components: MathComponent[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '\\frac') {
      i++;
      const num = parseLatexGroup(tokens, i);
      i = num.nextPos;
      const den = parseLatexGroup(tokens, i);
      i = den.nextPos;
      components.push({
        type: 'fraction',
        numerator: num.components,
        denominator: den.components,
      });
    } else if (token === '\\sqrt') {
      i++;
      const rad = parseLatexGroup(tokens, i);
      i = rad.nextPos;
      components.push({
        type: 'radical',
        radicand: rad.components,
      });
    } else if (token === '^') {
      i++;
      const sup = parseLatexGroup(tokens, i);
      i = sup.nextPos;
      const base = components.length > 0 ? [components.pop()!] : [{ type: 'run' as const, text: '' }];
      components.push({
        type: 'superscript',
        base,
        superscript: sup.components,
      });
    } else if (token === '_') {
      i++;
      const sub = parseLatexGroup(tokens, i);
      i = sub.nextPos;
      const base = components.length > 0 ? [components.pop()!] : [{ type: 'run' as const, text: '' }];
      components.push({
        type: 'subscript',
        base,
        subscript: sub.components,
      });
    } else if (token === '{') {
      const group = parseLatexGroup(tokens, i);
      components.push(...group.components);
      i = group.nextPos;
    } else if (token === '}') {
      i++;
    } else {
      // Map special LaTeX commands to text
      let text = token;
      if (token === '\\infty') text = '∞';
      else if (token === '\\pi') text = 'π';
      else if (token === '\\alpha') text = 'α';
      else if (token === '\\beta') text = 'β';
      else if (token === '\\gamma') text = 'γ';
      else if (token === '\\delta') text = 'δ';
      else if (token === '\\theta') text = 'θ';
      else if (token === '\\lambda') text = 'λ';
      else if (token === '\\mu') text = 'μ';
      else if (token === '\\sigma') text = 'σ';
      else if (token === '\\phi') text = 'φ';
      else if (token === '\\omega') text = 'ω';
      else if (token === '\\pm') text = '±';
      else if (token === '\\mp') text = '∓';
      else if (token === '\\times') text = '×';
      else if (token === '\\div') text = '÷';
      else if (token === '\\cdot') text = '·';
      else if (token === '\\leq' || token === '\\le') text = '≤';
      else if (token === '\\geq' || token === '\\ge') text = '≥';
      else if (token === '\\neq' || token === '\\ne') text = '≠';
      else if (token === '\\approx') text = '≈';
      else if (token === '\\equiv') text = '≡';
      else if (token === '\\in') text = '∈';
      else if (token === '\\notin') text = '∉';
      else if (token === '\\subset') text = '⊂';
      else if (token === '\\subseteq') text = '⊆';
      else if (token === '\\cup') text = '∪';
      else if (token === '\\cap') text = '∩';
      else if (token === '\\emptyset') text = '∅';
      else if (token === '\\forall') text = '∀';
      else if (token === '\\exists') text = '∃';
      else if (token === '\\Rightarrow') text = '⇒';
      else if (token === '\\Leftrightarrow') text = '⇔';
      else if (token === '\\rightarrow') text = '→';
      else if (token === '\\leftarrow') text = '←';
      else if (token === '\\int') text = '∫';
      else if (token === '\\sum') text = '∑';
      else if (token === '\\prod') text = '∏';
      else if (token === '\\lim') text = 'lim';
      else if (token === '\\sin') text = 'sin';
      else if (token === '\\cos') text = 'cos';
      else if (token === '\\tan') text = 'tan';
      else if (token === '\\log') text = 'log';
      else if (token === '\\ln') text = 'ln';
      else if (token === '\\left' || token === '\\right') { text = ''; }
      else if (token === '\\quad') text = '  ';
      else if (token === '\\,') text = ' ';
      else if (token.startsWith('\\')) text = token.substring(1);

      if (text) {
        components.push({ type: 'run', text });
      }
      i++;
    }
  }
  return components;
}

function mathComponentToDocx(comp: MathComponent): any {
  switch (comp.type) {
    case 'run':
      return new MathRun(comp.text || '');
    case 'fraction':
      return new MathFraction({
        numerator: (comp.numerator || []).map(c => mathComponentToDocx(c)),
        denominator: (comp.denominator || []).map(c => mathComponentToDocx(c)),
      });
    case 'superscript':
      return new MathSuperScript({
        children: (comp.base || []).map(c => mathComponentToDocx(c)),
        superScript: (comp.superscript || []).map(c => mathComponentToDocx(c)),
      });
    case 'subscript':
      return new MathSubScript({
        children: (comp.base || []).map(c => mathComponentToDocx(c)),
        subScript: (comp.subscript || []).map(c => mathComponentToDocx(c)),
      });
    case 'radical':
      return new MathRadical({
        children: (comp.radicand || []).map(c => mathComponentToDocx(c)),
      });
    default:
      return new MathRun(comp.text || '');
  }
}

function latexToDocxMath(latex: string): DocxMath {
  const tokens = tokenizeLatex(latex);
  const components = parseLatexTokens(tokens);
  const docxComponents = components.map(c => mathComponentToDocx(c));
  return new DocxMath({ children: docxComponents });
}

// Parse mixed text with inline LaTeX ($...$) into paragraph children
function parseTextWithMath(text: string): (TextRun | DocxMath)[] {
  const children: (TextRun | DocxMath)[] = [];
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g);

  for (const part of parts) {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const latex = part.slice(2, -2).trim();
      children.push(latexToDocxMath(latex));
    } else if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1).trim();
      children.push(latexToDocxMath(latex));
    } else if (part.trim()) {
      children.push(new TextRun({
        text: part,
        font: 'Times New Roman',
        size: 24, // 12pt
      }));
    }
  }
  return children;
}

// ============================================================
// SVG TO PNG CONVERSION (for browser)
// ============================================================

async function svgToPngBase64(svgElement: SVGElement, scale: number = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Failed to create blob')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
          URL.revokeObjectURL(url);
        };
        reader.readAsDataURL(blob);
      }, 'image/png');
    };
    img.onerror = () => { reject(new Error('Failed to load SVG')); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

// ============================================================
// DOCX GENERATION
// ============================================================

function createQuestionParagraphs(question: Question, includeAnswer: boolean, includeSolution: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Question header and content
  const questionChildren = [
    new TextRun({
      text: `Câu ${question.number}: `,
      bold: true,
      font: 'Times New Roman',
      size: 24,
    }),
    ...parseTextWithMath(question.content),
  ];

  paragraphs.push(new Paragraph({
    children: questionChildren,
    spacing: { before: 120, after: 60 },
  }));

  // Multiple choice options
  if (question.type === 'multiple_choice' && question.options) {
    // Check if options are short enough for 1-line layout
    const maxLen = Math.max(...question.options.map(o => o.content.length));
    
    if (maxLen <= 16) {
      // Single line: A. xxx    B. xxx    C. xxx    D. xxx
      const optChildren: (TextRun | DocxMath)[] = [];
      question.options.forEach((opt, i) => {
        if (i > 0) optChildren.push(new TextRun({ text: '     ', font: 'Times New Roman', size: 24 }));
        const isCorrect = includeAnswer && opt.label === question.correct_answer;
        optChildren.push(new TextRun({
          text: `${opt.label}. `,
          bold: isCorrect,
          font: 'Times New Roman',
          size: 24,
          underline: isCorrect ? { type: 'single' } : undefined,
        }));
        optChildren.push(...parseTextWithMath(opt.content));
      });
      paragraphs.push(new Paragraph({ children: optChildren, indent: { left: 360 }, spacing: { after: 60 } }));
    } else if (maxLen <= 50) {
      // Two lines: A. xxx    B. xxx \n C. xxx    D. xxx
      for (let row = 0; row < 2; row++) {
        const optChildren: (TextRun | DocxMath)[] = [];
        for (let col = 0; col < 2; col++) {
          const idx = row * 2 + col;
          if (idx >= question.options.length) break;
          const opt = question.options[idx];
          if (col > 0) optChildren.push(new TextRun({ text: '     ', font: 'Times New Roman', size: 24 }));
          const isCorrect = includeAnswer && opt.label === question.correct_answer;
          optChildren.push(new TextRun({
            text: `${opt.label}. `,
            bold: isCorrect,
            font: 'Times New Roman',
            size: 24,
            underline: isCorrect ? { type: 'single' } : undefined,
          }));
          optChildren.push(...parseTextWithMath(opt.content));
        }
        paragraphs.push(new Paragraph({ children: optChildren, indent: { left: 360 }, spacing: { after: 40 } }));
      }
    } else {
      // Each option on its own line
      question.options.forEach(opt => {
        const isCorrect = includeAnswer && opt.label === question.correct_answer;
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `${opt.label}. `,
              bold: isCorrect,
              font: 'Times New Roman',
              size: 24,
              underline: isCorrect ? { type: 'single' } : undefined,
            }),
            ...parseTextWithMath(opt.content),
          ],
          indent: { left: 360 },
          spacing: { after: 40 },
        }));
      });
    }
  }

  // True/False statements
  if (question.type === 'true_false' && question.statements) {
    question.statements.forEach(stmt => {
      const stmtChildren: (TextRun | DocxMath)[] = [
        new TextRun({
          text: `${stmt.label}) `,
          bold: true,
          font: 'Times New Roman',
          size: 24,
        }),
        ...parseTextWithMath(stmt.content),
      ];
      if (includeAnswer) {
        stmtChildren.push(new TextRun({
          text: ` → ${stmt.isTrue ? 'ĐÚNG' : 'SAI'}`,
          bold: true,
          color: stmt.isTrue ? '008000' : 'CC0000',
          font: 'Times New Roman',
          size: 24,
        }));
      }
      paragraphs.push(new Paragraph({ children: stmtChildren, indent: { left: 360 }, spacing: { after: 40 } }));
    });
  }

  // Short answer
  if (question.type === 'short_answer' && includeAnswer && question.answer_value) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Đáp án: ', bold: true, font: 'Times New Roman', size: 24, color: '0066CC' }),
        ...parseTextWithMath(question.answer_value),
      ],
      indent: { left: 360 },
      spacing: { after: 60 },
    }));
  }

  // Essay solution steps
  if (question.type === 'essay' && includeSolution && question.solution_steps) {
    question.solution_steps.forEach((step, i) => {
      paragraphs.push(new Paragraph({
        children: parseTextWithMath(step),
        indent: { left: 360 },
        spacing: { after: 40 },
      }));
    });
    if (question.score) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `(${question.score} điểm)`, italics: true, font: 'Times New Roman', size: 24 })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
      }));
    }
  }

  // Detailed solution (for answer key)
  if (includeSolution && question.detailed_solution) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Lời giải: ', bold: true, italics: true, font: 'Times New Roman', size: 24, color: '0066CC' }),
        ...parseTextWithMath(question.detailed_solution),
      ],
      spacing: { before: 60, after: 120 },
      indent: { left: 360 },
    }));
  }

  return paragraphs;
}

function createExamHeader(exam: ExamData): Paragraph[] {
  return [
    // School name
    new Paragraph({
      children: [new TextRun({
        text: exam.school || 'TRƯỜNG THPT ...',
        font: 'Times New Roman', size: 24, bold: true,
      })],
      alignment: AlignmentType.CENTER,
    }),
    // Title
    new Paragraph({
      children: [new TextRun({
        text: exam.title || 'ĐỀ KIỂM TRA',
        font: 'Times New Roman', size: 28, bold: true, allCaps: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
    }),
    // Subject & info line
    new Paragraph({
      children: [new TextRun({
        text: `Môn: ${exam.subject} – Lớp ${exam.grade} – Thời gian: ${exam.duration} phút`,
        font: 'Times New Roman', size: 24, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    // Exam code
    new Paragraph({
      children: [new TextRun({
        text: `Mã đề: ${exam.code}`,
        font: 'Times New Roman', size: 24, bold: true,
      })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    }),
  ];
}

function createPartHeader(partName: string, description: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${partName}. ${description}`,
        bold: true,
        font: 'Times New Roman',
        size: 26,
      }),
    ],
    spacing: { before: 200, after: 120 },
  });
}

// ============================================================
// MAIN EXPORT FUNCTIONS
// ============================================================

export async function exportExamDocx(exam: ExamData, svgElements?: Map<string, SVGElement>): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Header
  children.push(...createExamHeader(exam));

  // Group questions by part
  const parts = new Map<string, Question[]>();
  for (const q of exam.questions) {
    const existing = parts.get(q.part) || [];
    existing.push(q);
    parts.set(q.part, existing);
  }

  const partDescriptions: Record<string, string> = {
    'I': 'TRẮC NGHIỆM NHIỀU LỰA CHỌN (Thí sinh chọn 1 đáp án đúng)',
    'II': 'TRẮC NGHIỆM ĐÚNG/SAI (Mỗi câu gồm 4 mệnh đề, thí sinh xác định Đúng hoặc Sai)',
    'III': 'TRẮC NGHIỆM TRẢ LỜI NGẮN (Thí sinh điền kết quả số)',
    'IV': 'TỰ LUẬN (Thí sinh trình bày lời giải chi tiết)',
  };

  for (const [partKey, partQuestions] of parts) {
    children.push(createPartHeader(`Phần ${partKey}`, partDescriptions[partKey] || ''));

    for (const question of partQuestions) {
      // Add SVG images if available
      if (svgElements && (question.variation_table || question.graph_data)) {
        const svgId = `svg-q${question.number}`;
        const svgEl = svgElements.get(svgId);
        if (svgEl) {
          try {
            const pngBase64 = await svgToPngBase64(svgEl, 3);
            const imageBuffer = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
            
            children.push(...createQuestionParagraphs(question, false, false));
            children.push(new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 450, height: 250 },
                  type: 'png',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 120 },
            }));
          } catch {
            children.push(...createQuestionParagraphs(question, false, false));
          }
        } else {
          children.push(...createQuestionParagraphs(question, false, false));
        }
      } else {
        children.push(...createQuestionParagraphs(question, false, false));
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
          margin: { top: convertInchesToTwip(0.79), bottom: convertInchesToTwip(0.79), left: convertInchesToTwip(0.79), right: convertInchesToTwip(0.59) },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `De_Thi_${exam.code}.docx`);
}

export async function exportAnswerDocx(exam: ExamData, svgElements?: Map<string, SVGElement>): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Header
  children.push(new Paragraph({
    children: [new TextRun({
      text: `ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT`,
      font: 'Times New Roman', size: 28, bold: true,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({
      text: `Mã đề: ${exam.code} – ${exam.title}`,
      font: 'Times New Roman', size: 24, italics: true,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Quick answer table for Part I
  const partI = exam.questions.filter(q => q.part === 'I');
  if (partI.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'BẢNG ĐÁP ÁN PHẦN I', bold: true, font: 'Times New Roman', size: 24 })],
      spacing: { before: 120, after: 60 },
    }));

    // Create answer table
    const rows: TableRow[] = [];
    const headerCells = [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Câu', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 600, type: WidthType.DXA } }),
    ];
    const answerCells = [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ĐA', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 600, type: WidthType.DXA } }),
    ];

    for (const q of partI) {
      headerCells.push(new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `${q.number}`, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })],
        width: { size: 400, type: WidthType.DXA },
      }));
      answerCells.push(new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: q.correct_answer || '', bold: true, font: 'Times New Roman', size: 22, color: '0066CC' })], alignment: AlignmentType.CENTER })],
        width: { size: 400, type: WidthType.DXA },
      }));
    }

    rows.push(new TableRow({ children: headerCells }));
    rows.push(new TableRow({ children: answerCells }));
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Detailed solutions
  children.push(new Paragraph({
    children: [new TextRun({ text: 'HƯỚNG DẪN GIẢI CHI TIẾT', bold: true, font: 'Times New Roman', size: 26 })],
    spacing: { before: 300, after: 120 },
    alignment: AlignmentType.CENTER,
  }));

  const parts = new Map<string, Question[]>();
  for (const q of exam.questions) {
    const existing = parts.get(q.part) || [];
    existing.push(q);
    parts.set(q.part, existing);
  }

  for (const [, partQuestions] of parts) {
    for (const question of partQuestions) {
      children.push(...createQuestionParagraphs(question, true, true));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
          margin: { top: convertInchesToTwip(0.79), bottom: convertInchesToTwip(0.79), left: convertInchesToTwip(0.79), right: convertInchesToTwip(0.59) },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Dap_An_${exam.code}.docx`);
}
