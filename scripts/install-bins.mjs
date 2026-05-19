/**
 * Cài ảnh thùng rác từ vat pham/ → public/assets/bins/
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { removeWhiteBackground } from './remove-white-bg.mjs';

const SRC = path.resolve('vat pham');
const OUT = path.resolve('apps/web/public/assets/bins');
const BIN_HEIGHT = 150;

fs.mkdirSync(OUT, { recursive: true });

async function writeBin(pngBuffer, name) {
  const tmp = path.join(OUT, `${name}.tmp.png`);
  const out = path.join(OUT, `${name}.png`);
  await sharp(pngBuffer).png().toFile(tmp);
  await removeWhiteBackground(tmp, out);
  fs.unlinkSync(tmp);
  console.log('bin:', name, '→', out);
}

async function fromFile(filename, name) {
  const buf = await sharp(path.join(SRC, filename))
    .resize({ height: BIN_HEIGHT, fit: 'inside' })
    .png()
    .toBuffer();
  await writeBin(buf, name);
}

async function recycleFromSheet() {
  const sheetPath = path.join(SRC, 'thung rac.png');
  const meta = await sharp(sheetPath).metadata();
  const cellW = Math.floor(meta.width / 3);
  const buf = await sharp(sheetPath)
    .extract({ left: cellW, top: 0, width: cellW, height: meta.height })
    .resize({ height: BIN_HEIGHT, fit: 'inside' })
    .png()
    .toBuffer();
  await writeBin(buf, 'recycle');
}

async function main() {
  await fromFile('thung rac huu co.png', 'organic');
  await fromFile('thung rac khac.png', 'other');

  const taiChe = path.join(SRC, 'thung tac tai che.png');
  if (fs.existsSync(taiChe)) {
    await fromFile('thung tac tai che.png', 'recycle');
  } else {
    await recycleFromSheet();
  }

  console.log('Done — 3 thùng trong', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
