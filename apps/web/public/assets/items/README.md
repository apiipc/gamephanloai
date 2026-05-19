# Ảnh vật phẩm — phân loại rác

Đặt ảnh PNG (nền trong suốt) vào đúng thư mục:

| Thư mục | Loại | Ví dụ |
|---------|------|--------|
| `huu-co/` | Hữu cơ (ORGANIC) | `vo-chuoi.png`, `xuong-ca.png` |
| `tai-che/` | Tái chế (RECYCLE) | `chai-nuoc.png`, `hop-carton.png` |
| `khac/` | Khác (OTHER) | `tui-nilon.png`, `pin.png` |

**Tên file** = slug (chữ thường, nối bằng `-`), ví dụ: `vo-cam.png`.

## Thêm ảnh lẻ (từng file PNG)

1. Copy file vào thư mục loại phù hợp.
2. Chạy:

```bash
npm run assets:sync-manifest
npm run db:seed
```

Hoặc chỉnh tay `items-manifest.json` (thêm `slug`, `name`, `category`, `imageUrl`).
