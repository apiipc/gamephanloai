import { existsSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { GameModule } from './game/game.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { QuizModule } from './quiz/quiz.module';
import { WheelModule } from './wheel/wheel.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

function webStaticImports() {
  const root = process.env.WEB_DIST_PATH;
  if (!root || !existsSync(root)) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: root,
      exclude: ['/api/*path'],
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
  ];
}

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
    ...webStaticImports(),
  ],
})
export class AppModule {}
