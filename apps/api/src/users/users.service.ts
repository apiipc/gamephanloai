import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByOrg(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        greenPoints: true,
        classId: true,
        class: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  findByClass(classId: string) {
    return this.prisma.user.findMany({
      where: { classId, role: 'STUDENT' },
      select: {
        id: true,
        fullName: true,
        email: true,
        greenPoints: true,
      },
      orderBy: { greenPoints: 'desc' },
    });
  }
}
