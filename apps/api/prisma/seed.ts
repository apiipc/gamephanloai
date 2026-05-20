import { PrismaClient, Role, TrashCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

  const passwordHash = await bcrypt.hash('123456', 10);

  const org = await prisma.organization.create({
    data: { name: 'Trường THCS Môi Trường Xanh' },
  });

  const classA = await prisma.class.create({
    data: { name: '6A1', organizationId: org.id },
  });
  const classB = await prisma.class.create({
    data: { name: '6A2', organizationId: org.id },
  });

  await prisma.user.create({
    data: {
      email: 'admin@game.local',
      passwordHash,
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: 'school@game.local',
      passwordHash,
      fullName: 'Quản trị trường',
      role: Role.ORG_ADMIN,
      organizationId: org.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@game.local',
      passwordHash,
      fullName: 'Cô Lan - GVCN 6A1',
      role: Role.TEACHER,
      organizationId: org.id,
    },
  });

  await prisma.class.update({
    where: { id: classA.id },
    data: { teacherId: teacher.id },
  });

  const students = [
    { email: 'hs1@game.local', fullName: 'Nguyễn Văn An' },
    { email: 'hs2@game.local', fullName: 'Trần Thị Bình' },
    { email: 'hs3@game.local', fullName: 'Lê Minh Cường' },
    { email: 'hs4@game.local', fullName: 'Phạm Thu Dung' },
    { email: 'hs5@game.local', fullName: 'Hoàng Quốc Huy' },
  ];

  for (const s of students) {
    await prisma.user.create({
      data: {
        ...s,
        passwordHash,
        role: Role.STUDENT,
        organizationId: org.id,
        classId: classA.id,
        greenPoints: Math.floor(Math.random() * 200),
      },
    });
  }

  await prisma.user.create({
    data: {
      email: 'hs6@game.local',
      passwordHash,
      fullName: 'Võ Thị Mai',
      role: Role.STUDENT,
      organizationId: org.id,
      classId: classB.id,
      greenPoints: 50,
    },
  });

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

  await prisma.mission.create({
    data: {
      title: 'Chơi 3 lần hôm nay',
      description: 'Hoàn thành 3 vòng Phân Loại Siêu Tốc',
      targetPlays: 3,
      rewardPoints: 30,
      organizationId: org.id,
    },
  });

  await prisma.quizConfig.create({
    data: {
      organizationId: org.id,
      secondsPerQuestion: 10,
      questionsPerRound: 10,
    },
  });

  await prisma.wheelConfig.create({
    data: {
      organizationId: org.id,
      dailyFreeSpins: 3,
      resetHour: 0,
      extraSpinsEnabled: true,
      maxExtraSpinsPerDay: 5,
      bonusEverySpins: 3,
    },
  });

  const wheelPrizes = [
    { name: '+10 điểm', type: 'POINTS' as const, value: 10, weight: 22, color: '#fbbf24', icon: '⭐' },
    { name: '+20 điểm', type: 'POINTS' as const, value: 20, weight: 18, color: '#34d399', icon: '⭐' },
    { name: 'Túi vải', type: 'ITEM' as const, value: 0, weight: 8, color: '#a78bfa', icon: '👜' },
    { name: '+120 điểm', type: 'POINTS' as const, value: 120, weight: 4, color: '#f472b6', icon: '🌟' },
    { name: 'Bình nước', type: 'ITEM' as const, value: 0, weight: 8, color: '#60a5fa', icon: '🍶' },
    { name: '+1 lượt quay', type: 'SPIN' as const, value: 1, weight: 12, color: '#4ade80', icon: '🎡' },
    { name: 'Túi xanh', type: 'ITEM' as const, value: 0, weight: 8, color: '#22c55e', icon: '🛍️' },
    { name: 'Voucher 10%', type: 'VOUCHER' as const, value: 10, weight: 20, color: '#fb923c', icon: '🎫' },
  ];
  for (let i = 0; i < wheelPrizes.length; i++) {
    await prisma.wheelPrize.create({
      data: { organizationId: org.id, sortOrder: i, ...wheelPrizes[i] },
    });
  }

  const wheelMissions = [
    {
      title: 'Phân loại rác đúng',
      description: 'Phân loại đúng ít nhất 1 món trong game Phân loại siêu tốc',
      missionKey: 'SORT_CORRECT' as const,
      targetCount: 1,
      rewardSpins: 1,
      sortOrder: 0,
    },
    {
      title: 'Đăng nhập hàng ngày',
      description: 'Mở Vòng quay xanh mỗi ngày',
      missionKey: 'DAILY_LOGIN' as const,
      targetCount: 1,
      rewardSpins: 1,
      sortOrder: 1,
    },
    {
      title: 'Chơi game phân loại',
      description: 'Hoàn thành 3 vòng Phân loại siêu tốc trong ngày',
      missionKey: 'PLAY_SORT' as const,
      targetCount: 3,
      rewardSpins: 1,
      sortOrder: 2,
    },
  ];
  for (const m of wheelMissions) {
    await prisma.wheelMission.create({ data: { organizationId: org.id, ...m } });
  }

  const quizPath = path.join(__dirname, '../../../data/quiz-questions.json');
  if (fs.existsSync(quizPath)) {
    const quizItems: {
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
    }[] = JSON.parse(fs.readFileSync(quizPath, 'utf-8'));

    for (const q of quizItems) {
      await prisma.quizQuestion.create({
        data: {
          ...q,
          correctOption: q.correctOption.toUpperCase(),
          organizationId: org.id,
          createdById: teacher.id,
        },
      });
    }
    console.log('Quiz:', quizItems.length, 'câu hỏi');
  }

  console.log('Seed OK —', manifest.length, 'vật phẩm có ảnh');
  console.log('--- Tài khoản demo (mật khẩu: 123456) ---');
  console.log('Student: hs1@game.local');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
