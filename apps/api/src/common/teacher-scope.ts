import { Role } from '@prisma/client';
import { JwtPayload } from './decorators';
import { PrismaService } from '../prisma/prisma.service';

/** Chỉ các lớp đã gắn GVCN (teacherId) cho giáo viên này. */
export async function getTeacherManagedClassIds(
  prisma: PrismaService,
  user: JwtPayload,
): Promise<string[]> {
  if (user.role !== Role.TEACHER || !user.organizationId) return [];

  const assigned = await prisma.class.findMany({
    where: { organizationId: user.organizationId, teacherId: user.sub },
    select: { id: true },
  });
  return assigned.map((c) => c.id);
}

export function canPlayGames(role: Role): boolean {
  return (
    role === Role.STUDENT ||
    role === Role.TEACHER ||
    role === Role.ORG_ADMIN ||
    role === Role.SUPER_ADMIN
  );
}
