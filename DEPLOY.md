# Deploy lên Vercel

## ⚠️ Lỗi thường gặp

Build log có dòng:

```text
> api@1.0.0 build
> nest build
```

→ Bạn đang deploy **`apps/api`** (sai). Trang sẽ **404**.

Build log **đúng** phải có:

```text
> web@1.0.0 build
> tsc -b && vite build
```

---

## Cách 1 — Root Directory = `apps/web` (khuyến nghị)

Tạo project Vercel **mới** (hoặc sửa Settings):

| Mục | Giá trị |
|-----|---------|
| Repository | `apiipc/gamephanloai` |
| **Root Directory** | `apps/web` |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

File `apps/web/vercel.json` đã có sẵn trên repo.

---

## Cách 2 — Root Directory = `.` (thư mục gốc repo)

| Mục | Giá trị |
|-----|---------|
| Root Directory | *(để trống / `.`)* |
| Build / Output | dùng `vercel.json` ở gốc repo |

---

## Biến môi trường (khi đã có API online)

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://your-api.railway.app` (không `/` cuối) |

Redeploy sau khi thêm.

---

## API — Railway / Render (không Vercel static)

| Mục | Giá trị |
|-----|---------|
| Root | `apps/api` |
| Build | `npm run build` |
| Start | `npm run start` |
| Env | `DATABASE_URL` (Postgres), `JWT_SECRET` |

CORS: cho phép domain `*.vercel.app`.
