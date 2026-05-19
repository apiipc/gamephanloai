import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) {
    console.log('No organization — run full seed first');
    return;
  }

  const existing = await prisma.wheelConfig.findUnique({
    where: { organizationId: org.id },
  });
  if (existing) {
    console.log('Wheel already configured for', org.name);
    return;
  }

  await prisma.wheelConfig.create({
    data: {
      organizationId: org.id,
      dailyFreeSpins: 3,
      bonusEverySpins: 3,
    },
  });

  const prizes = [
    { name: '+10 điểm', type: 'POINTS' as const, value: 10, weight: 22, color: '#fbbf24', icon: '⭐' },
    { name: '+20 điểm', type: 'POINTS' as const, value: 20, weight: 18, color: '#34d399', icon: '⭐' },
    { name: 'Túi vải', type: 'ITEM' as const, value: 0, weight: 8, color: '#a78bfa', icon: '👜' },
    { name: '+120 điểm', type: 'POINTS' as const, value: 120, weight: 4, color: '#f472b6', icon: '🌟' },
    { name: 'Bình nước', type: 'ITEM' as const, value: 0, weight: 8, color: '#60a5fa', icon: '🍶' },
    { name: '+1 lượt quay', type: 'SPIN' as const, value: 1, weight: 12, color: '#4ade80', icon: '🎡' },
    { name: 'Túi xanh', type: 'ITEM' as const, value: 0, weight: 8, color: '#22c55e', icon: '🛍️' },
    { name: 'Voucher 10%', type: 'VOUCHER' as const, value: 10, weight: 20, color: '#fb923c', icon: '🎫' },
  ];
  for (let i = 0; i < prizes.length; i++) {
    await prisma.wheelPrize.create({ data: { organizationId: org.id, sortOrder: i, ...prizes[i] } });
  }

  const missions = [
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
  for (const m of missions) {
    await prisma.wheelMission.create({ data: { organizationId: org.id, ...m } });
  }

  console.log('Wheel seeded for', org.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
