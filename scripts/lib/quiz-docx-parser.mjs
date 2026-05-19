/**
 * Parse cau hỏi trăc nghiem.docx → mảng câu hỏi
 */
import fs from 'fs';
import { execSync } from 'child_process';

export function sanitizeQuestion(text) {
  let s = text.trim();
  s = s.replace(/^[A-D][.):\-]\s*/iu, '');
  s = s.replace(/^[A-D]\s+(?=\p{L})/u, '');
  return s.trim();
}

function parseBlock(block) {
  const m = block.match(
    /^(.+?\?)\s*A\.\s*(.+?)\s*B\.\s*(.+?)\s*C\.\s*(.+?)\s*D\.\s*(.+?)$/i,
  );
  if (!m) return null;
  return {
    question: sanitizeQuestion(m[1]),
    optionA: m[2].trim(),
    optionB: m[3].trim(),
    optionC: m[4].trim(),
    optionD: m[5].trim(),
  };
}

/** @param {string} docxPath */
export function parseQuizDocx(docxPath) {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`Không tìm thấy file: ${docxPath}`);
  }

  execSync('rm -rf /tmp/qz && mkdir -p /tmp/qz');
  execSync(`unzip -q "${docxPath}" -d /tmp/qz`);

  let text = fs.readFileSync('/tmp/qz/word/document.xml', 'utf8');
  text = text
    .replace(/<w:tab[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  text = text.replace(/\s+/g, ' ').trim();

  const chunks = text.split(/→\s*Đáp án\s*:\s*/i);
  const questions = [];

  for (let i = 0; i < chunks.length - 1; i++) {
    const answerMatch = chunks[i + 1].match(/^([A-D])/i);
    if (!answerMatch) continue;

    const parsed = parseBlock(chunks[i].trim());
    if (!parsed) continue;

    questions.push({
      ...parsed,
      correctOption: answerMatch[1].toUpperCase(),
      explanation: '',
    });
    i++;
  }

  return questions;
}
