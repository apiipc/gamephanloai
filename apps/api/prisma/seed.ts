import { PrismaClient, TrashCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ManifestItem {
  slug: string;
  name: string;
  category: TrashCategory;
  imageUrl: string;
}

const manifestPath = process.env.SEED_ITEMS_MANIFEST
  ? path.resolve(process.env.SEED_ITEMS_MANIFEST)
  : path.join(__dirname, '../../web/public/assets/items-manifest.json');
const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const EMOJI_FALLBACK: Record<string, string> = {
  ORGANIC: '🌿',
  RECYCLE: '♻️',
  OTHER: '⚠️',
};

async function main() {
  await prisma.wheelSpinLog.deleteMany();
  await prisma.userWheelDaily.deleteMany();
  await prisma.wheelPrize.deleteMany();
  await prisma.wheelMission.deleteMany();
  await prisma.wheelConfig.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quizConfig.deleteMany();
  await prisma.gameAnswer.deleteMany();
  await prisma.gameSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.trashItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.organization.deleteMany();

  for (const item of manifest) {
    await prisma.trashItem.create({
      data: {
        name: item.name,
        emoji: EMOJI_FALLBACK[item.category],
        imageUrl: item.imageUrl,
        category: item.category,
        isGlobal: true,
        active: true,
      },
    });
  }

  console.log('Seed OK —', manifest.length, 'vật phẩm có ảnh (không tạo tài khoản demo).');
  console.log('Tạo tài khoản qua Quản trị hoặc import Excel.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
