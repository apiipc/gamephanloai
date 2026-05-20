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
added ~98 packages     ← chỉ web (KHÔNG phải 426)
> web@1.0.0 build
> tsc -b && vite build
```

Nếu thấy **`added 424 packages`** + cảnh báo `rimraf` / `npmlog` → vẫn đang cài cả API (sai).

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

## API — Railway

Chi tiết từng bước: **[RAILWAY.md](./RAILWAY.md)**

Tóm tắt: Postgres plugin + Root `apps/api` + `VITE_API_URL` trên Vercel.
