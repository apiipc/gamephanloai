import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { GameModule } from './game/game.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { QuizModule } from './quiz/quiz.module';
import { WheelModule } from './wheel/wheel.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    GameModule,
    LeaderboardModule,
    AdminModule,
    QuizModule,
    WheelModule,
  ],
})
export class AppModule {}
