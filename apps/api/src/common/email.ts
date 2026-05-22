/** Chuẩn hóa email trước khi lưu DB / đăng nhập */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Kiểm tra email cơ bản (không dùng validator quá chặt) */
export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
