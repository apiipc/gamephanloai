/**
 * Đọc cau hỏi trăc nghiem.docx → data/quiz-questions.json
 * (Excel: npm run quiz:docx-to-excel)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseQuizDocx } from './lib/quiz-docx-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCX = path.join(ROOT, 'cau hỏi trăc nghiem.docx');
const OUT = path.join(ROOT, 'data', 'quiz-questions.json');

const questions = parseQuizDocx(DOCX);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(questions, null, 2));
console.log(`Parsed ${questions.length} questions → ${OUT}`);
