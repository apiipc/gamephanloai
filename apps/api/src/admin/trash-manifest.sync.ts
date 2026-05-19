import { TrashCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TRASH_EMOJI_FALLBACK } from './trash-image.util';

interface ManifestItem {
  slug: string;
  name: string;
  category: TrashCategory;
  imageUrl: string;
}

function resolveWebAsset(...segments: string[]): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/web/public/assets', ...segments),
    path.resolve(process.cwd(), '../web/public/assets', ...segments),
    path.resolve(process.cwd(), 'public/assets', ...segments),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function manifestPath(): string {
  const p = resolveWebAsset('items-manifest.json');
  if (!p) throw new Error('Không tìm thấy apps/web/public/assets/items-manifest.json');
  return p;
}

function itemsRoot(): string {
  const p = resolveWebAsset('items');
  if (!p) throw new Error('Không tìm thấy thư mục apps/web/public/assets/items');
  return p;
}

function imageExists(imageUrl: string): boolean {
  const rel = imageUrl.replace(/^\/assets\/items\//, '');
  return fs.existsSync(path.join(itemsRoot(), rel));
}

export async function syncTrashFromManifest(prisma: PrismaService) {
  const file = manifestPath();
  if (!fs.existsSync(file)) {
    throw new Error('Không tìm thấy items-manifest.json');
  }

  const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of manifest) {
    if (!imageExists(item.imageUrl)) {
      skipped++;
      continue;
    }

    const existing = await prisma.trashItem.findFirst({
      where: { imageUrl: item.imageUrl },
    });

    const data = {
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
      emoji: TRASH_EMOJI_FALLBACK[item.category],
      isGlobal: true,
      active: true,
      organizationId: null as string | null,
    };

    if (existing) {
      await prisma.trashItem.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.trashItem.create({ data });
      created++;
    }
  }

  return {
    created,
    updated,
    skipped,
    total: manifest.length,
    inDb: await prisma.trashItem.count({
      where: { isGlobal: true, active: true },
    }),
  };
}
