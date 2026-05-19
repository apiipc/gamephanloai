/**
 * Tạo ảnh nền game 16:9 từ vat pham/anh nen.png
 */
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

const SRC = path.resolve('vat pham/anh nen.png');
const OUT_DIR = path.resolve('apps/web/public/assets');

const SIZES = [
  { file: 'game-bg-wide.png', width: 1920, height: 1080 },
  { file: 'game-bg.png', width: 1280, height: 720 },
];

if (!fs.existsSync(SRC)) {
  console.error('Không tìm thấy:', SRC);
  process.exit(1);
}

for (const { file, width, height } of SIZES) {
  const out = path.join(OUT_DIR, file);
  await sharp(SRC)
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
    })
    .png({ compressionLevel: 8 })
    .toFile(out);
  console.log('OK', file, `${width}x${height} (16:9)`);
}

console.log('Nguồn:', SRC);
