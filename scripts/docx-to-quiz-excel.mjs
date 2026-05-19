/**
 * Chuyển cau hỏi trăc nghiem.docx → file Excel mẫu (cùng cột upload admin)
 *
 * Chạy: npm run quiz:docx-to-excel
 * Mặc định: vat pham/mau-cau-hoi-quiz.xlsx
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { parseQuizDocx } from './lib/quiz-docx-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DOCX = path.join(ROOT, 'cau hỏi trăc nghiem.docx');
const OUT = path.join(ROOT, 'vat pham', 'mau-cau-hoi-quiz.xlsx');

const HEADERS = [
  'Câu hỏi',
  'Đáp án A',
  'Đáp án B',
  'Đáp án C',
  'Đáp án D',
  'Đáp án đúng',
  'Giải thích',
];

function main() {
  const outPath = process.argv[2] ? path.resolve(process.argv[2]) : OUT;

  const questions = parseQuizDocx(DOCX);
  if (questions.length === 0) {
    console.error('Không parse được câu hỏi nào từ docx');
    process.exit(1);
  }

  const rows = [
    HEADERS,
    ...questions.map((q) => [
      q.question,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.correctOption,
      q.explanation || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 48 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 12 },
    { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cau hoi quiz');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  XLSX.writeFile(wb, outPath);

  // Đồng bộ JSON để seed/import sau này
  const jsonPath = path.join(ROOT, 'data', 'quiz-questions.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2));

  console.log(`✓ ${questions.length} câu → ${outPath}`);
  console.log(`✓ JSON → ${jsonPath}`);
}

main();
