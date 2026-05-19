import { BadRequestException } from '@nestjs/common';
import { TrashCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const TRASH_CATEGORY_DIR: Record<TrashCategory, string> = {
  ORGANIC: 'huu-co',
  RECYCLE: 'tai-che',
  OTHER: 'khac',
};

export const TRASH_EMOJI_FALLBACK: Record<TrashCategory, string> = {
  ORGANIC: '🌿',
  RECYCLE: '♻️',
  OTHER: '🗑️',
};

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function resolveItemsRoot(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/web/public/assets/items'),
    path.resolve(process.cwd(), '../web/public/assets/items'),
    path.resolve(process.cwd(), 'public/assets/items'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function itemsPublicRoot(): string {
  const root = resolveItemsRoot();
  if (!root) throw new BadRequestException('Không tìm thấy thư mục assets/items');
  return root;
}

function publicUrlToPath(imageUrl: string): string | null {
  if (!imageUrl?.startsWith('/assets/items/')) return null;
  const rel = imageUrl.replace(/^\/assets\/items\//, '');
  const full = path.join(itemsPublicRoot(), rel);
  return fs.existsSync(full) ? full : null;
}

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'vat-pham'
  );
}

export function saveTrashItemImage(
  file: Express.Multer.File,
  category: TrashCategory,
  name: string,
): string {
  if (!file?.buffer?.length) {
    throw new BadRequestException('File ảnh không hợp lệ');
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
  if (!ALLOWED_EXT.has(ext)) {
    throw new BadRequestException('Chỉ chấp nhận ảnh PNG, JPG, WEBP hoặc GIF');
  }

  const folder = TRASH_CATEGORY_DIR[category];
  const dir = path.join(itemsPublicRoot(), folder);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${slugify(name)}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return `/assets/items/${folder}/${filename}`;
}

/** Di chuyển ảnh sang thư mục loại rác mới khi đổi category */
export function moveTrashItemImage(
  imageUrl: string,
  newCategory: TrashCategory,
  name: string,
): string {
  const src = publicUrlToPath(imageUrl);
  if (!src) return imageUrl;

  const folder = TRASH_CATEGORY_DIR[newCategory];
  const dir = path.join(itemsPublicRoot(), folder);
  fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(src) || '.png';
  const destName = `${slugify(name)}-${Date.now()}${ext}`;
  const dest = path.join(dir, destName);
  fs.renameSync(src, dest);
  return `/assets/items/${folder}/${destName}`;
}

export function deleteTrashItemImageFile(imageUrl: string | null | undefined): void {
  const filePath = imageUrl ? publicUrlToPath(imageUrl) : null;
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}
