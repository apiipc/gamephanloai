import { Role } from '@prisma/client';
import { JwtPayload } from './decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lớp giáo viên được phép xem / quản lý:
 * - Các lớp có teacherId = giáo viên đó
 * - Nếu chưa gắn GVCN nào: tất cả lớp có HS trong cùng trường (organizationId)
 */
export async function getTeacherManagedClassIds(
  prisma: PrismaService,
  user: JwtPayload,
): Promise<string[]> {
  if (user.role !== Role.TEACHER || !user.organizationId) return [];

  const assigned = await prisma.class.findMany({
    where: { organizationId: user.organizationId, teacherId: user.sub },
    select: { id: true },
  });
  if (assigned.length > 0) {
    return assigned.map((c) => c.id);
  }

  const orgClasses = await prisma.class.findMany({
    where: {
      organizationId: user.organizationId,
      students: { some: {} },
    },
    select: { id: true },
  });
  return orgClasses.map((c) => c.id);
}

export function canPlayGames(role: Role): boolean {
  return (
    role === Role.STUDENT ||
    role === Role.TEACHER ||
    role === Role.ORG_ADMIN ||
    role === Role.SUPER_ADMIN
  );
}
