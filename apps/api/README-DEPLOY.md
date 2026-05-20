# Không deploy thư mục này lên Vercel (static)

Đây là **API NestJS** (`nest build` → `dist/`), không phải website.

Trên Vercel nếu Root Directory = `apps/api` sẽ build thành công nhưng trang web **404**.

→ Deploy **frontend** với Root Directory = **`apps/web`** (hoặc root repo + `vercel.json` gốc).

→ Deploy API trên **Railway** / **Render** với Postgres.
