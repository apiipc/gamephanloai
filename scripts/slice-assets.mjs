import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { removeWhiteBackground } from './remove-white-bg.mjs';
import { CATEGORY_DIR, itemImageUrl, itemOutPath } from './item-category-dirs.mjs';

const ROOT = path.resolve('vat pham');
const OUT = path.resolve('apps/web/public/assets');

const SRC = {
  bins: 'ChatGPT Image 11_11_15 19 thg 5, 2026 (1).png',
  itemsA: 'ChatGPT Image 11_11_16 19 thg 5, 2026 (2).png',
  itemsB: 'ChatGPT Image 11_16_46 19 thg 5, 2026.png',
};

async function sliceRow(imagePath, itemsRoot, row, cols, entries) {
  const meta = await sharp(path.join(ROOT, imagePath)).metadata();
  const w = meta.width;
  const h = meta.height;
  const rowH = Math.floor(h / 3);
  const y = row * rowH;
  const cellW = Math.floor(w / cols);

  for (let i = 0; i < cols; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const { slug, category } = entry;
    const x = i * cellW;
    const width = i === cols - 1 ? w - x : cellW;
    const out = itemOutPath(itemsRoot, slug, category);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = `${out}.tmp.png`;
    await sharp(path.join(ROOT, imagePath))
      .extract({ left: x, top: y, width, height: rowH })
      .png()
      .toFile(tmp);
    await removeWhiteBackground(tmp, out);
    fs.unlinkSync(tmp);
    console.log('  item:', slug, '→', CATEGORY_DIR[category]);
  }
}

async function sliceGrid(imagePath, outDir, rows, cols, names) {
  const meta = await sharp(path.join(ROOT, imagePath)).metadata();
  const w = meta.width;
  const h = meta.height;
  const cellW = Math.floor(w / cols);
  const cellH = Math.floor(h / rows);
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = names[idx++];
      if (!name) continue;
      const x = c * cellW;
      const y = r * cellH;
      const width = c === cols - 1 ? w - x : cellW;
      const height = r === rows - 1 ? h - y : cellH;
      await sharp(path.join(ROOT, imagePath))
        .extract({ left: x, top: y, width, height })
        .png()
        .toFile(path.join(outDir, `${name}.png`));
      console.log('  item:', name);
    }
  }
}

/** Thùng rác: chỉ cắt từ sheet 3 thùng (ChatGPT ... 11_11_15). KHÔNG dùng rac huu co/khac/tai che — đó là sheet vật phẩm. */
async function sliceBinsFromSheet() {
  const outDir = path.join(OUT, 'bins');
  fs.mkdirSync(outDir, { recursive: true });
  const meta = await sharp(path.join(ROOT, SRC.bins)).metadata();
  const cellW = Math.floor(meta.width / 3);
  const names = ['organic', 'recycle', 'other'];

  for (let i = 0; i < 3; i++) {
    const x = i * cellW;
    const width = i === 2 ? meta.width - x : cellW;
    const tmp = path.join(outDir, `${names[i]}.tmp.png`);
    const out = path.join(outDir, `${names[i]}.png`);
    await sharp(path.join(ROOT, SRC.bins))
      .extract({ left: x, top: 0, width, height: meta.height })
      .resize({ height: 130, fit: 'inside' })
      .png()
      .toFile(tmp);
    await removeWhiteBackground(tmp, out);
    fs.unlinkSync(tmp);
    console.log('bin:', names[i]);
  }
}

const ITEMS_A = [
  'chai-nuoc', 'chai-thuy-tinh', 'lon-nuoc-ngot', 'bao-giay', 'hop-carton',
  'vo-chuoi', 'vo-tao', 'xuong-ca', 'thuc-an-thua', 'tui-nilon',
  'coc-tra-sua', 'chai-nhua-dep', 'pin', 'bong-den',
];

const ITEMS_B = [
  'hop-sua', 'lo-thuy-tinh', 'hop-thiec', 'binh-xit', 'giay-bac', 'hop-trung',
  'coc-ca-phe', 'chai-giat', 'vo-cam', 'dua-hau', 'cay-xanh', 'ca-phe-bam',
  'vo-trung', 'xa-lach', 'bap-ngo', 'giay-nhan', 'ban-chai', 'coc-vo', 'ta-giay',
];

