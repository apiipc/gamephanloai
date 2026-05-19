/**
 * Quét items/{huu-co,tai-che,khac}/*.png và cập/ghi manifest.
 * Giữ name/category của mục cũ; thêm mục mới với tên mặc định từ slug.
 */
import fs from 'fs';
import path from 'path';
import { CATEGORY_DIR, itemImageUrl } from './item-category-dirs.mjs';

const manifestPath = path.resolve('apps/web/public/assets/items-manifest.json');
const itemsRoot = path.resolve('apps/web/public/assets/items');

const CATEGORY_FROM_DIR = Object.fromEntries(
  Object.entries(CATEGORY_DIR).map(([cat, dir]) => [dir, cat]),
);

function slugToName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const oldManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  : [];
const bySlug = Object.fromEntries(oldManifest.map((m) => [m.slug, m]));

const manifest = [];

for (const [dir, category] of Object.entries(CATEGORY_FROM_DIR)) {
  const folder = path.join(itemsRoot, dir);
  if (!fs.existsSync(folder)) continue;

  for (const file of fs.readdirSync(folder)) {
    if (!file.endsWith('.png') || file.includes('.tmp')) continue;
    const slug = file.replace(/\.png$/, '');
    const prev = bySlug[slug];
    manifest.push({
      slug,
      name: prev?.name ?? slugToName(slug),
      category,
      sheet: prev?.sheet ?? 'manual',
      imageUrl: itemImageUrl(slug, category),
    });
  }
}

manifest.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${manifest.length} vật phẩm`);
console.log('  huu-co:', manifest.filter((m) => m.category === 'ORGANIC').length);
console.log('  tai-che:', manifest.filter((m) => m.category === 'RECYCLE').length);
console.log('  khac:', manifest.filter((m) => m.category === 'OTHER').length);
