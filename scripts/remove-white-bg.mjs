import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Đổi nền trắng / gần trắng thành trong suốt (PNG alpha).
 */
export async function removeWhiteBackground(input, output, threshold = 235) {
  const inputPath = typeof input === 'string' ? input : null;
  let pipeline = inputPath ? sharp(inputPath) : sharp(input);

  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    } else if (r >= threshold - 15 && g >= threshold - 15 && b >= threshold - 15) {
      const avg = (r + g + b) / 3;
      data[i + 3] = Math.min(data[i + 3], Math.floor((255 - avg) * 3));
    }
  }

  let out = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();

  out = out.trim({ threshold: 10 });
  await out.toFile(output);
}

export async function processDir(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    const p = path.join(dir, f);
    const tmp = p + '.tmp.png';
    await removeWhiteBackground(p, tmp);
    fs.renameSync(tmp, p);
    console.log('  transparent:', f);
  }
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]).endsWith('remove-white-bg.mjs');
if (isCli) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node remove-white-bg.mjs <file-or-dir>');
    process.exit(1);
  }
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    await processDir(target);
  } else {
    await removeWhiteBackground(target, target);
    console.log('OK', target);
  }
}
