import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtPayload } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeQuizQuestion } from './quiz-text.util';

const CORRECT_POINTS = 10;
const WRONG_POINTS = -5;
const COMBO_STREAK = 3;
const COMBO_BONUS = 10;
const COMPLETION_BONUS = 20;
const DEFAULT_SECONDS = 10;
const DEFAULT_COUNT = 10;

function maxConsecutiveCorrect(
  answers: { isCorrect: boolean }[],
): number {
  let best = 0;
  let cur = 0;
  for (const a of answers) {
    if (a.isCorrect) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  private assertTeacher(user: JwtPayload) {
    const allowed: Role[] = [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.TEACHER];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Không có quyền quản lý quiz');
    }
  }

  /** Trường quản lý: tài khoản gán trường; Super Admin dùng trường đầu tiên trong DB. */
  private async resolveOrgId(user: JwtPayload): Promise<string> {
    if (user.role === Role.SUPER_ADMIN) {
      const org = await this.prisma.organization.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!org) {
        throw new BadRequestException('Chưa có trường nào. Tạo trường trước khi quản lý quiz.');
      }
      return org.id;
    }
    if (!user.organizationId) {
      throw new ForbiddenException('Tài khoản chưa gán trường');
    }
    return user.organizationId;
  }

  async getConfigForOrg(organizationId: string) {
    let cfg = await this.prisma.quizConfig.findUnique({
      where: { organizationId },
    });
    if (!cfg) {
      cfg = await this.prisma.quizConfig.create({
        data: {
          organizationId,
          secondsPerQuestion: DEFAULT_SECONDS,
          questionsPerRound: DEFAULT_COUNT,
        },
      });
    }
    return cfg;
  }

  async getPublicConfig(user: JwtPayload) {
    if (!user.organizationId) {
      return { secondsPerQuestion: DEFAULT_SECONDS, questionsPerRound: DEFAULT_COUNT };
    }
    const cfg = await this.getConfigForOrg(user.organizationId);
    return {
      secondsPerQuestion: cfg.secondsPerQuestion,
      questionsPerRound: cfg.questionsPerRound,
    };
  }

  private questionWhere(orgId: string | null | undefined) {
    return {
      active: true,
      OR: [{ organizationId: null }, ...(orgId ? [{ organizationId: orgId }] : [])],
    };
  }

  async startSession(user: JwtPayload) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Chỉ học sinh được chơi quiz');
    }
    if (!user.organizationId) {
      throw new BadRequestException('Học sinh chưa được gán trường');
    }

    const cfg = await this.getConfigForOrg(user.organizationId);
    const pool = await this.prisma.quizQuestion.findMany({
      where: this.questionWhere(user.organizationId),
    });

    if (pool.length === 0) {
      throw new BadRequestException('Chưa có câu hỏi quiz. Giáo viên cần tải câu hỏi lên.');
    }

    const count = Math.min(cfg.questionsPerRound, pool.length);
    const picked = shuffle(pool).slice(0, count);

    const session = await this.prisma.quizSession.create({
      data: {
        userId: user.sub,
        totalCount: count,
        secondsPerQuestion: cfg.secondsPerQuestion,
        questionIds: JSON.stringify(picked.map((q) => q.id)),
      },
    });

    return {
      sessionId: session.id,
      secondsPerQuestion: cfg.secondsPerQuestion,
      totalCount: count,
      questions: picked.map((q) => ({
        id: q.id,
        question: sanitizeQuizQuestion(q.question),
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        options: shuffle([
          { key: 'A', text: q.optionA },
          { key: 'B', text: q.optionB },
          { key: 'C', text: q.optionC },
          { key: 'D', text: q.optionD },
        ]),
      })),
    };
  }

  async submitAnswer(
    user: JwtPayload,
    sessionId: string,
    questionId: string,
    chosen: string,
  ) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Phiên quiz không tồn tại');
    }
    if (session.finishedAt) {
      throw new BadRequestException('Phiên quiz đã kết thúc');
    }

    const ids: string[] = JSON.parse(session.questionIds);
    if (!ids.includes(questionId)) {
      throw new BadRequestException('Câu hỏi không thuộc phiên này');
    }

    const existing = await this.prisma.quizAnswer.findFirst({
      where: { sessionId, questionId },
    });
    if (existing) {
      throw new BadRequestException('Đã trả lời câu này');
    }

    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException();

    const key = chosen.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(key)) {
      throw new BadRequestException('Đáp án không hợp lệ');
    }

    const isCorrect = key === question.correctOption.toUpperCase();
    const pointsDelta = isCorrect ? CORRECT_POINTS : WRONG_POINTS;

    await this.prisma.quizAnswer.create({
      data: {
        sessionId,
        questionId,
        chosen: key,
        isCorrect,
        pointsDelta,
      },
    });

    let comboBonus = 0;
    if (isCorrect) {
      const prior = await this.prisma.quizAnswer.findMany({
        where: { sessionId },
        orderBy: { answeredAt: 'asc' },
      });
      let streak = 0;
      for (const a of prior) {
        if (a.isCorrect) streak++;
        else streak = 0;
      }
      if (streak > 0 && streak % COMBO_STREAK === 0) {
        comboBonus = COMBO_BONUS;
      }
    }

    const updated = await this.prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        score: { increment: pointsDelta + comboBonus },
        correctCount: { increment: isCorrect ? 1 : 0 },
      },
    });

    const allAnswers = await this.prisma.quizAnswer.findMany({
      where: { sessionId },
      orderBy: { answeredAt: 'asc' },
    });
    let currentStreak = 0;
    for (const a of allAnswers) {
      if (a.isCorrect) currentStreak++;
      else currentStreak = 0;
    }

    return {
      isCorrect,
      pointsDelta,
      comboBonus,
      currentStreak,
      correctOption: question.correctOption,
      explanation: question.explanation,
      session: {
        score: updated.score,
        correctCount: updated.correctCount,
        totalCount: updated.totalCount,
      },
    };
  }

  async finishSession(user: JwtPayload, sessionId: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== user.sub) {
      throw new NotFoundException();
    }
    if (session.finishedAt) {
      return session;
    }

    const answers = await this.prisma.quizAnswer.findMany({
      where: { sessionId },
      orderBy: { answeredAt: 'asc' },
    });
    const maxCombo = maxConsecutiveCorrect(answers);
    const answeredAll = answers.length >= session.totalCount && session.totalCount > 0;
    const completionBonus = answeredAll ? COMPLETION_BONUS : 0;

    const finished = await this.prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        finishedAt: new Date(),
        score: { increment: completionBonus },
      },
    });

    const pointsToCredit = Math.max(0, finished.score);
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { greenPoints: { increment: pointsToCredit } },
    });

    return {
      ...finished,
      maxCombo,
      completionBonus,
    };
  }

  // ——— Admin / Giáo viên ———

  async adminGetConfig(user: JwtPayload) {
    this.assertTeacher(user);
    return this.getConfigForOrg(await this.resolveOrgId(user));
  }

  async adminUpdateConfig(
    user: JwtPayload,
    data: { secondsPerQuestion?: number; questionsPerRound?: number },
  ) {
    this.assertTeacher(user);
    const orgId = await this.resolveOrgId(user);
    await this.getConfigForOrg(orgId);
    return this.prisma.quizConfig.update({
      where: { organizationId: orgId },
      data: {
        ...(data.secondsPerQuestion != null && {
          secondsPerQuestion: Math.max(5, Math.min(120, data.secondsPerQuestion)),
        }),
        ...(data.questionsPerRound != null && {
          questionsPerRound: Math.max(1, Math.min(50, data.questionsPerRound)),
        }),
      },
    });
  }

  async adminListQuestions(user: JwtPayload) {
    this.assertTeacher(user);
    const orgId = await this.resolveOrgId(user);
    return this.prisma.quizQuestion.findMany({
      where: {
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminCreateQuestion(
    user: JwtPayload,
    dto: {
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation?: string;
    },
  ) {
    this.assertTeacher(user);
    const key = dto.correctOption.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(key)) {
      throw new BadRequestException('correctOption phải là A, B, C hoặc D');
    }
    return this.prisma.quizQuestion.create({
      data: {
        ...dto,
        question: sanitizeQuizQuestion(dto.question),
        correctOption: key,
        organizationId: await this.resolveOrgId(user),
        createdById: user.sub,
      },
    });
  }

  async adminImportQuestions(
    user: JwtPayload,
    items: {
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation?: string;
    }[],
  ) {
    this.assertTeacher(user);
    const orgId = await this.resolveOrgId(user);
    let created = 0;
    for (const item of items) {
      const key = item.correctOption?.toUpperCase();
      if (!item.question || !key || !['A', 'B', 'C', 'D'].includes(key)) continue;
      await this.prisma.quizQuestion.create({
        data: {
          question: sanitizeQuizQuestion(item.question.trim()),
          optionA: item.optionA.trim(),
          optionB: item.optionB.trim(),
          optionC: item.optionC.trim(),
          optionD: item.optionD.trim(),
          correctOption: key,
          explanation: item.explanation?.trim() || null,
          organizationId: orgId,
          createdById: user.sub,
        },
      });
      created++;
    }
    return { created, total: items.length };
  }

  async adminUpdateQuestion(
    user: JwtPayload,
    id: string,
    dto: Partial<{
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation: string;
      active: boolean;
    }>,
  ) {
    this.assertTeacher(user);
    const q = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    const orgId = await this.resolveOrgId(user);
    if (q.organizationId && q.organizationId !== orgId) {
      throw new ForbiddenException();
    }
    if (dto.correctOption) {
      dto.correctOption = dto.correctOption.toUpperCase();
    }
    return this.prisma.quizQuestion.update({ where: { id }, data: dto });
  }

  async adminDeleteQuestion(user: JwtPayload, id: string) {
    this.assertTeacher(user);
    const q = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    const orgId = await this.resolveOrgId(user);
    if (q.organizationId && q.organizationId !== orgId) {
      throw new ForbiddenException();
    }
    await this.prisma.quizQuestion.delete({ where: { id } });
    return { ok: true };
  }
}
