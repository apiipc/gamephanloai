# Phân Loại Siêu Tốc

Web app mini game giáo dục môi trường — kéo rác vào đúng thùng, tích điểm xanh, xếp hạng lớp. Hỗ trợ nhiều người chơi và phân quyền quản trị.

## Công nghệ

- **Frontend:** React 19 + Vite + React Router
- **Backend:** NestJS + Prisma + SQLite (dev)
- **Auth:** JWT + RBAC (4 role)

## Vai trò

| Role | Mô tả |
|------|--------|
| `STUDENT` | Chơi game, xem BXH lớp |
| `TEACHER` | Xem HS lớp được gán, dashboard |
| `ORG_ADMIN` | Quản lý trường, danh mục rác, users |
| `SUPER_ADMIN` | Toàn hệ thống |

## Ảnh vật phẩm & thùng rác

Đặt sprite sheet vào thư mục `vat pham/`, rồi chạy:

```bash
npm run assets:slice   # cắt ảnh → apps/web/public/assets/
npm run db:seed        # cập nhật 33 vật phẩm vào DB
```

- `public/assets/bins/` — 3 thùng (`organic.png`, `recycle.png`, `other.png`)
  - Nguồn: `vat pham/thung rac huu co.png`, `thung tac tai che.png` (hoặc cắt giữa `thung rac.png`), `thung rac khac.png`
  - Cập nhật: `npm run assets:bins`
- `rac huu co.png`, `rac khac.png`, `rác tai che.png` = **sheet vật phẩm theo loại**, không phải thùng
- `public/assets/items/` — 33 vật phẩm, chia 3 thư mục:
  - `huu-co/` — hữu cơ (ORGANIC)
  - `tai-che/` — tái chế (RECYCLE)
  - `khac/` — khác (OTHER)
- `public/assets/items-manifest.json` — danh mục + loại rác

Thêm ảnh mới: đặt PNG vào đúng thư mục loại → `npm run assets:sync-manifest` → `npm run db:seed`

## Chạy dự án

```bash
# Cài dependencies
npm install

# Tạo DB + seed dữ liệu demo
npm run db:setup

# Chạy API + Web (http://localhost:5173)
npm run dev
```

## Tài khoản demo

Mật khẩu tất cả: **123456**

| Email | Vai trò |
|-------|---------|
| hs1@game.local | Học sinh |
| teacher@game.local | Giáo viên |
| school@game.local | Quản trị trường |
| admin@game.local | Super Admin |

## API chính

- `POST /auth/login` — Đăng nhập
- `GET /game/items` — Danh sách rác
- `POST /game/sessions/start` — Bắt đầu vòng chơi
- `POST /game/sessions/:id/answer` — Nộp đáp án (server validate)
- `POST /game/sessions/:id/finish` — Kết thúc + cộng điểm
- `GET /leaderboard/class` — BXH lớp
- `GET /admin/*` — Quản trị (theo role)

## Cấu trúc

```
apps/api/     NestJS + Prisma
apps/web/     React UI
```

## Production

Đổi `DATABASE_URL` sang PostgreSQL trong `apps/api/.env`, chạy `prisma migrate deploy`, đổi `JWT_SECRET` mạnh.
