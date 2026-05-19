import * as XLSX from 'xlsx';
import { sanitizeQuizQuestion } from './sanitizeQuestion';

export interface QuizImportRow {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
}

const TEMPLATE_HEADERS = [
  'Câu hỏi',
  'Đáp án A',
  'Đáp án B',
  'Đáp án C',
  'Đáp án D',
  'Đáp án đúng',
  'Giải thích',
] as const;

const SAMPLE_ROW = [
  'Vỏ hộp sữa sau khi uống nên bỏ vào đâu?',
  'Rác hữu cơ',
  'Rác tái chế',
  'Rác nguy hại',
  'Rác khác',
  'B',
  'Vỏ hộp sữa thuộc nhóm tái chế (Tetra Pak)',
];

function norm(s: unknown): string {
  return String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd') // «Đáp án» → dap an (không phải đap an)
    .toLowerCase();
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Đọc file Excel → danh sách câu hỏi cho API import */
export async function parseQuizExcel(file: File): Promise<QuizImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('File Excel không có sheet nào');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) throw new Error('Sheet trống — hãy thêm ít nhất một câu hỏi');

  const out: QuizImportRow[] = [];

  for (const raw of rows) {
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      mapped[norm(k)] = v;
    }

    const question = cell(mapped, 'cau hoi', 'question');
    const optionA = cell(mapped, 'dap an a', 'optiona', 'option a');
    const optionB = cell(mapped, 'dap an b', 'optionb', 'option b');
    const optionC = cell(mapped, 'dap an c', 'optionc', 'option c');
    const optionD = cell(mapped, 'dap an d', 'optiond', 'option d');
    let correctOption = cell(mapped, 'dap an dung', 'correctoption', 'correct option', 'dung');
    const explanation = cell(mapped, 'giai thich', 'explanation') || undefined;

    if (!question && !optionA) continue;

    if (!question || !optionA || !optionB || !optionC || !optionD) {
      throw new Error(
        `Dòng thiếu dữ liệu: "${question || '(trống)'}" — cần đủ câu hỏi và 4 đáp án A–D`,
      );
    }

    correctOption = correctOption.toUpperCase().replace(/[^A-D]/g, '');
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      throw new Error(
        `Câu "${question.slice(0, 40)}…": cột «Đáp án đúng» phải là A, B, C hoặc D`,
      );
    }

    out.push({
      question: sanitizeQuizQuestion(question),
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
    });
  }

  if (out.length === 0) {
    throw new Error('Không có dòng hợp lệ. Kiểm tra tiêu đề cột hoặc tải file mẫu.');
  }

  return out;
}

/** Tải file Excel mẫu (có 1 dòng ví dụ) */
export function downloadQuizTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    [...SAMPLE_ROW],
  ]);
  ws['!cols'] = [
    { wch: 42 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 36 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cau hoi quiz');
  XLSX.writeFile(wb, 'mau-cau-hoi-quiz.xlsx');
}
