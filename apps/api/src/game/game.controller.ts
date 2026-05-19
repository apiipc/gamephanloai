import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TrashCategory, Role } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { GameService } from './game.service';

class StartDto {
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(60)
  durationSec?: number;
}

class AnswerDto {
  @IsString()
  itemId!: string;

  @IsEnum(TrashCategory)
  binChosen!: TrashCategory;
}

@Controller('game')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameController {
  constructor(private game: GameService) {}

  @Get('items')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  items(@CurrentUser() user: JwtPayload) {
    return this.game.getItems(user);
  }

  @Post('sessions/start')
  @Roles(Role.STUDENT)
  start(@CurrentUser() user: JwtPayload, @Body() dto: StartDto) {
    return this.game.startSession(user, dto.durationSec);
  }

  @Post('sessions/:id/answer')
  @Roles(Role.STUDENT)
  answer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnswerDto,
  ) {
    return this.game.submitAnswer(user, id, dto.itemId, dto.binChosen);
  }

  @Post('sessions/:id/finish')
  @Roles(Role.STUDENT)
  finish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.game.finishSession(user, id);
  }

  @Get('sessions/:id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.game.getSession(user, id);
  }
}
