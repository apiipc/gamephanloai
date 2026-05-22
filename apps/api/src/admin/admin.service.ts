import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TrashCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_USER_PASSWORD } from '../common/default-password';
import { isValidEmail, normalizeEmail } from '../common/email';
import { JwtPayload } from '../common/decorators';
import { getTeacherManagedClassIds } from '../common/teacher-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  deleteTrashItemImageFile,
  moveTrashItemImage,
  saveTrashItemImage,
  TRASH_EMOJI_FALLBACK,
} from './trash-image.util';
import { syncTrashFromManifest } from './trash-manifest.sync';

const MAX_IMPORT_USERS = 2000;

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private assertOrgAccess(user: JwtPayload, organizationId: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }
  }

  /** Quyền sửa / reset MK / xóa tài khoản theo vai trò người thao tác. */
  private async assertCanManageUser(
    actor: JwtPayload,
    target: {
      role: Role;
      organizationId: string | null;
      classId: string | null;
      class: { teacherId: string | null } | null;
    },
  ) {
    if (actor.role === 'TEACHER') {
      if (target.role !== 'STUDENT') {
        throw new BadRequestException('Giáo viên chỉ quản lý được học sinh');
      }
      if (!actor.organizationId || target.organizationId !== actor.organizationId) {
        throw new ForbiddenException();
      }
      const classIds = await getTeacherManagedClassIds(this.prisma, actor);
      if (!target.classId || !classIds.includes(target.classId)) {
        throw new ForbiddenException('Học sinh không thuộc lớp bạn quản lý');
      }
      return;
    }

    if (actor.role === 'ORG_ADMIN') {
      if (target.role === 'SUPER_ADMIN') {
        throw new ForbiddenException();
      }
      if (!actor.organizationId || target.organizationId !== actor.organizationId) {
        throw new ForbiddenException();
      }
      return;
    }

    if (actor.role === 'SUPER_ADMIN') {
      if (
        actor.organizationId &&
        target.organizationId &&
        target.organizationId !== actor.organizationId
      ) {
        throw new ForbiddenException();
      }
      return;
    }

    throw new ForbiddenException();
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
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      const inClasses = classIds.length ? classIds : ['__none__'];
      return {
        studentWhere: {
          role: 'STUDENT' as Role,
          classId: { in: inClasses },
        },
        userIds: (
          await this.prisma.user.findMany({
            where: {
              role: 'STUDENT',
              classId: { in: inClasses },
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
    await this.pruneEmptyClasses(user);

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
      this.prisma.class.count({
        where: { ...orgFilter, students: { some: {} } },
      }),
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

  /** Xóa lớp không còn học sinh (sau khi admin xóa HS hoặc import Excel). */
  private async pruneEmptyClasses(user: JwtPayload): Promise<number> {
    if (user.role === 'TEACHER') {
      const orgId = user.organizationId;
      if (!orgId) return 0;
      return this.pruneEmptyClassesInOrg(user, orgId);
    }

    if (user.role === 'ORG_ADMIN' && user.organizationId) {
      return this.pruneEmptyClassesInOrg(user, user.organizationId);
    }

    if (user.role === 'SUPER_ADMIN') {
      const orgs = await this.prisma.organization.findMany({
        select: { id: true },
      });
      let total = 0;
      for (const org of orgs) {
        total += await this.pruneEmptyClassesInOrg(user, org.id);
      }
      return total;
    }

    return 0;
  }

  private async pruneEmptyClassesInOrg(
    user: JwtPayload,
    orgId: string,
  ): Promise<number> {
    const where: {
      organizationId: string;
      students: { none: Record<string, never> };
      teacherId?: string;
    } = {
      organizationId: orgId,
      students: { none: {} },
    };
    if (user.role === 'TEACHER') {
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      const emptyClasses = await this.prisma.class.findMany({
        where: {
          organizationId: orgId,
          students: { none: {} },
          id: { in: classIds.length ? classIds : ['__none__'] },
        },
        select: { id: true },
      });
      for (const cls of emptyClasses) {
        await this.prisma.class.delete({ where: { id: cls.id } });
      }
      return emptyClasses.length;
    }

    const emptyClasses = await this.prisma.class.findMany({
      where,
      select: { id: true },
    });

    for (const cls of emptyClasses) {
      await this.prisma.class.delete({ where: { id: cls.id } });
    }
    return emptyClasses.length;
  }

  async listClasses(user: JwtPayload) {
    await this.pruneEmptyClasses(user);

    let scope: { id?: { in: string[] }; organizationId?: string } = {};
    const teacherOnly = user.role === 'TEACHER';
    if (teacherOnly) {
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      scope = { id: { in: classIds.length ? classIds : ['__none__'] } };
    } else if (user.role === 'SUPER_ADMIN') {
      scope = {};
    } else {
      scope = { organizationId: user.organizationId! };
    }

    return this.prisma.class.findMany({
      where: {
        ...scope,
        ...(teacherOnly ||
        user.role === 'ORG_ADMIN' ||
        user.role === 'SUPER_ADMIN'
          ? {}
          : { students: { some: {} } }),
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async listUsers(user: JwtPayload) {
    if (user.role === 'TEACHER') {
      const classIds = await getTeacherManagedClassIds(this.prisma, user);
      return this.prisma.user.findMany({
        where: { classId: { in: classIds.length ? classIds : ['__none__'] } },
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
        const classIds = await getTeacherManagedClassIds(this.prisma, user);
        const found = await this.prisma.class.findFirst({
          where: {
            id: { in: classIds.length ? classIds : ['__none__'] },
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

  private async resolveOrgId(
    user: JwtPayload,
    organizationId?: string | null,
  ): Promise<string> {
    let orgId = organizationId || user.organizationId;
    if (!orgId && user.role === 'SUPER_ADMIN') {
      const org = await this.prisma.organization.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      orgId = org?.id ?? null;
    }
    if (!orgId) {
      throw new ForbiddenException('Thiếu tổ chức — đăng nhập tài khoản quản trị trường');
    }
    this.assertOrgAccess(user, orgId);
    return orgId;
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
    const email = normalizeEmail(data.email);

    if (!data.password || data.password.length < 6) {
      throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    }

    if (user.role === 'TEACHER' && data.role !== 'STUDENT') {
      throw new ForbiddenException();
    }
    if (user.role === 'ORG_ADMIN' && data.role === 'SUPER_ADMIN') {
      throw new ForbiddenException();
    }

    let orgId: string | null = null;
    if (data.role !== 'SUPER_ADMIN') {
      orgId = await this.resolveOrgId(user, data.organizationId);
    }

    let resolvedClassId: string | undefined;
    if (data.role === 'STUDENT') {
      resolvedClassId = await this.resolveClassForNewStudent(
        user,
        orgId!,
        data.classId,
        data.className,
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    let created;
    try {
      created = await this.prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(data.password, 10),
          fullName: data.fullName.trim(),
          role: data.role,
          organizationId: orgId,
          classId: resolvedClassId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('Email đã được sử dụng');
      }
      throw e;
    }
    await this.log(user, 'CREATE_USER', created.id, { email });
    const { passwordHash: _, ...safe } = created;
    return safe;
  }

  async updateUser(
    user: JwtPayload,
    id: string,
    dto: {
      fullName?: string;
      email?: string;
      password?: string;
      className?: string;
      classId?: string;
    },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { class: { select: { teacherId: true } } },
    });
    if (!target) throw new NotFoundException();
    await this.assertCanManageUser(user, target);

    const wantsClassChange =
      (dto.className !== undefined && dto.className.trim() !== '') ||
      dto.classId !== undefined;

    if (target.role !== 'STUDENT' && wantsClassChange) {
      throw new BadRequestException('Chỉ học sinh mới đổi được lớp');
    }

    let nextClassId = target.classId;
    if (wantsClassChange && target.organizationId) {
      nextClassId = await this.resolveClassForNewStudent(
        user,
        target.organizationId,
        dto.classId,
        dto.className !== undefined ? dto.className.trim() || undefined : undefined,
      );
    }

    const data: {
      fullName?: string;
      email?: string;
      passwordHash?: string;
      classId?: string | null;
    } = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();

    if (dto.email !== undefined) {
      const emailNext = normalizeEmail(dto.email);
      if (emailNext !== target.email) {
        const exists = await this.prisma.user.findUnique({
          where: { email: emailNext },
        });
        if (exists) throw new BadRequestException('Email đã được dùng');
      }
      data.email = emailNext;
    }

    if (dto.password !== undefined && dto.password.length > 0) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (wantsClassChange) data.classId = nextClassId;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Không có thông tin cập nhật');
    }

    const updated = await this.prisma.user.update({ where: { id }, data });
    await this.log(user, 'UPDATE_USER', id, { fields: Object.keys(data) });
    const { passwordHash: __, ...safe } = updated;
    return safe;
  }

  async resetUserPassword(user: JwtPayload, id: string) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { class: { select: { teacherId: true } } },
    });
    if (!target) throw new NotFoundException();
    await this.assertCanManageUser(user, target);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(DEFAULT_USER_PASSWORD, 10),
      },
    });
    await this.log(user, 'RESET_PASSWORD', id, { email: target.email });
    return { ok: true, defaultPassword: DEFAULT_USER_PASSWORD };
  }

  async deleteUser(user: JwtPayload, id: string) {
    if (user.sub === id) {
      throw new BadRequestException('Không thể xóa tài khoản đang đăng nhập');
    }

    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { class: { select: { teacherId: true } } },
    });
    if (!target) throw new NotFoundException();
    await this.assertCanManageUser(user, target);

    const quizOwned = await this.prisma.quizQuestion.count({
      where: { createdById: id },
    });
    if (quizOwned > 0) {
      throw new BadRequestException(
        'Không xóa được: tài khoản đã tạo câu hỏi quiz — hãy xóa hoặc chuyển quyền trước',
      );
    }

    await this.prisma.$transaction([
      this.prisma.class.updateMany({
        where: { teacherId: id },
        data: { teacherId: null },
      }),
      this.prisma.auditLog.deleteMany({ where: { actorId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    const classesRemoved = await this.pruneEmptyClasses(user);

    await this.log(user, 'DELETE_USER', id, {
      email: target.email,
      classesRemoved,
    });
    return { ok: true, classesRemoved };
  }

  /** Cập nhật GV/Admin khi import Excel (không qua assertCanManageStudent). */
  private async updateStaffFromImport(
    actor: JwtPayload,
    targetId: string,
    row: {
      email: string;
      password: string;
      fullName: string;
    },
    orgId: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException();
    if (target.organizationId && target.organizationId !== orgId) {
      throw new BadRequestException('Email thuộc tổ chức khác');
    }
    if (actor.role === 'TEACHER') {
      throw new ForbiddenException();
    }

    const emailNext = normalizeEmail(row.email);
    if (emailNext !== target.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: emailNext } });
      if (exists) throw new BadRequestException('Email đã được dùng');
    }

    const data: { fullName: string; email: string; passwordHash?: string } = {
      fullName: row.fullName.trim(),
      email: emailNext,
    };
    if (row.password?.length >= 6) {
      data.passwordHash = await bcrypt.hash(row.password, 10);
    }

    await this.prisma.user.update({ where: { id: targetId }, data });
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
    if (rows.length > MAX_IMPORT_USERS) {
      throw new BadRequestException(
        `Tối đa ${MAX_IMPORT_USERS} tài khoản mỗi lần import (file có ${rows.length})`,
      );
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
    let updated = 0;
    const errors: { row: number; email: string; message: string }[] = [];
    const importedStudentEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const email = normalizeEmail(row.email);
      try {
        if (!isValidEmail(email)) {
          throw new BadRequestException('Email không hợp lệ');
        }

        const password =
          row.password?.length >= 6 ? row.password : DEFAULT_USER_PASSWORD;

        if (row.role === 'STUDENT' && !row.className?.trim()) {
          throw new BadRequestException('Học sinh cần có cột Lớp');
        }

        const existing = await this.prisma.user.findUnique({
          where: { email },
        });

        if (existing) {
          if (existing.organizationId && existing.organizationId !== orgId) {
            throw new BadRequestException('Email thuộc tổ chức khác');
          }
          if (existing.role === 'STUDENT') {
            await this.updateUser(user, existing.id, {
              fullName: row.fullName.trim(),
              email,
              password,
              className:
                row.role === 'STUDENT' ? row.className?.trim() || undefined : undefined,
            });
          } else {
            await this.updateStaffFromImport(user, existing.id, {
              email,
              password,
              fullName: row.fullName,
            }, orgId);
          }
          updated++;
        } else {
          await this.createUser(user, {
            email,
            password,
            fullName: row.fullName.trim(),
            role: row.role,
            className: row.className?.trim() || undefined,
            organizationId: orgId ?? undefined,
          });
          created++;
        }

        if (row.role === 'STUDENT') {
          importedStudentEmails.add(email);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Không xử lý được tài khoản';
        errors.push({
          row: rowNum,
          email: row.email,
          message,
        });
      }
    }

    let removed = 0;
    let classesRemoved = 0;

    // Chỉ xóa HS không còn trong file khi mọi dòng import thành công (tránh xóa nhầm khi lỗi một phần)
    if (importedStudentEmails.size > 0 && errors.length === 0) {
      const staleWhere: {
        role: typeof Role.STUDENT;
        organizationId: string;
        email: { notIn: string[] };
        classId?: { in: string[] };
      } = {
        role: Role.STUDENT,
        organizationId: orgId,
        email: { notIn: [...importedStudentEmails] },
      };
      if (user.role === 'TEACHER') {
        const classIds = await getTeacherManagedClassIds(this.prisma, user);
        staleWhere.classId = { in: classIds.length ? classIds : ['__none__'] };
      }

      const staleStudents = await this.prisma.user.findMany({
        where: staleWhere,
        select: { id: true, email: true },
      });

      for (const stale of staleStudents) {
        try {
          await this.deleteUser(user, stale.id);
          removed++;
        } catch (e) {
          errors.push({
            row: 0,
            email: stale.email,
            message:
              e instanceof Error
                ? `Không xóa HS cũ: ${e.message}`
                : 'Không xóa HS cũ',
          });
        }
      }

      classesRemoved = await this.pruneEmptyClassesInOrg(user, orgId);
    }

    await this.log(user, 'IMPORT_USERS', undefined, {
      created,
      updated,
      removed,
      classesRemoved,
      failed: errors.length,
    });

    return {
      created,
      updated,
      removed,
      classesRemoved,
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

  async updateClass(
    user: JwtPayload,
    id: string,
    dto: { teacherId?: string | null; name?: string },
  ) {
    if (!user.organizationId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException();
    }
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Không tìm thấy lớp');
    this.assertOrgAccess(user, cls.organizationId);

    if (dto.teacherId !== undefined && dto.teacherId !== null) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: dto.teacherId,
          organizationId: cls.organizationId,
          role: Role.TEACHER,
        },
      });
      if (!teacher) {
        throw new BadRequestException('Giáo viên không hợp lệ');
      }
    }

    const updated = await this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
      },
      include: { teacher: { select: { id: true, fullName: true } } },
    });
    await this.log(user, 'UPDATE_CLASS', id);
    return updated;
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
