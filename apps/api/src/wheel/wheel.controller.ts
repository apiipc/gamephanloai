import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WheelMissionKey, WheelPrizeType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Role } from '@prisma/client';
import { WheelService } from './wheel.service';

class UpdateWheelConfigDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyFreeSpins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  resetHour?: number;

  @IsOptional()
  @IsBoolean()
  extraSpinsEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxExtraSpinsPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bonusEverySpins?: number;
}

class WheelPrizeDto {
  @IsString()
  name!: string;

  @IsEnum(WheelPrizeType)
  type!: WheelPrizeType;

  @IsInt()
  value!: number;

  @IsInt()
  @Min(1)
  weight!: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class WheelMissionDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(WheelMissionKey)
  missionKey!: WheelMissionKey;

  @IsInt()
  @Min(1)
  targetCount!: number;

  @IsInt()
  @Min(1)
  rewardSpins!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('wheel')
@UseGuards(JwtAuthGuard)
export class WheelController {
  constructor(private wheel: WheelService) {}

  @Get('state')
  getState(@CurrentUser() user: JwtPayload) {
    return this.wheel.getState(user);
  }

  @Post('spin')
  spin(@CurrentUser() user: JwtPayload) {
    return this.wheel.spin(user);
  }

  @Post('missions/:id/claim')
  claimMission(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.wheel.claimMission(user, id);
  }

  @Get('history')
  history(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    return this.wheel.getHistory(user, limit ? parseInt(limit, 10) : 50);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  adminGet(@CurrentUser() user: JwtPayload) {
    return this.wheel.adminGetAll(user);
  }

  @Patch('admin/config')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  adminConfig(@CurrentUser() user: JwtPayload, @Body() dto: UpdateWheelConfigDto) {
    return this.wheel.adminUpdateConfig(user, dto);
  }

  @Post('admin/prizes')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  createPrize(@CurrentUser() user: JwtPayload, @Body() dto: WheelPrizeDto) {
    return this.wheel.adminCreatePrize(user, dto);
  }

  @Patch('admin/prizes/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  updatePrize(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: WheelPrizeDto,
  ) {
    return this.wheel.adminUpdatePrize(user, id, dto);
  }

  @Delete('admin/prizes/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  deletePrize(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.wheel.adminDeletePrize(user, id);
  }

  @Post('admin/missions')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  createMission(@CurrentUser() user: JwtPayload, @Body() dto: WheelMissionDto) {
    return this.wheel.adminCreateMission(user, dto);
  }

  @Patch('admin/missions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  updateMission(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: WheelMissionDto,
  ) {
    return this.wheel.adminUpdateMission(user, id, dto);
  }

  @Delete('admin/missions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  deleteMission(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.wheel.adminDeleteMission(user, id);
  }
}
