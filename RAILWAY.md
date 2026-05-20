# Kết nối & deploy toàn bộ lên Railway

Hướng dẫn cho repo **[gamephanloai](https://github.com/apiipc/gamephanloai)** — theo [Railway Docs](https://docs.railway.com/).

**Project Railway của bạn**

| | |
|--|--|
| Tên | `game` |
| **Project ID** | `1323cca9-cdce-4443-b158-f6f7c903a453` |
| File local | `.railway/project.json` |

---

## Kiến trúc (khuyến nghị: **2 service** — Postgres + app)

```text
┌─────────────────┐
│   PostgreSQL    │  DATABASE_URL
└────────┬────────┘
         │
┌────────▼──────────────────────────────────────────┐
│  api (hoặc tên bạn đặt)                            │
│  NestJS + Prisma + phục vụ React `dist` (SPA)    │
│  API: /api/...  ·  Web: /  (cùng origin, 1 URL)   │
└────────────────────────────────────────────────────┘
```

- [**`Dockerfile`**](./Dockerfile) ở **gốc repo**: build Vite (`apps/web`) + Nest (`apps/api`), copy `web/dist` → `/app/web-dist`, set `WEB_DIST_PATH`.
- Không cần `VITE_API_URL`: frontend gọi **`/api/...`** trên cùng host.
- Biến **`FRONTEND_URL`** trên service app = **URL public** bạn Generate Domain (cùng URL đó để mở game — CORS đúng).

**Tách web + API riêng (cũ):** vẫn có [**`Dockerfile.web`**](./Dockerfile.web) + `RAILWAY_DOCKERFILE_PATH` + `VITE_API_URL`; chỉ dùng nếu bạn cố ý giữ 2 service.

Không cần Vercel — app + DB trên Railway.

---

## Cách deploy khuyến nghị (monorepo + CLI / GitHub Actions)

| File | Dùng khi |
|------|-----------|
| **[`Dockerfile`](./Dockerfile)** | **Mặc định** — một service: web + API (Root Directory **trống**, **không** `RAILWAY_DOCKERFILE_PATH`) |
| **[`Dockerfile.web`](./Dockerfile.web)** | Chỉ khi deploy **riêng** service static `web` |

**Trên dashboard (một service app):**

1. **Settings → Source → Root Directory:** để **trống**.
2. **Variables:** `DATABASE_URL`, `JWT_SECRET`, **`FRONTEND_URL`** = URL public của chính service này (sau Generate Domain). **Không** cần `VITE_API_URL`.
3. **Watch paths:** xóa hoặc `**`.
4. Service **`web`** / **`api`** cũ (tách) có thể **xóa** hoặc tắt deploy sau khi đã chuyển.

Sau đó **`./scripts/railway-provision.sh`** (có `RAILWAY_TOKEN` + **`RAILWAY_APP_URL`**) hoặc push `main` → GitHub Actions (`railway up .` một lần, service `api` mặc định — đổi bằng biến trong workflow nếu cần).

Các file **`apps/*/railway.toml`** vẫn hữu ích nếu deploy chỉ subfolder (lệ thừa khi dùng Dockerfile gốc).

---

## 4 cách kết nối (chọn 1 hoặc kết hợp)

| Cách | Khi nào dùng | Tài liệu Railway |
|------|----------------|------------------|
| **1. Dashboard + GitHub** | Lần đầu, dễ nhất | [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys) |
| **2. CLI** | Deploy từ máy, xem log | [CLI Deploying](https://docs.railway.com/cli/deploying) |
| **3. GitHub Actions** | Tự deploy mỗi lần push | [GitHub Actions](https://blog.railway.com/p/github-actions) |
| **4. Config file** | Build/start cố định | [Config as code](https://docs.railway.com/deployments/reference) |
| **5. AI trong Cursor** | Hỏi AI deploy, log, biến môi trường | [Railway + AI](https://docs.railway.com/ai.md) |

Repo: **[`Dockerfile`](./Dockerfile)** (unified), **[`Dockerfile.web`](./Dockerfile.web)** (legacy split), [`.github/workflows/railway-deploy.yml`](./.github/workflows/railway-deploy.yml), **`scripts/railway-provision.sh`**.

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

### Script một lệnh (biến + deploy từ máy bạn)

File **[`scripts/railway-provision.sh`](./scripts/railway-provision.sh)** — cần **`export RAILWAY_TOKEN=...`**, **`export RAILWAY_APP_URL=https://...`** (URL public service sau Generate Domain), sau đó:

```bash
chmod +x scripts/railway-provision.sh
./scripts/railway-provision.sh
```

Script set `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET` và chạy **`railway up .`** một lần. **Root Directory trống** trên service app.

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

### 1.3 Service **app** (Nest + React — unified)

1. **+ New** → **GitHub Repo** → `gamephanloai`.
2. Đặt tên (vd. **`api`** — khớp với `--service` trong Actions nếu có).
3. **Source:** **Root Directory để trống** · Dockerfile gốc repo (mặc định [`Dockerfile`](./Dockerfile)) · Branch `main`.
4. **Variables:**

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Chuỗi bí mật dài |
| `FRONTEND_URL` | URL public của **chính service này** (sau bước 5). Có thể dùng `${{tên_service.RAILWAY_PUBLIC_DOMAIN}}` với `https://` trước |

5. **Networking** → **Generate Domain** — **đây là link game** (và API tại `/api/...`). Cập nhật lại `FRONTEND_URL` cho khớp URL này rồi **Redeploy** nếu đã đổi.

6. *Tuỳ chọn:* xóa hoặc dừng các service **`web`** / **`api`** cũ (bản tách) + Postgres thừa để tránh nhầm `DATABASE_URL`.

Docs NestJS: [Nest.js on Railway](https://docs.railway.com/guides/nestjs).

### 1.4 Seed database (một lần)

Trên **cùng service app** → **Shell**:

```bash
npm run db:seed
```

Tài khoản demo — mật khẩu **`123456`**: `hs1@game.local`, `admin@game.local`, …

### 1.5 Kiểm tra

- Mở URL public của service app → màn đăng nhập.
- Đăng nhập → chơi phân loại / quiz / vòng quay.
- (Tuỳ chọn) `curl -X POST https://<YOUR_URL>/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@game.local","password":"123456"}'` → JSON có `token`.

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
cd /Users/hainguyen/Downloads/game
railway link -p 1323cca9-cdce-4443-b158-f6f7c903a453 -e production -s api
```

### 2.3 Deploy từ máy

```bash
cd /Users/hainguyen/Downloads/game
railway up . --service api --detach
```

*(Đổi `api` nếu tên service trên Railway khác.)*

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

**Không** cần `VITE_API_URL` khi deploy **một service** (Dockerfile gốc): frontend gọi `/api` cùng origin.

### 3.2 Chạy deploy

```bash
gh workflow run railway-deploy.yml --repo apiipc/gamephanloai
```

Hoặc **push** lên nhánh `main` → workflow tự chạy.

Xem log: GitHub → **Actions** → **Deploy to Railway**.

**Trên Railway:** một service app (mặc định workflow dùng tên **`api`** — đổi biến `RAILWAY_SERVICE` trong workflow nếu khác), **Root Directory trống**, **`RAILWAY_TOKEN`** trong GitHub secrets. **Không** cần `RAILWAY_DOCKERFILE_PATH` / `Dockerfile.web` cho luồng unified.

Chi tiết: mục [Cách deploy khuyến nghị](#cách-deploy-khuyến-nghị-monorepo--cli--github-actions).

---

# Cách 4 — Config as code (`railway.toml`)

| File | Service |
|------|---------|
| `apps/api/railway.toml` | API — build Prisma + Nest, start Node |
| `apps/web/railway.toml` | Web — build Vite, serve `dist` |

Railway đọc file này khi **Root Directory** trỏ đúng thư mục.

Docs: [Config as code](https://docs.railway.com/deployments/reference) · [Build and start commands](https://docs.railway.com/deployments/build-and-start-commands)

---

## Biến môi trường — tóm tắt (unified)

| Service app | Biến | Mục đích |
|-------------|------|----------|
| **Postgres** | `DATABASE_URL` | Tự sinh |
| **app** | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| **app** | `JWT_SECRET` | Ký JWT đăng nhập |
| **app** | `FRONTEND_URL` | CORS — **URL public chính service này** (thường trùng link game) |

**Tách web + api (legacy):** thêm service **web** với `RAILWAY_DOCKERFILE_PATH=Dockerfile.web` và `VITE_API_URL`; **api** tách với `FRONTEND_URL` = URL web.

Cú pháp `${{service.BIEN}}`: [Variable Reference](https://docs.railway.com/variables/reference).

---

## Domain & networking

- Service app → **Settings** → **Networking** → **Generate Domain** → **một URL** cho game và API (`/api/...`).
- Docs: [Domains](https://docs.railway.com/networking/domains) · [Public networking](https://docs.railway.com/networking/public-networking).

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
| Build `nest build` khi deploy web | Root Directory sai / Dockerfile nhầm | Root Directory **trống**; web có `RAILWAY_DOCKERFILE_PATH=Dockerfile.web` |
| Trang **404** | Deploy nhầm API làm static | Chỉ `apps/web` serve `dist` |
| Đăng nhập lỗi / spinner vô hạn | Web build thiếu `VITE_API_URL`, hoặc DB chưa seed, hoặc CORS | Xem [mục chi tiết bên dưới](#không-đăng-nhập-được-dù-dashboard-xanh) |
| CORS lỗi (console: blocked by CORS) | `FRONTEND_URL` không khớp URL web | Đúng `https://…up.railway.app` (không `/` cuối), trùng subdomain bạn mở trên trình duyệt, redeploy **api** |  
| **couldn't locate the dockerfile at path Dockerfile** | Railway mặc định tìm `Dockerfile` ở **gốc repo**; biến `RAILWAY_DOCKERFILE_PATH` chưa áp dụng hoặc trỏ nhầm | Repo phải có [`Dockerfile`](./Dockerfile) cho **api**; **web** giữ `RAILWAY_DOCKERFILE_PATH=Dockerfile.web` |
| Build skip / snapshot nhỏ | **Watch paths** không khớp `railway up .` | Root Directory **trống**, xóa/sửa Watch paths; xem [mục khuyến nghị](#cách-deploy-khuyến-nghị-monorepo--cli--github-actions) |
| **`prefix not found`** (CLI) | `railway up .` khi **Root Directory** vẫn là `apps/...` | Để Root Directory **trống** hoặc chỉ dùng `railway up ./apps/<svc> --path-as-root` với config tương thích |
| `Unauthorized` CLI | Chưa login / token hỏng | `railway login` hoặc token mới |
| Actions fail | Thiếu `RAILWAY_TOKEN` / chưa có service | `gh secret set RAILWAY_TOKEN` + tạo service app trên Railway |

Docs: [Troubleshooting](https://docs.railway.com/deployments/troubleshooting) · [Application failed to respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)

### Không đăng nhập được dù dashboard xanh

1. **Mở game bằng đúng URL mà bạn đã cấu hình**  
   Biến **`FRONTEND_URL`** trên service **api** phải **trùng** `Origin` khi bạn mở trang (vd. `https://web-production-xxxx.up.railway.app`). Nếu bạn mở bản custom domain khác mà quên thêm vào `FRONTEND_URL` (hoặc thêm dư dấu `/` cuối), trình duyệt sẽ chặn CORS và đăng nhập không chạy.

2. **Đúng URL API (tách web + api cũ)**  
   Nếu bạn vẫn deploy **hai** service: bản web build tĩnh cần **`VITE_API_URL`** = URL API; thiếu biến → gọi `/api` trên host `serve` → lỗi.  
   **Khuyến nghị:** dùng **[một service](./Dockerfile)** — frontend gọi `/api` cùng origin, không cần `VITE_API_URL`.

3. **API có thật sự đang chạy**  
   Nếu log không có `App (API + web) running on ...` hoặc `API running on ...`, kiểm tra **Deployments → Logs**. Trên trình duyệt, request **`/api/auth/login`** phải trả **200** và JSON có `token` (bản unified).

4. **Database đã có tài khoản demo**  
   Chạy **một lần** trong shell của service **api** (đúng Postgres mà api đang dùng):

   ```bash
   npm run db:seed
   ```

   Tài khoản sau seed (mật khẩu **`123456`**): **`admin@game.local`**, `school@game.local`, … (xem [`apps/api/prisma/seed.ts`](./apps/api/prisma/seed.ts)). Nếu **hai** Postgres trong project, api phải nối đúng cái bạn đã seed; cái còn lại có thể để trống user → luôn báo sai mật khẩu.

5. **Kiểm tra nhanh bằng curl** (thay URL cho đúng — bản **unified** thêm prefix `/api`):

   ```bash
   curl -sS -X POST "https://YOUR_APP_URL/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@game.local","password":"123456"}'
   ```

   Phải nhận JSON có `"token"`. Nếu `401` → sai mật khẩu hoặc chưa seed; nếu `404`/HTML → URL sai hoặc service không phải Nest.

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
- [ ] PostgreSQL đã tạo (một instance; xóa bản thừa nếu dễ nhầm)  
- [ ] **Một** service app — **Root Directory trống** — [`Dockerfile`](./Dockerfile) ở gốc — `DATABASE_URL`, `JWT_SECRET`, **`FRONTEND_URL` = URL public chính service đó**  
- [ ] Đã **Generate Domain** cho service app  
- [ ] `npm run db:seed` trong shell service app (một lần)  
- [ ] Mở URL app → đăng nhập thử  
