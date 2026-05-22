import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrashCategory } from '@prisma/client';
import { JwtPayload } from '../common/decorators';
import { canPlayGames } from '../common/teacher-scope';
import { PrismaService } from '../prisma/prisma.service';
import { WheelService } from '../wheel/wheel.service';

const CORRECT_POINTS = 10;
const WRONG_POINTS = -5;
const FINISH_BONUS = 10;
const DEFAULT_DURATION = 45;
const MAX_PLAYS_PER_DAY = 20;

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private wheel: WheelService,
  ) {}

  async getItems(user: JwtPayload) {
    const items = await this.prisma.trashItem.findMany({
      where: {
        active: true,
        OR: [
          { isGlobal: true },
          ...(user.organizationId
            ? [{ organizationId: user.organizationId }]
            : []),
        ],
      },
      select: { id: true, name: true, emoji: true, imageUrl: true, category: true },
    });
    return items;
  }

  private async assertPlayLimit(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await this.prisma.gameSession.count({
      where: { userId, startedAt: { gte: startOfDay } },
    });
    if (count >= MAX_PLAYS_PER_DAY) {
      throw new ForbiddenException('Đã hết lượt chơi hôm nay');
    }
  }

  async startSession(user: JwtPayload, durationSec = DEFAULT_DURATION) {
    if (!canPlayGames(user.role)) {
      throw new ForbiddenException('Tài khoản không được chơi game này');
    }
    await this.assertPlayLimit(user.sub);

    const active = await this.prisma.gameSession.findFirst({
      where: { userId: user.sub, finishedAt: null },
    });
    if (active) {
      const elapsed = (Date.now() - active.startedAt.getTime()) / 1000;
      if (elapsed < active.durationSec) {
        return active;
      }
      // Phiên cũ quá hạn (thoát game / refresh) — đóng để tạo phiên mới
      await this.prisma.gameSession.update({
        where: { id: active.id },
        data: { finishedAt: new Date() },
      });
    }

    return this.prisma.gameSession.create({
      data: {
        userId: user.sub,
        durationSec: Math.min(60, Math.max(30, durationSec)),
      },
    });
  }

  async submitAnswer(
    user: JwtPayload,
    sessionId: string,
    itemId: string,
    binChosen: TrashCategory,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Phiên chơi không tồn tại');
    }
    if (session.finishedAt) {
      throw new BadRequestException('Phiên chơi đã kết thúc');
    }

    const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
    if (elapsed > session.durationSec + 2) {
      await this.prisma.gameSession.update({
        where: { id: sessionId },
        data: { finishedAt: new Date() },
      });
      throw new BadRequestException('Hết giờ');
    }

    const item = await this.prisma.trashItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Món rác không tồn tại');

    const isCorrect = item.category === binChosen;
    const pointsDelta = isCorrect ? CORRECT_POINTS : WRONG_POINTS;

    await this.prisma.gameAnswer.create({
      data: {
        sessionId,
        itemId,
        binChosen,
        isCorrect,
        pointsDelta,
      },
    });

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score: { increment: pointsDelta },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        totalCount: { increment: 1 },
      },
    });

    if (isCorrect && user.organizationId) {
      this.wheel.recordSortCorrect(user.sub, user.organizationId).catch(() => {});
    }

    return {
      isCorrect,
      pointsDelta,
      correctCategory: item.category,
      session: updated,
    };
  }

  async finishSession(user: JwtPayload, sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Phiên chơi không tồn tại');
    }
    if (session.finishedAt) return session;

    const finalScore = session.score + FINISH_BONUS;
    const finished = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score: finalScore,
        finishedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { greenPoints: { increment: Math.max(0, finalScore) } },
    });

    if (user.organizationId) {
      this.wheel.recordPlaySort(user.sub, user.organizationId).catch(() => {});
    }

    return {
      ...finished,
      bonus: FINISH_BONUS,
    };
  }

  async getSession(user: JwtPayload, sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { item: true } } },
    });
    if (!session) throw new NotFoundException();
    if (
      session.userId !== user.sub &&
      user.role === 'STUDENT'
    ) {
      throw new ForbiddenException();
    }
    return session;
  }
}
