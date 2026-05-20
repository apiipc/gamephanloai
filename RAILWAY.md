# Deploy toàn bộ lên Railway

Một project Railway gồm **3 phần**: PostgreSQL + API + Web.

```text
[PostgreSQL]  ←  DATABASE_URL
      ↓
[API apps/api]  ←  NestJS :PORT
      ↑  VITE_API_URL (build web)
[Web apps/web]  ←  React static :PORT  ← người chơi mở URL này
```

Repo: https://github.com/apiipc/gamephanloai

**Project ID (Railway):** `1323cca9-cdce-4444-b158-f6f7c903a453` — lưu trong `.railway/project.json`

---

## ⚠️ Token & bảo mật

- **Project Token** (Settings → Tokens): chỉ dùng trên máy bạn / CI — đặt `export RAILWAY_TOKEN=...` — **không** gửi token trong chat, không commit Git.
- Token chỉ hiện **một lần** khi tạo. Nếu đã lộ → **xóa token cũ** → tạo token mới.
- Token **không** thay được việc tạo Postgres + service trên dashboard lần đầu (đặc biệt khi Railway báo *Deploys paused*).

CLI đầy đủ: `npx @railway/cli login` (đăng nhập tài khoản) rồi chạy `./scripts/railway-link.sh`

---

## Bước 1 — Tạo project

1. https://railway.app → đăng nhập → **New Project**
2. **Deploy from GitHub repo** → chọn `gamephanloai`
3. **Add service** → **Database** → **PostgreSQL**

---

## Bước 2 — Service **API**

1. **Add service** → chọn cùng repo `gamephanloai` (service thứ 2)
2. Đặt tên service: **`api`**
3. **Settings** → **Root Directory** = `apps/api`
4. **Variables**:

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Chuỗi bí mật dài (tự đặt) |
| `FRONTEND_URL` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` *(sau khi có service web)* |

5. **Networking** → **Generate Domain**

Build/start: `apps/api/railway.toml`

---

## Bước 3 — Service **Web** (giao diện game)

1. **Add service** → cùng repo
2. Đặt tên: **`web`**
3. **Root Directory** = `apps/web`
4. **Variables**:

| Biến | Giá trị |
|------|---------|
| `VITE_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` |

5. **Networking** → **Generate Domain** → **đây là link game**
6. Service **api** → cập nhật `FRONTEND_URL` → **Redeploy API**

Build/start: `apps/web/railway.toml`

---

## Bước 4 — Seed (một lần)

Service **api** → **Shell**:

```bash
npm run db:seed
```

Mật khẩu demo: **123456** — `hs1@game.local`, `admin@game.local`, …

---

## Bước 5 — Kiểm tra

Mở URL **web** → đăng nhập → chơi thử.

---

## Dev local

```bash
npm install
cp apps/api/.env.example apps/api/.env
# DATABASE_URL = Postgres (Railway / Docker / Neon)
npm run db:setup
npm run dev
```

---

## Lưu ý

| Mục | Ghi chú |
|-----|---------|
| Không cần Vercel | Web + API + DB đều trên Railway |
| Tên service | `api` và `web` để biến `${{api...}}` / `${{web...}}` hoạt động |
| Upload ảnh admin | Có thể mất khi redeploy API; ảnh seed trong repo vẫn OK |
