import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { QuizService } from './quiz.service';

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  chosen!: string;
}

class UpdateConfigDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  secondsPerQuestion?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  questionsPerRound?: number;
}

class QuestionDto {
  @IsString()
  @MinLength(3)
  question!: string;

  @IsString()
  optionA!: string;

  @IsString()
  optionB!: string;

  @IsString()
  optionC!: string;

  @IsString()
  optionD!: string;

  @IsString()
  correctOption!: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

class ImportDto {
  @IsArray()
  items!: QuestionDto[];
}

class PatchQuestionDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  optionA?: string;

  @IsOptional()
  @IsString()
  optionB?: string;

  @IsOptional()
  @IsString()
  optionC?: string;

  @IsOptional()
  @IsString()
  optionD?: string;

  @IsOptional()
  @IsString()
  correctOption?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private quiz: QuizService) {}

  @Get('config')
  getConfig(@CurrentUser() user: JwtPayload) {
    return this.quiz.getPublicConfig(user);
  }

  @Post('sessions/start')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  start(@CurrentUser() user: JwtPayload) {
    return this.quiz.startSession(user);
  }

  @Post('sessions/:id/answer')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  answer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnswerDto,
  ) {
    return this.quiz.submitAnswer(user, id, dto.questionId, dto.chosen);
  }

  @Post('sessions/:id/finish')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  finish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quiz.finishSession(user, id);
  }

  @Get('admin/config')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminConfig(@CurrentUser() user: JwtPayload) {
    return this.quiz.adminGetConfig(user);
  }

  @Patch('admin/config')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminUpdateConfig(@CurrentUser() user: JwtPayload, @Body() dto: UpdateConfigDto) {
    return this.quiz.adminUpdateConfig(user, dto);
  }

  @Get('admin/questions')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminList(@CurrentUser() user: JwtPayload) {
    return this.quiz.adminListQuestions(user);
  }

  @Post('admin/questions')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminCreate(@CurrentUser() user: JwtPayload, @Body() dto: QuestionDto) {
    return this.quiz.adminCreateQuestion(user, dto);
  }

  @Post('admin/questions/import')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminImport(@CurrentUser() user: JwtPayload, @Body() dto: ImportDto) {
    return this.quiz.adminImportQuestions(user, dto.items);
  }

  @Patch('admin/questions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminUpdate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchQuestionDto,
  ) {
    return this.quiz.adminUpdateQuestion(user, id, dto);
  }

  @Delete('admin/questions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER)
  adminDelete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quiz.adminDeleteQuestion(user, id);
  }
}
