/**
 * Làm sạch tiền tố A/B/C/D thừa trong data/quiz-questions.json
 * Chạy: node scripts/sanitize-quiz-json.mjs
 */
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('data/quiz-questions.json');

function sanitizeQuestion(text) {
  let s = String(text).trim();
  s = s.replace(/^[A-D][.):\-]\s*/iu, '');
  s = s.replace(/^[A-D]\s+(?=\p{L})/u, '');
  return s.trim();
}

const items = JSON.parse(fs.readFileSync(OUT, 'utf-8'));
let fixed = 0;
for (const q of items) {
  const before = q.question;
  q.question = sanitizeQuestion(before);
  if (q.question !== before) fixed++;
}
fs.writeFileSync(OUT, JSON.stringify(items, null, 2));
console.log(`Đã sửa ${fixed}/${items.length} câu → ${OUT}`);
console.log('Chạy: npm run db:seed -w apps/api  (hoặc script quiz:sanitize-db) để cập nhật DB');
