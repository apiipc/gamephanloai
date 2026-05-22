import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WheelMissionKey, WheelPrizeType } from '@prisma/client';
import { JwtPayload } from '../common/decorators';
import { canPlayGames } from '../common/teacher-scope';
import { PrismaService } from '../prisma/prisma.service';

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

@Injectable()
export class WheelService {
  constructor(private prisma: PrismaService) {}

  async resolveOrgId(user: JwtPayload): Promise<string> {
    if (user.organizationId) return user.organizationId;
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Không có tổ chức');
    }
    const org = await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!org) throw new NotFoundException('Chưa có trường');
    return org.id;
  }

  private async ensureConfig(orgId: string) {
    let cfg = await this.prisma.wheelConfig.findUnique({ where: { organizationId: orgId } });
    if (!cfg) {
      cfg = await this.prisma.wheelConfig.create({
        data: { organizationId: orgId },
      });
    }
    return cfg;
  }

  private async getOrCreateDaily(userId: string, orgId: string) {
    const key = todayKey();
    let daily = await this.prisma.userWheelDaily.findUnique({
      where: { userId_dateKey: { userId, dateKey: key } },
    });
    if (!daily) {
      const cfg = await this.ensureConfig(orgId);
      daily = await this.prisma.userWheelDaily.create({
        data: {
          userId,
          dateKey: key,
          spinsRemaining: cfg.dailyFreeSpins,
        },
      });
    }
    return daily;
  }

  private bumpProgress(
    progress: Record<string, number>,
    key: WheelMissionKey,
    delta: number,
    target: number,
  ) {
    const next = Math.min(target, (progress[key] ?? 0) + delta);
    progress[key] = next;
    return progress;
  }

  async recordSortCorrect(userId: string, orgId: string | null) {
    if (!orgId) return;
    const daily = await this.getOrCreateDaily(userId, orgId);
    const progress = parseJson<Record<string, number>>(daily.missionProgress, {});
    this.bumpProgress(progress, 'SORT_CORRECT', 1, 999);
    await this.prisma.userWheelDaily.update({
      where: { id: daily.id },
      data: { missionProgress: JSON.stringify(progress) },
    });
  }

  async recordPlaySort(userId: string, orgId: string | null) {
    if (!orgId) return;
    const missions = await this.prisma.wheelMission.findMany({
      where: { organizationId: orgId, missionKey: 'PLAY_SORT', active: true },
    });
    const target = missions[0]?.targetCount ?? 3;
    const daily = await this.getOrCreateDaily(userId, orgId);
    const progress = parseJson<Record<string, number>>(daily.missionProgress, {});
    this.bumpProgress(progress, 'PLAY_SORT', 1, target);
    await this.prisma.userWheelDaily.update({
      where: { id: daily.id },
      data: { missionProgress: JSON.stringify(progress) },
    });
  }

  private pickPrize<T extends { weight: number }>(prizes: T[]): T {
    const total = prizes.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of prizes) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return prizes[prizes.length - 1];
  }

  async getState(user: JwtPayload) {
    const orgId = await this.resolveOrgId(user);
    const cfg = await this.ensureConfig(orgId);
    const daily = await this.getOrCreateDaily(user.sub, orgId);

    const progress = parseJson<Record<string, number>>(daily.missionProgress, {});
    progress.DAILY_LOGIN = 1;
    await this.prisma.userWheelDaily.update({
      where: { id: daily.id },
      data: { missionProgress: JSON.stringify(progress) },
    });

    const prizes = await this.prisma.wheelPrize.findMany({
      where: { organizationId: orgId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
    const missions = await this.prisma.wheelMission.findMany({
      where: { organizationId: orgId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
    const claimed = parseJson<string[]>(daily.missionsClaimed, []);

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { greenPoints: true },
    });

    return {
      config: cfg,
      spinsRemaining: daily.spinsRemaining,
      spinsUsedToday: daily.spinsUsedToday,
      spinsTowardBonus: daily.spinsTowardBonus,
      bonusEverySpins: cfg.bonusEverySpins,
      greenPoints: dbUser?.greenPoints ?? 0,
      prizes: prizes.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        value: p.value,
        color: p.color,
        icon: p.icon,
      })),
      missions: missions.map((m) => {
        const current = progress[m.missionKey] ?? 0;
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          missionKey: m.missionKey,
          targetCount: m.targetCount,
          rewardSpins: m.rewardSpins,
          current,
          done: current >= m.targetCount,
          claimed: claimed.includes(m.id),
        };
      }),
    };
  }

  async spin(user: JwtPayload) {
    if (!canPlayGames(user.role)) {
      throw new ForbiddenException('Tài khoản không được quay vòng quay');
    }
    const orgId = await this.resolveOrgId(user);
    const cfg = await this.ensureConfig(orgId);
    const daily = await this.getOrCreateDaily(user.sub, orgId);

    if (daily.spinsRemaining <= 0) {
      throw new BadRequestException('Bạn đã hết lượt quay hôm nay');
    }

    const prizes = await this.prisma.wheelPrize.findMany({
      where: { organizationId: orgId, active: true },
    });
    if (prizes.length === 0) {
      throw new BadRequestException('Chưa cấu hình giải thưởng');
    }

    const prize = this.pickPrize(prizes);
    let spinsRemaining = daily.spinsRemaining - 1;
    let spinsTowardBonus = daily.spinsTowardBonus + 1;
    let bonusGranted = false;

    if (cfg.bonusEverySpins > 0 && spinsTowardBonus >= cfg.bonusEverySpins) {
      spinsTowardBonus = 0;
      spinsRemaining += 1;
      bonusGranted = true;
    }

    if (prize.type === 'SPIN' && prize.value > 0) {
      spinsRemaining += prize.value;
    }

    await this.prisma.userWheelDaily.update({
      where: { id: daily.id },
      data: {
        spinsRemaining,
        spinsUsedToday: daily.spinsUsedToday + 1,
        spinsTowardBonus,
      },
    });

    if (prize.type === 'POINTS' && prize.value > 0) {
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { greenPoints: { increment: prize.value } },
      });
    }

    await this.prisma.wheelSpinLog.create({
      data: {
        userId: user.sub,
        prizeId: prize.id,
        prizeName: prize.name,
        prizeType: prize.type,
        value: prize.value,
      },
    });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { greenPoints: true },
    });

    return {
      prize: {
        id: prize.id,
        name: prize.name,
        type: prize.type,
        value: prize.value,
        color: prize.color,
        icon: prize.icon,
      },
      spinsRemaining,
      spinsTowardBonus,
      bonusGranted,
      greenPoints: dbUser?.greenPoints ?? 0,
    };
  }

  async claimMission(user: JwtPayload, missionId: string) {
    if (!canPlayGames(user.role)) {
      throw new ForbiddenException('Tài khoản không nhận được nhiệm vụ vòng quay');
    }
    const orgId = await this.resolveOrgId(user);
    const cfg = await this.ensureConfig(orgId);
    if (!cfg.extraSpinsEnabled) {
      throw new BadRequestException('Nhiệm vụ thưởng lượt quay đang tắt');
    }

    const mission = await this.prisma.wheelMission.findFirst({
      where: { id: missionId, organizationId: orgId, active: true },
    });
    if (!mission) throw new NotFoundException('Nhiệm vụ không tồn tại');

    const daily = await this.getOrCreateDaily(user.sub, orgId);
    const progress = parseJson<Record<string, number>>(daily.missionProgress, {});
    const claimed = parseJson<string[]>(daily.missionsClaimed, []);

    if (claimed.includes(missionId)) {
      throw new BadRequestException('Đã nhận thưởng nhiệm vụ này');
    }
    if ((progress[mission.missionKey] ?? 0) < mission.targetCount) {
      throw new BadRequestException('Chưa hoàn thành nhiệm vụ');
    }
    if (daily.extraSpinsEarned >= cfg.maxExtraSpinsPerDay) {
      throw new BadRequestException('Đã đạt giới hạn lượt quay thưởng trong ngày');
    }

    claimed.push(missionId);
    await this.prisma.userWheelDaily.update({
      where: { id: daily.id },
      data: {
        spinsRemaining: daily.spinsRemaining + mission.rewardSpins,
        extraSpinsEarned: daily.extraSpinsEarned + mission.rewardSpins,
        missionsClaimed: JSON.stringify(claimed),
      },
    });

    return {
      rewardSpins: mission.rewardSpins,
      spinsRemaining: daily.spinsRemaining + mission.rewardSpins,
    };
  }

  async getHistory(user: JwtPayload, limit = 50) {
    const rows = await this.prisma.wheelSpinLog.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, limit),
    });
    return rows;
  }

  // ——— Admin ———

  async adminGetAll(user: JwtPayload) {
    const orgId = await this.resolveOrgId(user);
    const [config, prizes, missions] = await Promise.all([
      this.ensureConfig(orgId),
      this.prisma.wheelPrize.findMany({
        where: { organizationId: orgId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.wheelMission.findMany({
        where: { organizationId: orgId },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    return { config, prizes, missions };
  }

  async adminUpdateConfig(
    user: JwtPayload,
    data: Partial<{
      dailyFreeSpins: number;
      resetHour: number;
      extraSpinsEnabled: boolean;
      maxExtraSpinsPerDay: number;
      bonusEverySpins: number;
    }>,
  ) {
    const orgId = await this.resolveOrgId(user);
    await this.ensureConfig(orgId);
    return this.prisma.wheelConfig.update({
      where: { organizationId: orgId },
      data,
    });
  }

  async adminCreatePrize(
    user: JwtPayload,
    data: {
      name: string;
      type: WheelPrizeType;
      value: number;
      weight: number;
      color?: string;
      icon?: string;
    },
  ) {
    const orgId = await this.resolveOrgId(user);
    const maxOrder = await this.prisma.wheelPrize.aggregate({
      where: { organizationId: orgId },
      _max: { sortOrder: true },
    });
    return this.prisma.wheelPrize.create({
      data: {
        organizationId: orgId,
        name: data.name,
        type: data.type,
        value: data.value,
        weight: data.weight,
        color: data.color ?? '#10b981',
        icon: data.icon,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async adminUpdatePrize(
    user: JwtPayload,
    id: string,
    data: Partial<{
      name: string;
      type: WheelPrizeType;
      value: number;
      weight: number;
      color: string;
      icon: string;
      active: boolean;
      sortOrder: number;
    }>,
  ) {
    const orgId = await this.resolveOrgId(user);
    const prize = await this.prisma.wheelPrize.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!prize) throw new NotFoundException();
    return this.prisma.wheelPrize.update({ where: { id }, data });
  }

  async adminDeletePrize(user: JwtPayload, id: string) {
    const orgId = await this.resolveOrgId(user);
    const prize = await this.prisma.wheelPrize.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!prize) throw new NotFoundException();
    await this.prisma.wheelPrize.delete({ where: { id } });
    return { ok: true };
  }

  async adminCreateMission(
    user: JwtPayload,
    data: {
      title: string;
      description: string;
      missionKey: WheelMissionKey;
      targetCount: number;
      rewardSpins: number;
    },
  ) {
    const orgId = await this.resolveOrgId(user);
    const maxOrder = await this.prisma.wheelMission.aggregate({
      where: { organizationId: orgId },
      _max: { sortOrder: true },
    });
    return this.prisma.wheelMission.create({
      data: {
        organizationId: orgId,
        ...data,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async adminUpdateMission(
    user: JwtPayload,
    id: string,
    data: Partial<{
      title: string;
      description: string;
      missionKey: WheelMissionKey;
      targetCount: number;
      rewardSpins: number;
      active: boolean;
    }>,
  ) {
    const orgId = await this.resolveOrgId(user);
    const m = await this.prisma.wheelMission.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!m) throw new NotFoundException();
    return this.prisma.wheelMission.update({ where: { id }, data });
  }

  async adminDeleteMission(user: JwtPayload, id: string) {
    const orgId = await this.resolveOrgId(user);
    const m = await this.prisma.wheelMission.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!m) throw new NotFoundException();
    await this.prisma.wheelMission.delete({ where: { id } });
    return { ok: true };
  }
}
