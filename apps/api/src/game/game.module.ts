import { Module } from '@nestjs/common';
import { WheelModule } from '../wheel/wheel.module';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
  imports: [WheelModule],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
