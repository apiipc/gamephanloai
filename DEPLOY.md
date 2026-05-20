# Deploy production

Toàn bộ chạy trên **Railway** (PostgreSQL + API + Web).

Hướng dẫn chi tiết: **[RAILWAY.md](./RAILWAY.md)**

Deploy tự động (GitHub Actions): **[RAILWAY-SETUP.md](./RAILWAY-SETUP.md)**

## Tóm tắt

| Service | Root Directory | Vai trò |
|---------|----------------|---------|
| PostgreSQL | *(plugin)* | Database |
| `api` | `apps/api` | NestJS API |
| `web` | `apps/web` | React game (URL cho người chơi) |

## Dev local

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run dev
```

Mật khẩu demo: `123456`
