import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../common/decorators';
import { getTeacherManagedClassIds } from '../common/teacher-scope';
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
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      if (!classIds.includes(targetClassId)) throw new ForbiddenException();
    }

    if (user.role === 'ORG_ADMIN' && user.organizationId) {
      const cls = await this.prisma.class.findFirst({
        where: { id: targetClassId, organizationId: user.organizationId },
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

  /** Điểm 3 trò của từng lớp (tổng HS trong lớp). */
  async managedClassesWithStats(user: JwtPayload) {
    let classWhere: { organizationId?: string; id?: { in: string[] } } = {};

    if (user.role === 'TEACHER') {
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      if (!classIds.length) return [];
      classWhere = { id: { in: classIds } };
    } else if (user.organizationId) {
      classWhere = { organizationId: user.organizationId };
    } else if (user.role !== 'SUPER_ADMIN') {
      return [];
    }

    const classes = await this.prisma.class.findMany({
      where: classWhere,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    const stats = await Promise.all(
      classes.map(async (cls) => {
        const rows = await this.buildClassRows(cls.id);
        const sortPoints = rows.reduce((s, r) => s + r.sortPoints, 0);
        const quizPoints = rows.reduce((s, r) => s + r.quizPoints, 0);
        const wheelPoints = rows.reduce((s, r) => s + r.wheelPoints, 0);
        return {
          classId: cls.id,
          className: cls.name,
          studentCount: rows.length,
          sortPoints,
          quizPoints,
          wheelPoints,
          totalPoints: sortPoints + quizPoints + wheelPoints,
        };
      }),
    );

    return stats
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }

  async classAggregate(user: JwtPayload) {
    const rows = await this.managedClassesWithStats(user);
    return rows.map((c) => ({
      rank: c.rank,
      classId: c.classId,
      className: c.className,
      totalPoints: c.totalPoints,
      studentCount: c.studentCount,
    }));
  }

  /** Điểm cá nhân khi GV/admin tự chơi (không cần classId). */
  async myPlayStats(user: JwtPayload) {
    const userId = user.sub;
    const [sortAgg, quizAgg, wheelAgg] = await Promise.all([
      this.prisma.gameSession.aggregate({
        where: { userId, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.quizSession.aggregate({
        where: { userId, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.wheelSpinLog.aggregate({
        where: { userId, prizeType: 'POINTS' },
        _sum: { value: true },
      }),
    ]);
    const sortPoints = sortAgg._sum.score ?? 0;
    const quizPoints = quizAgg._sum.score ?? 0;
    const wheelPoints = wheelAgg._sum.value ?? 0;
    return {
      sortPoints,
      quizPoints,
      wheelPoints,
      totalPoints: sortPoints + quizPoints + wheelPoints,
    };
  }

  async getMyRank(user: JwtPayload, mode: LeaderboardMode = 'green') {
    if (!user.classId) return null;
    const board = await this.classLeaderboard(user, user.classId, mode);
    return board.find((e) => e.id === user.sub) ?? null;
  }
}
