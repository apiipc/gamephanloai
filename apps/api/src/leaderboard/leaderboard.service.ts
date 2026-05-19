import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export type LeaderboardMode = 'green' | 'sort' | 'quiz' | 'wheel' | 'total';

export interface ClassLeaderboardRow {
  id: string;
  fullName: string;
  greenPoints: number;
  sortPoints: number;
  quizPoints: number;
  wheelPoints: number;
  totalPoints: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  private scoreFor(row: ClassLeaderboardRow, mode: LeaderboardMode): number {
    switch (mode) {
      case 'sort':
        return row.sortPoints;
      case 'quiz':
        return row.quizPoints;
      case 'wheel':
        return row.wheelPoints;
      case 'total':
        return row.totalPoints;
      default:
        return row.greenPoints;
    }
  }

  private withRanks(rows: ClassLeaderboardRow[], mode: LeaderboardMode) {
    return [...rows]
      .sort((a, b) => this.scoreFor(b, mode) - this.scoreFor(a, mode))
      .map((r, index) => ({
        rank: index + 1,
        ...r,
        score: this.scoreFor(r, mode),
      }));
  }

  private async assertClassAccess(user: JwtPayload, targetClassId: string) {
    if (user.role === 'STUDENT' && targetClassId !== user.classId) {
      throw new ForbiddenException();
    }

    if (user.role === 'TEACHER') {
      const cls = await this.prisma.class.findFirst({
        where: { id: targetClassId, teacherId: user.sub },
      });
      if (!cls) throw new ForbiddenException();
    }
  }

  private async buildClassRows(classId: string): Promise<ClassLeaderboardRow[]> {
    const students = await this.prisma.user.findMany({
      where: { classId, role: 'STUDENT' },
      select: {
        id: true,
        fullName: true,
        greenPoints: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const userIds = students.map((s) => s.id);
    if (!userIds.length) return [];

    const [sortByUser, quizByUser, wheelByUser] = await Promise.all([
      this.prisma.gameSession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.quizSession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.wheelSpinLog.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, prizeType: 'POINTS' },
        _sum: { value: true },
      }),
    ]);

    const sortMap = new Map(
      sortByUser.map((r) => [r.userId, r._sum.score ?? 0]),
    );
    const quizMap = new Map(
      quizByUser.map((r) => [r.userId, r._sum.score ?? 0]),
    );
    const wheelMap = new Map(
      wheelByUser.map((r) => [r.userId, r._sum.value ?? 0]),
    );

    return students.map((s) => {
      const sortPoints = sortMap.get(s.id) ?? 0;
      const quizPoints = quizMap.get(s.id) ?? 0;
      const wheelPoints = wheelMap.get(s.id) ?? 0;
      return {
        id: s.id,
        fullName: s.fullName,
        greenPoints: s.greenPoints,
        sortPoints,
        quizPoints,
        wheelPoints,
        totalPoints: sortPoints + quizPoints + wheelPoints,
      };
    });
  }

  async classLeaderboard(
    user: JwtPayload,
    classId?: string,
    mode: LeaderboardMode = 'green',
  ) {
    const targetClassId = classId || user.classId;
    if (!targetClassId) return [];

    await this.assertClassAccess(user, targetClassId);

    const rows = await this.buildClassRows(targetClassId);
    return this.withRanks(rows, mode);
  }

  async classAggregate(user: JwtPayload) {
    if (!user.organizationId && user.role !== 'SUPER_ADMIN') {
      return [];
    }

    const orgId = user.organizationId;
    const classes = await this.prisma.class.findMany({
      where: orgId ? { organizationId: orgId } : {},
      include: {
        students: {
          select: { greenPoints: true },
        },
      },
    });

    return classes
      .map((c) => ({
        classId: c.id,
        className: c.name,
        totalPoints: c.students.reduce((sum, s) => sum + s.greenPoints, 0),
        studentCount: c.students.length,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }

  async getMyRank(user: JwtPayload, mode: LeaderboardMode = 'green') {
    if (!user.classId) return null;
    const board = await this.classLeaderboard(user, user.classId, mode);
    return board.find((e) => e.id === user.sub) ?? null;
  }
}
