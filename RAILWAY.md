# Deploy API lên Railway

Frontend giữ trên **Vercel** (`apps/web`). API + database trên **Railway** (`apps/api`).

## 1. Tạo project Railway

1. https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Chọn repo `apiipc/gamephanloai`
3. **Add service** → **PostgreSQL** (database)
4. Service **API**: Settings → **Root Directory** = `apps/api`

## 2. Biến môi trường (service API)

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference từ plugin Postgres) |
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài (production) |
| `FRONTEND_URL` | URL Vercel, vd. `https://gamephanloai.vercel.app` |
| `PORT` | Railway tự gán — không cần set |

## 3. Build & Start (tự động qua `railway.toml`)

- **Build:** `prisma generate` + `nest build` + `prisma db push`
- **Start:** `node dist/src/main.js`

Hoặc trong Railway UI (nếu không đọc `railway.toml`):

- Build Command: `npm run build:railway && npx prisma db push`
- Start Command: `npm run start`

## 4. Seed dữ liệu demo (chạy 1 lần)

Railway → service API → **Shell** hoặc CLI:

```bash
npm run db:seed
```

Tài khoản: `hs1@game.local` / `admin@game.local` — mật khẩu `123456`

## 5. Nối Vercel ↔ Railway

Vercel → Project web → **Environment Variables**:

| Name | Value |
|------|--------|
| `VITE_API_URL` | URL public Railway API, vd. `https://xxx.up.railway.app` |

**Redeploy** Vercel sau khi thêm biến.

Railway → API → **Settings** → **Networking** → **Generate Domain** để có URL HTTPS.

## 6. Dev local sau khi đổi Postgres

```bash
cp apps/api/.env.example apps/api/.env
# Sửa DATABASE_URL (Neon free / Docker / copy từ Railway)
npm install
npm run db:setup -w apps/api   # hoặc từ root: npm run db:setup
npm run dev
```

SQLite (`file:./dev.db`) không còn dùng — schema đã chuyển **PostgreSQL**.

## Lưu ý

- **Upload ảnh rác mới** trên admin: filesystem Railway có thể **mất sau redeploy** — ảnh seed trong `apps/web/public/assets` vẫn ổn.
- CORS: API chỉ cho phép origin trong `FRONTEND_URL` (production). Dev không set biến này → cho phép mọi origin.
