# Deploy Railway — 5 bước (bạn làm trên máy)

Tôi **không** deploy trực tiếp được (cần token trên máy bạn). Đã thêm **GitHub Actions** tự deploy khi bạn cấu hình secret.

**Project ID:** `1323cca9-cdce-4444-b158-f6f7c903a453`

---

## Bước 1 — Trên Railway (dashboard)

1. Project **game** → **New** → **Database** → **PostgreSQL**
2. **New** → **GitHub Repo** → `gamephanloai` → tạo service, đặt tên **`api`**
   - Settings → **Root Directory:** `apps/api`
   - Variables: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`, `JWT_SECRET` = (tự đặt)
3. Thêm service thứ 2 từ cùng repo, tên **`web`**
   - Root Directory: `apps/web`
4. Mỗi service → **Settings** → **Networking** → **Generate Domain**

Nếu vẫn báo *Deploys paused* → đợi / kiểm tra billing Railway.

---

## Bước 2 — Token (không gửi cho ai)

Railway → Project **game** → **Settings** → **Tokens** → **Create** → copy token.

---

## Bước 3 — Gắn token vào GitHub

Trên Mac (đã `gh auth login`):

```bash
cd /Users/hainguyen/Downloads/game
gh secret set RAILWAY_TOKEN --repo apiipc/gamephanloai
# Dán token → Enter
```

Sau khi API có URL public:

```bash
gh secret set VITE_API_URL --repo apiipc/gamephanloai
# Ví dụ: https://api-production-xxxx.up.railway.app
```

Cập nhật service **api** trên Railway:

- `FRONTEND_URL` = `https://<domain-của-web>`

---

## Bước 4 — Chạy deploy

```bash
gh workflow run railway-deploy.yml --repo apiipc/gamephanloai
```

Hoặc **push** lên `main` → tự chạy.

Xem log: GitHub → repo → **Actions** → **Deploy to Railway**.

---

## Bước 5 — Seed database (1 lần)

Railway → service **api** → **Shell**:

```bash
npm run db:seed
```

Đăng nhập: `hs1@game.local` / `123456`

---

## Hoặc: CLI trên máy (không dùng Actions)

```bash
npx @railway/cli login
cd /Users/hainguyen/Downloads/game
./scripts/railway-link.sh
cd apps/api && npx @railway/cli up -d
cd ../web && npx @railway/cli up -d
```

---

Chi tiết biến môi trường: [RAILWAY.md](./RAILWAY.md)
