import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TrashCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import {
  deleteTrashItemImageFile,
  moveTrashItemImage,
  saveTrashItemImage,
  TRASH_EMOJI_FALLBACK,
} from './trash-image.util';
import { syncTrashFromManifest } from './trash-manifest.sync';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private assertOrgAccess(user: JwtPayload, organizationId: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }
  }

  async log(user: JwtPayload, action: string, target?: string, metadata?: object) {
    await this.prisma.auditLog.create({
      data: {
        actorId: user.sub,
        action,
        target,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  private async studentScope(user: JwtPayload) {
    if (user.role === 'TEACHER') {
      const classes = await this.prisma.class.findMany({
        where: { teacherId: user.sub },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);
      return {
        studentWhere: {
          role: 'STUDENT' as Role,
          classId: { in: classIds.length ? classIds : ['__none__'] },
        },
        userIds: (
          await this.prisma.user.findMany({
            where: {
              role: 'STUDENT',
              classId: { in: classIds.length ? classIds : ['__none__'] },
            },
            select: { id: true },
          })
        ).map((u) => u.id),
      };
    }

    const orgFilter =
      user.role === 'SUPER_ADMIN' && !user.organizationId
        ? {}
        : { organizationId: user.organizationId! };

    const students = await this.prisma.user.findMany({
      where: { ...orgFilter, role: 'STUDENT' },
      select: { id: true },
    });

    return {
      studentWhere: { ...orgFilter, role: 'STUDENT' as Role },
      userIds: students.map((s) => s.id),
    };
  }

  async dashboard(user: JwtPayload) {
    const orgFilter =
      user.role === 'SUPER_ADMIN' && !user.organizationId
        ? {}
        : user.organizationId
          ? { organizationId: user.organizationId }
          : {};

    const { studentWhere, userIds } = await this.studentScope(user);
    const inUsers = { userId: { in: userIds.length ? userIds : [] } };

    const [
      userCount,
      classCount,
      sortPlays,
      quizPlays,
      wheelSpins,
      sortAgg,
      quizAgg,
      wheelAgg,
      students,
      sortByUser,
      quizByUser,
      wheelByUser,
      recentSessions,
    ] = await Promise.all([
      this.prisma.user.count({ where: studentWhere }),
      this.prisma.class.count({ where: orgFilter }),
      this.prisma.gameSession.count({
        where: { ...inUsers, finishedAt: { not: null } },
      }),
      this.prisma.quizSession.count({
        where: { ...inUsers, finishedAt: { not: null } },
      }),
      this.prisma.wheelSpinLog.count({ where: inUsers }),
      this.prisma.gameSession.aggregate({
        where: { ...inUsers, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.quizSession.aggregate({
        where: { ...inUsers, finishedAt: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.wheelSpinLog.aggregate({
        where: { ...inUsers, prizeType: 'POINTS' },
        _sum: { value: true },
      }),
      this.prisma.user.findMany({
        where: studentWhere,
        select: {
          id: true,
          fullName: true,
          email: true,
          greenPoints: true,
          class: { select: { name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      userIds.length
        ? this.prisma.gameSession.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, finishedAt: { not: null } },
            _sum: { score: true },
            _count: true,
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.quizSession.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, finishedAt: { not: null } },
            _sum: { score: true },
            _count: true,
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.wheelSpinLog.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, prizeType: 'POINTS' },
            _sum: { value: true },
            _count: true,
          })
        : Promise.resolve([]),
      this.prisma.gameSession.findMany({
        where: { ...inUsers, finishedAt: { not: null } },
        take: 8,
        orderBy: { finishedAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    const sortMap = new Map(
      sortByUser.map((r) => [
        r.userId,
        { points: r._sum.score ?? 0, plays: r._count },
      ]),
    );
    const quizMap = new Map(
      quizByUser.map((r) => [
        r.userId,
        { points: r._sum.score ?? 0, plays: r._count },
      ]),
    );
    const wheelMap = new Map(
      wheelByUser.map((r) => [
        r.userId,
        { points: r._sum.value ?? 0, spins: r._count },
      ]),
    );

    const playerScores = students
      .map((s) => {
      const sort = sortMap.get(s.id) ?? { points: 0, plays: 0 };
      const quiz = quizMap.get(s.id) ?? { points: 0, plays: 0 };
      const wheel = wheelMap.get(s.id) ?? { points: 0, spins: 0 };
      const totalPoints = sort.points + quiz.points + wheel.points;
      return {
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        className: s.class?.name ?? null,
        greenPoints: s.greenPoints,
        sortPoints: sort.points,
        sortPlays: sort.plays,
        quizPoints: quiz.points,
        quizPlays: quiz.plays,
        wheelPoints: wheel.points,
        wheelSpins: wheel.spins,
        totalPoints,
      };
    })
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      userCount,
      sessionCount: sortPlays + quizPlays + wheelSpins,
      classCount,
      recentSessions,
      games: {
        sort: {
          name: 'Phân loại siêu tốc',
          icon: '♻️',
          plays: sortPlays,
          totalPoints: sortAgg._sum.score ?? 0,
        },
        quiz: {
          name: 'Quiz môi trường',
          icon: '🧠',
          plays: quizPlays,
          totalPoints: quizAgg._sum.score ?? 0,
        },
        wheel: {
          name: 'Vòng quay xanh',
          icon: '🎡',
          plays: wheelSpins,
          totalPoints: wheelAgg._sum.value ?? 0,
        },
      },
      playerScores,
    };
  }

  async listOrganizations(user: JwtPayload) {
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.organizationId) return [];
      return this.prisma.organization.findMany({
        where: { id: user.organizationId },
      });
    }
    return this.prisma.organization.findMany({ orderBy: { name: 'asc' } });
  }

  async listClasses(user: JwtPayload) {
    const where =
      user.role === 'SUPER_ADMIN'
        ? {}
        : user.role === 'TEACHER'
          ? { teacherId: user.sub }
          : { organizationId: user.organizationId! };

    return this.prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, fullName: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async listUsers(user: JwtPayload) {
    if (user.role === 'TEACHER') {
      const classes = await this.prisma.class.findMany({
        where: { teacherId: user.sub },
        select: { id: true },
      });
      return this.prisma.user.findMany({
        where: { classId: { in: classes.map((c) => c.id) } },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          greenPoints: true,
          class: { select: { name: true } },
        },
      });
    }

    const where =
      user.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: user.organizationId! };

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        greenPoints: true,
        class: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /** Học sinh: nhập tên lớp — tìm trong org hoặc tạo mới (GV chỉ được lớp đã gán). */
  private async resolveClassForNewStudent(
    user: JwtPayload,
    organizationId: string,
    classId?: string,
    className?: string,
  ): Promise<string> {
    const nameInput = className?.trim();
    if (nameInput) {
      if (user.role === 'TEACHER') {
        const found = await this.prisma.class.findFirst({
          where: {
            teacherId: user.sub,
            organizationId,
            name: { equals: nameInput, mode: 'insensitive' },
          },
        });
        if (!found) {
          throw new BadRequestException(
            `Không có lớp «${nameInput}» trong số lớp bạn phụ trách. Nhập đúng tên lớp đã có.`,
          );
        }
        return found.id;
      }

      this.assertOrgAccess(user, organizationId);
      let cls = await this.prisma.class.findFirst({
        where: {
          organizationId,
          name: { equals: nameInput, mode: 'insensitive' },
        },
      });
      if (!cls) {
        cls = await this.prisma.class.create({
          data: { name: nameInput, organizationId },
        });
        await this.log(user, 'CREATE_CLASS', cls.id, {
          autoFromUserCreate: true,
        });
      }
      return cls.id;
    }

    if (!classId) {
      throw new BadRequestException('Học sinh cần nhập tên lớp');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new BadRequestException('Lớp không tồn tại');
    if (cls.organizationId !== organizationId) {
      throw new BadRequestException('Lớp không thuộc tổ chức');
    }
    this.assertOrgAccess(user, cls.organizationId);
    if (user.role === 'TEACHER' && cls.teacherId !== user.sub) {
      throw new ForbiddenException();
    }
    return classId;
  }

  async createUser(
    user: JwtPayload,
    data: {
      email: string;
      password: string;
      fullName: string;
      role: Role;
      classId?: string;
      className?: string;
      organizationId?: string;
    },
  ) {
    const orgId = data.organizationId || user.organizationId;
    if (!orgId && data.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Thiếu organization');
    }
    if (orgId) this.assertOrgAccess(user, orgId);

    if (user.role === 'TEACHER' && data.role !== 'STUDENT') {
      throw new ForbiddenException();
    }
    if (user.role === 'ORG_ADMIN' && data.role === 'SUPER_ADMIN') {
      throw new ForbiddenException();
    }

    let resolvedClassId: string | undefined;
    if (data.role === 'STUDENT') {
      if (!orgId) {
        throw new ForbiddenException('Thiếu organization cho học sinh');
      }
      resolvedClassId = await this.resolveClassForNewStudent(
        user,
        orgId,
        data.classId,
        data.className,
      );
    }

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        fullName: data.fullName,
        role: data.role,
        organizationId: orgId,
        classId: resolvedClassId,
      },
    });
    await this.log(user, 'CREATE_USER', created.id, { email: data.email });
    const { passwordHash: _, ...safe } = created;
    return safe;
  }

  async importUsers(
    user: JwtPayload,
    rows: {
      email: string;
      password: string;
      fullName: string;
      role: Role;
      className?: string;
    }[],
  ) {
    if (!rows.length) {
      throw new BadRequestException('Danh sách người dùng trống');
    }

    let orgId = user.organizationId;
    if (!orgId && user.role === 'SUPER_ADMIN') {
      const org = await this.prisma.organization.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      orgId = org?.id ?? null;
    }
    if (!orgId) {
      throw new ForbiddenException('Thiếu tổ chức');
    }

    let created = 0;
    const errors: { row: number; email: string; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        if (row.role === 'STUDENT' && !row.className?.trim()) {
          throw new BadRequestException('Học sinh cần có cột Lớp');
        }

        await this.createUser(user, {
          email: row.email.trim().toLowerCase(),
          password: row.password,
          fullName: row.fullName.trim(),
          role: row.role,
          className: row.className?.trim() || undefined,
          organizationId: orgId ?? undefined,
        });
        created++;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Không tạo được tài khoản';
        errors.push({
          row: rowNum,
          email: row.email,
          message,
        });
      }
    }

    await this.log(user, 'IMPORT_USERS', undefined, {
      created,
      failed: errors.length,
    });

    return {
      created,
      failed: errors.length,
      total: rows.length,
      errors,
    };
  }

  async listTrashItems(user: JwtPayload) {
    return this.prisma.trashItem.findMany({
      where: {
        OR: [
          { isGlobal: true },
          ...(user.organizationId
            ? [{ organizationId: user.organizationId }]
            : user.role === 'SUPER_ADMIN'
              ? [{}]
              : []),
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async syncTrashManifest(user: JwtPayload) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException();
    }
    const result = await syncTrashFromManifest(this.prisma);
    await this.log(user, 'SYNC_TRASH_MANIFEST', 'manifest');
    return result;
  }

  async createTrashItem(
    user: JwtPayload,
    data: {
      name: string;
      category: TrashCategory;
      image: Express.Multer.File;
      isGlobal?: boolean;
    },
  ) {
    const imageUrl = saveTrashItemImage(data.image, data.category, data.name);
    const created = await this.prisma.trashItem.create({
      data: {
        name: data.name.trim(),
        category: data.category,
        emoji: TRASH_EMOJI_FALLBACK[data.category],
        imageUrl,
        isGlobal: user.role === 'SUPER_ADMIN' ? (data.isGlobal ?? false) : false,
        organizationId:
          user.role === 'SUPER_ADMIN' && data.isGlobal
            ? null
            : user.organizationId,
      },
    });
    await this.log(user, 'CREATE_TRASH_ITEM', created.id);
    return created;
  }

  private assertTrashAccess(user: JwtPayload, item: { isGlobal: boolean; organizationId: string | null }) {
    if (
      !item.isGlobal &&
      item.organizationId &&
      user.organizationId !== item.organizationId &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException();
    }
  }

  async updateTrashItem(
    user: JwtPayload,
    id: string,
    data: Partial<{
      name: string;
      category: TrashCategory;
      active: boolean;
    }>,
    image?: Express.Multer.File,
  ) {
    const item = await this.prisma.trashItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    this.assertTrashAccess(user, item);

    const name = data.name?.trim() ?? item.name;
    const category = data.category ?? item.category;
    let imageUrl = item.imageUrl;

    if (image) {
      deleteTrashItemImageFile(item.imageUrl);
      imageUrl = saveTrashItemImage(image, category, name);
    } else if (data.category && data.category !== item.category && item.imageUrl) {
      imageUrl = moveTrashItemImage(item.imageUrl, category, name);
    }

    const updated = await this.prisma.trashItem.update({
      where: { id },
      data: {
        name,
        category,
        imageUrl,
        emoji: TRASH_EMOJI_FALLBACK[category],
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    await this.log(user, 'UPDATE_TRASH_ITEM', id);
    return updated;
  }

  async deleteTrashItem(user: JwtPayload, id: string) {
    const item = await this.prisma.trashItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();
    this.assertTrashAccess(user, item);

    const answers = await this.prisma.gameAnswer.count({
      where: { itemId: id },
    });
    if (answers > 0) {
      await this.prisma.trashItem.update({
        where: { id },
        data: { active: false },
      });
      await this.log(user, 'DEACTIVATE_TRASH_ITEM', id);
      return { ok: true, deactivated: true, message: 'Vật phẩm đã dùng trong lịch sử — chỉ tắt, không xóa hẳn' };
    }

    deleteTrashItemImageFile(item.imageUrl);
    await this.prisma.trashItem.delete({ where: { id } });
    await this.log(user, 'DELETE_TRASH_ITEM', id);
    return { ok: true, deactivated: false };
  }

  async createClass(user: JwtPayload, name: string, teacherId?: string) {
    if (!user.organizationId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException();
    }
    const orgId = user.organizationId!;
    this.assertOrgAccess(user, orgId);

    const created = await this.prisma.class.create({
      data: { name, organizationId: orgId, teacherId },
    });
    await this.log(user, 'CREATE_CLASS', created.id);
    return created;
  }

  async getAuditLogs(user: JwtPayload) {
    const where =
      user.role === 'SUPER_ADMIN'
        ? {}
        : {
            actor: { organizationId: user.organizationId! },
          };

    return this.prisma.auditLog.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, role: true } },
      },
    });
  }
}
