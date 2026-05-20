# Deploy lên Vercel

## Chỉ deploy **giao diện** (`apps/web`)

API NestJS **không** deploy cùng Vercel kiểu static — host API ở Railway/Render.

### Cấu hình Vercel (New Project)

| Mục | Giá trị |
|-----|---------|
| Repository | `apiipc/gamephanloai` |
| **Root Directory** | `apps/web` |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` (mặc định) |

**Không** chọn Root Directory = `apps/api` (sẽ lỗi *No Output Directory named "public"*).

### Biến môi trường (sau khi có API online)

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://your-api.example.com` (URL API, không `/` cuối) |

Redeploy sau khi thêm biến.

### API (Railway gợi ý)

1. New project → deploy từ cùng repo GitHub
2. Root: `apps/api`
3. Start: `npm run start` (sau `npm run build`)
4. Env: `DATABASE_URL` (Postgres/Neon), `JWT_SECRET`
5. CORS: cho phép domain `*.vercel.app`
