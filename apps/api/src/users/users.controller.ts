import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('classmates')
  @Roles(Role.STUDENT)
  classmates(@CurrentUser() user: JwtPayload) {
    if (!user.classId) return [];
    return this.users.findByClass(user.classId);
  }
}
