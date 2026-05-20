# Kết nối & deploy toàn bộ lên Railway

Hướng dẫn cho repo **[gamephanloai](https://github.com/apiipc/gamephanloai)** — theo [Railway Docs](https://docs.railway.com/).

**Project Railway của bạn**

| | |
|--|--|
| Tên | `game` |
| **Project ID** | `1323cca9-cdce-4443-b158-f6f7c903a453` |
| File local | `.railway/project.json` |

---

## Kiến trúc (3 service)

```text
┌─────────────────┐
│   PostgreSQL    │  DATABASE_URL
└────────┬────────┘
         │
┌────────▼────────┐     VITE_API_URL (lúc build web)
│  api (apps/api) │◄────────────────────────────┐
│  NestJS + Prisma│                             │
└────────┬────────┘                             │
         │ FRONTEND_URL (CORS)                  │
┌────────▼────────┐                             │
│ web (apps/web)  │  URL công khai → học sinh  │
│  React + Vite   │────────────────────────────┘
└─────────────────┘
```

Không cần Vercel — web + API + DB đều trên Railway.

---

## 4 cách kết nối (chọn 1 hoặc kết hợp)

| Cách | Khi nào dùng | Tài liệu Railway |
|------|----------------|------------------|
| **1. Dashboard + GitHub** | Lần đầu, dễ nhất | [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys) |
| **2. CLI** | Deploy từ máy, xem log | [CLI Deploying](https://docs.railway.com/cli/deploying) |
| **3. GitHub Actions** | Tự deploy mỗi lần push | [GitHub Actions](https://blog.railway.com/p/github-actions) |
| **4. Config file** | Build/start cố định | [Config as code](https://docs.railway.com/deployments/reference) |
| **5. AI trong Cursor** | Hỏi AI deploy, log, biến môi trường | [Railway + AI](https://docs.railway.com/ai.md) |

Repo đã có sẵn: `apps/api/railway.toml`, `apps/web/railway.toml`, `.github/workflows/railway-deploy.yml`.

### Cách 5 — MCP + skill `use-railway` (Cursor)

1. **Đăng nhập Railway CLI** (một lần trên máy): `npx @railway/cli@latest login` hoặc dùng project token qua biến `RAILWAY_TOKEN`.
2. **MCP**: file [`.cursor/mcp.json`](./.cursor/mcp.json) đã cấu hình server **Railway** (`npx -y @railway/mcp-server`). Mở **Cursor → Settings → MCP**, bật server **Railway**, rồi **Reload** cửa sổ Cursor nếu cần.
3. **Skill** (hướng dẫn AI làm đúng quy trình Railway): chạy trên máy:
   ```bash
   railway setup agent -y
   ```
   hoặc chỉ cài skill: `railway skills install` / `npx skills add railwayapp/railway-skills`  
   Chi tiết: [Agent skills](https://docs.railway.com/ai/agent-skills), [MCP server](https://docs.railway.com/ai/mcp-server).

**Lưu ý:** Không commit token; MCP chạy CLI Railway dưới tài khoản đã đăng nhập trên máy bạn.

---

# Cách 1 — Dashboard + GitHub (khuyến nghị)

### 1.1 Đăng nhập & tạo project

1. https://railway.app → đăng nhập (GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. Chọn **`apiipc/gamephanloai`** (cấp quyền GitHub nếu được hỏi).

Nếu báo **Deploys paused** → kiểm tra [billing / trial](https://docs.railway.com/pricing/free-trial) hoặc đợi vài phút.

### 1.2 Thêm PostgreSQL

1. Trong project → **+ New** → **Database** → **PostgreSQL**.
2. Đặt tên service DB (vd. `Postgres`) — giữ mặc định cũng được.

Railway tự tạo biến `DATABASE_URL` cho database đó.  
Docs: [PostgreSQL](https://docs.railway.com/databases/postgresql).

### 1.3 Service **api** (NestJS)

1. **+ New** → **GitHub Repo** → cùng repo `gamephanloai`.
2. Đổi tên service thành **`api`** (Settings → name).
3. **Settings** → **Source**:
   - **Root Directory:** `apps/api`
   - Branch: `main`
4. **Variables** (tab Variables):

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(đổi `Postgres` nếu tên service DB khác)* |
| `JWT_SECRET` | Chuỗi bí mật dài (tự đặt) |
| `FRONTEND_URL` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` *(thêm sau khi có service web)* |

Docs biến tham chiếu: [Variables Reference](https://docs.railway.com/variables/reference).

5. **Settings** → **Build** (hoặc để `railway.toml` tự cấu hình):
   - Build: `npm run build:railway && npx prisma db push`
   - Start: `npm run start`
6. **Networking** → **Generate Domain** → copy URL API.

Docs NestJS: [Nest.js on Railway](https://docs.railway.com/guides/nestjs).

### 1.4 Service **web** (React)

1. **+ New** → **GitHub Repo** → `gamephanloai`.
2. Đặt tên: **`web`**.
3. **Root Directory:** `apps/web`
4. **Variables:**

| Biến | Giá trị |
|------|---------|
| `VITE_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` |

5. **Networking** → **Generate Domain** → **đây là link game**.
6. Quay lại service **api** → sửa `FRONTEND_URL` → **Redeploy** API.

Docs monorepo: [Monorepo](https://docs.railway.com/deployments/monorepo).

### 1.5 Seed database (một lần)

Service **api** → **Shell** (hoặc [CLI `railway shell`](https://docs.railway.com/cli/shell)):

```bash
npm run db:seed
```

Tài khoản demo — mật khẩu **`123456`**: `hs1@game.local`, `admin@game.local`, …

### 1.6 Kiểm tra

- Mở URL **web** → màn đăng nhập.
- Đăng nhập → chơi phân loại / quiz / vòng quay.

---

# Cách 2 — Railway CLI

Docs: [CLI](https://docs.railway.com/cli) · [login](https://docs.railway.com/cli/login) · [link](https://docs.railway.com/cli/link) · [up](https://docs.railway.com/cli/up)

### 2.1 Cài & đăng nhập

```bash
npm install -g @railway/cli
# hoặc: npx @railway/cli@latest

railway login
```

Đăng nhập bằng trình duyệt (tài khoản Railway, **không** dùng project token cho `login`).

### 2.2 Liên kết project local

```bash
cd /Users/hainguyen/Downloads/game
./scripts/railway-link.sh
```

Hoặc thủ công:

```bash
cd apps/api
railway link -p 1323cca9-cdce-4443-b158-f6f7c903a453 -e production -s api

cd ../web
railway link -p 1323cca9-cdce-4443-b158-f6f7c903a453 -e production -s web
```

### 2.3 Deploy từ máy

```bash
cd apps/api
railway up -d

cd ../web
railway up -d
```

Xem log: `railway logs` · Trạng thái: `railway status`

### 2.4 Project Token (CI / script)

- Tạo: Project → **Settings** → **Tokens** → **Create**.
- Dùng: `export RAILWAY_TOKEN="..."` rồi `railway up`.
- **Không** commit token, **không** gửi chat.
- Docs: [Tokens](https://docs.railway.com/develop/tokens) (project token giới hạn quyền so với account login).

---

# Cách 3 — GitHub Actions (đã cấu hình sẵn)

File: `.github/workflows/railway-deploy.yml`

### 3.1 Thiết lập secret (một lần)

```bash
gh secret set RAILWAY_TOKEN --repo apiipc/gamephanloai
# Dán Project Token từ Railway
```

Sau khi API có domain:

```bash
gh secret set VITE_API_URL --repo apiipc/gamephanloai
# https://xxx.up.railway.app
```

### 3.2 Chạy deploy

```bash
gh workflow run railway-deploy.yml --repo apiipc/gamephanloai
```

Hoặc **push** lên nhánh `main` → workflow tự chạy.

Xem log: GitHub → **Actions** → **Deploy to Railway**.

**Lưu ý:** Trên Railway phải **đã tạo** service tên `api` và `web` (Cách 1) trước khi Actions deploy được.

Workflow upload **toàn bộ repo** (`railway up .`), không upload chỉ `apps/api` hay `apps/web`. Service vẫn dùng **Root Directory** `apps/api` / `apps/web` như Cách 1 — Railway cần đường dẫn `apps/*/railway.toml` trong snapshot.

---

# Cách 4 — Config as code (`railway.toml`)

| File | Service |
|------|---------|
| `apps/api/railway.toml` | API — build Prisma + Nest, start Node |
| `apps/web/railway.toml` | Web — build Vite, serve `dist` |

Railway đọc file này khi **Root Directory** trỏ đúng thư mục.

Docs: [Config as code](https://docs.railway.com/deployments/reference) · [Build and start commands](https://docs.railway.com/deployments/build-and-start-commands)

---

## Biến môi trường — tóm tắt

| Service | Biến | Mục đích |
|---------|------|----------|
| **Postgres** | `DATABASE_URL` | Tự sinh |
| **api** | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| **api** | `JWT_SECRET` | Ký JWT đăng nhập |
| **api** | `FRONTEND_URL` | CORS — domain web |
| **web** | `VITE_API_URL` | Build React gọi API (`https://...`) |

Cú pháp `${{service.BIEN}}`: [Variable Reference](https://docs.railway.com/variables/reference).

---

## Domain & networking

- Mỗi service → **Settings** → **Networking** → **Generate Domain**.
- Docs: [Domains](https://docs.railway.com/networking/domains) · [Public networking](https://docs.railway.com/networking/public-networking).
- API và Web mỗi service **một URL** riêng.

---

## Dev local (sau khi có Postgres)

```bash
npm install
cp apps/api/.env.example apps/api/.env
# DATABASE_URL = copy từ Railway Postgres hoặc Docker local
npm run db:setup
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001 (proxy `/api`)

Schema production dùng **PostgreSQL** (không còn SQLite `dev.db`).

---

## Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| **Deploys paused** | Giới hạn / billing Railway | Đợi, kiểm tra plan, billing |
| Build `nest build` khi deploy web | Root Directory sai | Web = `apps/web`, API = `apps/api` |
| Trang **404** | Deploy nhầm API làm static | Chỉ `apps/web` serve `dist` |
| Đăng nhập lỗi | Web chưa có `VITE_API_URL` | Set biến + redeploy web |
| CORS lỗi | `FRONTEND_URL` sai | `https://` + domain web, redeploy API |
| **`service config at 'apps/.../railway.toml' not found`** | Deploy CLI/GitHub chỉ gửi thư mục con (`--path-as-root`) | Dùng `railway up .` từ **gốc repo**; giữ Root Directory `apps/api` / `apps/web` trên dashboard |
| `Unauthorized` CLI | Chưa login / token hỏng | `railway login` hoặc token mới |
| Actions fail | Thiếu secret / chưa có service | `gh secret set` + tạo `api`/`web` trên Railway |

Docs: [Troubleshooting](https://docs.railway.com/deployments/troubleshooting) · [Application failed to respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)

---

## Tài liệu Railway hữu ích

| Chủ đề | Link |
|--------|------|
| Trang chủ docs | https://docs.railway.com/ |
| Quick start | https://docs.railway.com/quick-start |
| Monorepo | https://docs.railway.com/deployments/monorepo |
| PostgreSQL | https://docs.railway.com/databases/postgresql |
| Variables | https://docs.railway.com/variables/reference |
| CLI deploy | https://docs.railway.com/cli/deploying |
| GitHub autodeploy | https://docs.railway.com/deployments/github-autodeploys |
| Nest.js guide | https://docs.railway.com/guides/nestjs |

---

## Checklist nhanh

- [ ] Project Railway + repo GitHub đã nối  
- [ ] PostgreSQL đã tạo  
- [ ] Service **`api`** — root `apps/api` — `DATABASE_URL`, `JWT_SECRET`  
- [ ] Service **`web`** — root `apps/web` — `VITE_API_URL`  
- [ ] Cả hai đã **Generate Domain**  
- [ ] `FRONTEND_URL` trên API = URL web  
- [ ] `npm run db:seed` trên API (một lần)  
- [ ] Mở URL **web** → đăng nhập thử  
