import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import {
  LeaderboardMode,
  LeaderboardService,
} from './leaderboard.service';

function parseMode(mode?: string): LeaderboardMode {
  if (mode === 'sort' || mode === 'quiz' || mode === 'wheel' || mode === 'total') {
    return mode;
  }
  return 'green';
}

@Controller('leaderboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Get('class')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  classBoard(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('mode') mode?: string,
  ) {
    return this.leaderboard.classLeaderboard(user, classId, parseMode(mode));
  }

  @Get('classes')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  classes(@CurrentUser() user: JwtPayload) {
    return this.leaderboard.classAggregate(user);
  }

  @Get('my-rank')
  @Roles(Role.STUDENT)
  myRank(
    @CurrentUser() user: JwtPayload,
    @Query('mode') mode?: string,
  ) {
    return this.leaderboard.getMyRank(user, parseMode(mode));
  }
}
