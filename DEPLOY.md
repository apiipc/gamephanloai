# Deploy production

Toàn bộ chạy trên **Railway** (PostgreSQL + API + Web).

Hướng dẫn chi tiết: **[RAILWAY.md](./RAILWAY.md)**

Toàn bộ cách kết nối Railway: **[RAILWAY.md](./RAILWAY.md)** · [docs.railway.com](https://docs.railway.com/)

**Nhanh — một lệnh trên máy** (có `RAILWAY_TOKEN`): [`scripts/railway-provision.sh`](./scripts/railway-provision.sh) — cần **Root Directory trống** + `RAILWAY_DOCKERFILE_PATH` trên Railway (xem [RAILWAY.md](./RAILWAY.md)).

## Tóm tắt

| Service | Root Directory | Vai trò |
|---------|----------------|---------|
| PostgreSQL | *(plugin)* | Database |
| `api` | `apps/api` | NestJS API |
| `web` | `apps/web` | React game (URL cho người chơi) |

## Vite vẫn có trong repo — có mâu thuẫn với Railway không?

**Không.** Railway là **nơi chạy** (host) build production; **Vite** là **công cụ build** giao diện React (giống webpack/esbuild).

| Giai đoạn | Công cụ | Việc làm |
|-----------|---------|-----------|
| Dev trên máy | `vite` (`npm run dev`) | Dev server + proxy `/api` → API local |
| Build (`npm run build` / Docker build) | `vite build` + TypeScript | Sinh thư mục **`dist/`** (HTML/JS/CSS tĩnh) |
| Production trên Railway | **`serve`** trong `apps/web/Dockerfile` | Chỉ phục vụ file trong `dist/`, **không** chạy Vite |

Tóm lại: trên Railway, user chỉ tải file tĩnh đã build sẵn; Vite không chạy như server production.

## Dev local

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run dev
```

Mật khẩu demo: `123456`
