/**
 * Đồng bộ items-manifest.json → TrashItem (CLI)
 * Chạy: npx tsx scripts/sync-trash-manifest.ts
 */
import { PrismaClient } from '@prisma/client';
import { syncTrashFromManifest } from '../src/admin/trash-manifest.sync';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaClient();
const service = new PrismaService();

async function main() {
  const result = await syncTrashFromManifest(service);
  console.log('Đồng bộ xong:', result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
