/** Bỏ nhãn A/B/C/D thừa ở đầu câu (lỗi parse từ Word: "B Một bạn bỏ pin...") */
export function sanitizeQuizQuestion(text: string): string {
  let s = text.trim();
  // "A. ..." hoặc "B) ..." hoặc "C: ..." hoặc "D " + chữ hoa
  s = s.replace(/^[A-D][.):\-]\s*/iu, '');
  s = s.replace(/^[A-D]\s+(?=[\p{L}])/u, '');
  return s.trim();
}
