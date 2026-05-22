/**
 * Xóa tài khoản demo (@game.local) và dữ liệu liên quan.
 * Chạy: npm run db:remove-demo-users (trong apps/api, cần DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_EMAIL_SUFFIX = '@game.local';

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true, email: true, role: true },
  });

  if (demoUsers.length === 0) {
    console.log('Không có tài khoản demo (@game.local) trong DB.');
    return;
  }

  console.log(`Tìm thấy ${demoUsers.length} tài khoản demo:`);
  for (const u of demoUsers) console.log(`  - ${u.email} (${u.role})`);

  const ids = demoUsers.map((u) => u.id);

  await prisma.$transaction(async (tx) => {
    await tx.class.updateMany({
      where: { teacherId: { in: ids } },
      data: { teacherId: null },
    });

    await tx.quizQuestion.deleteMany({ where: { createdById: { in: ids } } });
    await tx.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await tx.userWheelDaily.deleteMany({ where: { userId: { in: ids } } });
    await tx.wheelSpinLog.deleteMany({ where: { userId: { in: ids } } });

    const sessions = await tx.gameSession.findMany({
      where: { userId: { in: ids } },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length) {
      await tx.gameAnswer.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.gameSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    const quizSessions = await tx.quizSession.findMany({
      where: { userId: { in: ids } },
      select: { id: true },
    });
    const quizSessionIds = quizSessions.map((s) => s.id);
    if (quizSessionIds.length) {
      await tx.quizAnswer.deleteMany({ where: { sessionId: { in: quizSessionIds } } });
      await tx.quizSession.deleteMany({ where: { id: { in: quizSessionIds } } });
    }

    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });

  const toRemove = await prisma.class.findMany({
    where: {
      teacherId: null,
      students: { none: {} },
      name: { in: ['6A1', '6A2'] },
    },
  });
  if (toRemove.length) {
    await prisma.class.deleteMany({ where: { id: { in: toRemove.map((c) => c.id) } } });
    console.log(`Đã xóa ${toRemove.length} lớp demo trống (${toRemove.map((c) => c.name).join(', ')}).`);
  }

  const demoOrg = await prisma.organization.findFirst({
    where: { name: 'Trường THCS Môi Trường Xanh' },
    include: { _count: { select: { users: true, classes: true } } },
  });
  if (demoOrg && demoOrg._count.users === 0 && demoOrg._count.classes === 0) {
    await prisma.organization.delete({ where: { id: demoOrg.id } });
    console.log('Đã xóa tổ chức demo trống: Trường THCS Môi Trường Xanh');
  }

  console.log(`Đã xóa ${demoUsers.length} tài khoản demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
