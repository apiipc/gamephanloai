/** Mật khẩu mặc định khi tạo/reset tài khoản (có thể ghi đè bằng biến môi trường). */
export const DEFAULT_USER_PASSWORD =
  process.env.DEFAULT_USER_PASSWORD?.trim() || '123456';
