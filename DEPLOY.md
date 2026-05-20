# Deploy production

Toàn bộ chạy trên **Railway** (PostgreSQL + **một** service: Nest phục vụ API `/api` và web tĩnh).

Hướng dẫn chi tiết: **[RAILWAY.md](./RAILWAY.md)** · [docs.railway.com](https://docs.railway.com/)

**Nhanh — một lệnh trên máy** (có `RAILWAY_TOKEN` + `RAILWAY_APP_URL`): [`scripts/railway-provision.sh`](./scripts/railway-provision.sh) — **Root Directory trống** trên service app (xem [RAILWAY.md](./RAILWAY.md)).

## Tóm tắt

| Thành phần | Root Directory | Vai trò |
|------------|----------------|---------|
| PostgreSQL | *(plugin)* | Database |
| App (vd. `api`) | **để trống** | [`Dockerfile`](./Dockerfile): Vite build + Nest, một URL |

**Legacy:** có thể tách `web` ([`Dockerfile.web`](./Dockerfile.web)) + `VITE_API_URL`; không cần nếu dùng unified.

## Vite vẫn có trong repo — có mâu thuẫn với Railway không?

**Không.** Railway chạy **image đã build**; **Vite** chỉ chạy trong bước `docker build` (xem [`Dockerfile`](./Dockerfile)).

| Giai đoạn | Công cụ | Việc làm |
|-----------|---------|----------|
| Dev trên máy | `vite` (`npm run dev`) | Dev server + proxy `/api` → Nest |
| Docker build | `vite build` trong stage `web-build` | Sinh `dist/` → copy vào image |
| Production | **Nest** + `@nestjs/serve-static` | Phục vụ `dist` + API tại `/api` |

## Dev local

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run dev
```

Mật khẩu demo: `123456`
