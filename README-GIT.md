# Phân Loại Siêu Tốc — Gói đưa lên GitHub

Thư mục này đã **loại bỏ** các phần không cần commit:

- `node_modules/`
- `dist/`, file build
- `.env` (mật khẩu, JWT secret)
- `*.db` (database local)

## Cấu trúc chính

| Thư mục / file | Nội dung |
|----------------|----------|
| `apps/web/` | Giao diện React (game, quiz, vòng quay, admin) |
| `apps/api/` | API NestJS + Prisma |
| `apps/web/public/assets/` | Ảnh game (bins, items, quiz, wheel) |
| `scripts/` | Script cắt ảnh, import quiz |
| `vat pham/` | Ảnh gốc / tài liệu thiết kế |
| `package.json` | Monorepo — chạy từ thư mục gốc |

## Đưa lên GitHub (thủ công)

1. Tạo repo mới trên https://github.com/new (không thêm README nếu upload từ đây).
2. Mở Terminal trong **thư mục này** (`phan-loai-sieu-toc-git`):

```bash
git init
git add .
git commit -m "Initial commit: Phân Loại Siêu Tốc"
git branch -M main
git remote add origin https://github.com/TEN-BAN/TEN-REPO.git
git push -u origin main
```

3. Sau khi clone trên máy khác / server:

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Sửa JWT_SECRET trong apps/api/.env
npm run db:setup
npm run dev
```

## Tài khoản demo (sau seed)

Mật khẩu: `123456`

- `hs1@game.local` — Học sinh
- `teacher@game.local` — Giáo viên
- `school@game.local` — Quản trị trường
- `admin@game.local` — Super Admin

## Lưu ý bảo mật

- **Không** upload file `.env` — chỉ dùng `.env.example`.
- Đổi `JWT_SECRET` trước khi deploy production.
