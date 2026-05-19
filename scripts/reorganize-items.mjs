/**
 * Chuyển ảnh từ items/*.png sang items/{huu-co,tai-che,khac}/
 * và cập nhật items-manifest.json
 */
import fs from 'fs';
import path from 'path';
import { CATEGORY_DIR, itemImageUrl } from './item-category-dirs.mjs';

const manifestPath = path.resolve('apps/web/public/assets/items-manifest.json');
const itemsRoot = path.resolve('apps/web/public/assets/items');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

for (const dir of Object.values(CATEGORY_DIR)) {
  fs.mkdirSync(path.join(itemsRoot, dir), { recursive: true });
}

let moved = 0;
for (const item of manifest) {
  const sub = CATEGORY_DIR[item.category];
  if (!sub) {
    console.warn('Unknown category:', item.category, item.slug);
    continue;
  }

  const flat = path.join(itemsRoot, `${item.slug}.png`);
  const nested = path.join(itemsRoot, sub, `${item.slug}.png`);

  if (fs.existsSync(flat)) {
    fs.renameSync(flat, nested);
    moved++;
    console.log('moved:', item.slug, '→', sub);
  } else if (!fs.existsSync(nested)) {
    console.warn('missing:', item.slug);
  }

  item.imageUrl = itemImageUrl(item.slug, item.category);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Done. Moved ${moved} files. Manifest updated.`);
