/**
 * Kiểm tra nhanh bảng User — chạy: npm run db:audit-users
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
      classId: true,
      passwordHash: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Tổng tài khoản: ${users.length}`);
  const byRole: Record<string, number> = {};
  let badHash = 0;
  let noOrgStudent = 0;

  for (const u of users) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    if (!u.passwordHash || u.passwordHash.length < 20) badHash++;
    if (u.role === 'STUDENT' && !u.organizationId) noOrgStudent++;
  }

  console.log('Theo vai trò:', byRole);
  if (badHash) console.warn(`⚠ ${badHash} tài khoản có passwordHash bất thường`);
  if (noOrgStudent) console.warn(`⚠ ${noOrgStudent} học sinh chưa gắn tổ chức`);

  const classes = await prisma.class.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: { name: 'asc' },
  });
  console.log(`\nLớp (${classes.length}):`);
  for (const c of classes) {
    console.log(`  ${c.name}: ${c._count.students} HS`);
  }

  const emails = users.map((u) => u.email);
  const dup = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (dup.length) console.warn('Email trùng:', [...new Set(dup)]);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