const MANIFEST = [
  { slug: 'chai-nuoc', name: 'Chai nhựa nước', category: 'RECYCLE', sheet: 'a' },
  { slug: 'chai-thuy-tinh', name: 'Chai thủy tinh', category: 'RECYCLE', sheet: 'a' },
  { slug: 'lon-nuoc-ngot', name: 'Lon nước ngọt', category: 'RECYCLE', sheet: 'a' },
  { slug: 'bao-giay', name: 'Báo cũ', category: 'RECYCLE', sheet: 'a' },
  { slug: 'hop-carton', name: 'Hộp carton', category: 'RECYCLE', sheet: 'a' },
  { slug: 'vo-chuoi', name: 'Vỏ chuối', category: 'ORGANIC', sheet: 'a' },
  { slug: 'vo-tao', name: 'Vỏ táo', category: 'ORGANIC', sheet: 'a' },
  { slug: 'xuong-ca', name: 'Xương cá', category: 'ORGANIC', sheet: 'a' },
  { slug: 'thuc-an-thua', name: 'Thức ăn thừa', category: 'ORGANIC', sheet: 'a' },
  { slug: 'tui-nilon', name: 'Túi nilon', category: 'OTHER', sheet: 'a' },
  { slug: 'coc-tra-sua', name: 'Cốc trà sữa', category: 'OTHER', sheet: 'a' },
  { slug: 'chai-nhua-dep', name: 'Chai nhựa vứt', category: 'RECYCLE', sheet: 'a' },
  { slug: 'pin', name: 'Pin cũ', category: 'OTHER', sheet: 'a' },
  { slug: 'bong-den', name: 'Bóng đèn vỡ', category: 'OTHER', sheet: 'a' },
  { slug: 'hop-sua', name: 'Hộp sữa', category: 'RECYCLE', sheet: 'b' },
  { slug: 'lo-thuy-tinh', name: 'Lọ thủy tinh', category: 'RECYCLE', sheet: 'b' },
  { slug: 'hop-thiec', name: 'Hộp thiếc', category: 'RECYCLE', sheet: 'b' },
  { slug: 'binh-xit', name: 'Bình xịt', category: 'OTHER', sheet: 'b' },
  { slug: 'giay-bac', name: 'Giấy bạc', category: 'RECYCLE', sheet: 'b' },
  { slug: 'hop-trung', name: 'Hộp trứng', category: 'RECYCLE', sheet: 'b' },
  { slug: 'coc-ca-phe', name: 'Cốc cà phê', category: 'OTHER', sheet: 'b' },
  { slug: 'chai-giat', name: 'Chai nước giặt', category: 'RECYCLE', sheet: 'b' },
  { slug: 'vo-cam', name: 'Vỏ cam', category: 'ORGANIC', sheet: 'b' },
  { slug: 'dua-hau', name: 'Vỏ dưa hấu', category: 'ORGANIC', sheet: 'b' },
  { slug: 'cay-xanh', name: 'Rau củ thừa', category: 'ORGANIC', sheet: 'b' },
  { slug: 'ca-phe-bam', name: 'Cà phê bã', category: 'ORGANIC', sheet: 'b' },
  { slug: 'vo-trung', name: 'Vỏ trứng', category: 'ORGANIC', sheet: 'b' },
  { slug: 'xa-lach', name: 'Rau xà lách', category: 'ORGANIC', sheet: 'b' },
  { slug: 'bap-ngo', name: 'Bắp ngô', category: 'ORGANIC', sheet: 'b' },
  { slug: 'giay-nhan', name: 'Giấy nhăn', category: 'RECYCLE', sheet: 'b' },
  { slug: 'ban-chai', name: 'Bàn chải đánh răng', category: 'OTHER', sheet: 'b' },
  { slug: 'coc-vo', name: 'Cốc sứ vỡ', category: 'OTHER', sheet: 'b' },
  { slug: 'ta-giay', name: 'Tã giấy', category: 'OTHER', sheet: 'b' },
].map((item) => ({
  ...item,
  imageUrl: itemImageUrl(item.slug, item.category),
}));

const slugCategory = Object.fromEntries(MANIFEST.map((m) => [m.slug, m.category]));

function rowEntries(slugs) {
  return slugs.map((slug) => ({ slug, category: slugCategory[slug] }));
}

async function main() {
  const itemsRoot = path.join(OUT, 'items');
  for (const dir of Object.values(CATEGORY_DIR)) {
    fs.mkdirSync(path.join(itemsRoot, dir), { recursive: true });
  }

  console.log('Bins (3 thùng từ sheet, xóa nền trắng)...');
  await sliceBinsFromSheet();

  console.log('Slicing items sheet A (14)...');
  await sliceRow(SRC.itemsA, itemsRoot, 0, 5, rowEntries(ITEMS_A.slice(0, 5)));
  await sliceRow(SRC.itemsA, itemsRoot, 1, 5, rowEntries(ITEMS_A.slice(5, 10)));
  await sliceRow(SRC.itemsA, itemsRoot, 2, 4, rowEntries(ITEMS_A.slice(10, 14)));

  console.log('Slicing items sheet B (6+6+7)...');
  await sliceRow(SRC.itemsB, itemsRoot, 0, 6, rowEntries(ITEMS_B.slice(0, 6)));
  await sliceRow(SRC.itemsB, itemsRoot, 1, 6, rowEntries(ITEMS_B.slice(6, 12)));
  await sliceRow(SRC.itemsB, itemsRoot, 2, 7, rowEntries(ITEMS_B.slice(12, 19)));

  fs.writeFileSync(
    path.join(OUT, 'items-manifest.json'),
    JSON.stringify(MANIFEST, null, 2),
  );
  console.log(`Done. ${MANIFEST.length} items in manifest.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
