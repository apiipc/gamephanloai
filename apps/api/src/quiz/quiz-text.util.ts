/** Bỏ nhãn A/B/C/D thừa ở đầu câu hỏi (lỗi import từ Word) */
export function sanitizeQuizQuestion(text: string): string {
  let s = text.trim();
  s = s.replace(/^[A-D][.):\-]\s*/iu, '');
  s = s.replace(/^[A-D]\s+(?=[\p{L}])/u, '');
  return s.trim();
}
