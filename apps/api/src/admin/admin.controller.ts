import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role, TrashCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { AdminService } from './admin.service';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  className?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  fullName!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  className?: string;
}

class CreateTrashBodyDto {
  @IsString()
  name!: string;

  @IsEnum(TrashCategory)
  category!: TrashCategory;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

class UpdateTrashDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TrashCategory)
  category?: TrashCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class CreateClassDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.admin.dashboard(user);
  }

  @Get('organizations')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  organizations(@CurrentUser() user: JwtPayload) {
    return this.admin.listOrganizations(user);
  }

  @Get('classes')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  classes(@CurrentUser() user: JwtPayload) {
    return this.admin.listClasses(user);
  }

  @Post('classes')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  createClass(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.admin.createClass(user, dto.name, dto.teacherId);
  }

  @Get('users')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  users(@CurrentUser() user: JwtPayload) {
    return this.admin.listUsers(user);
  }

  @Post('users')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  createUser(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.admin.createUser(user, dto);
  }

  @Patch('users/:id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  updateUser(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(user, id, dto);
  }

  @Delete('users/:id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  deleteUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.deleteUser(user, id);
  }

  @Post('users/import')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  importUsers(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      users: {
        email: string;
        password: string;
        fullName: string;
        role: Role;
        className?: string;
      }[];
    },
  ) {
    return this.admin.importUsers(user, body.users ?? []);
  }

  @Get('trash-items')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  trashItems(@CurrentUser() user: JwtPayload) {
    return this.admin.listTrashItems(user);
  }

  @Post('trash-items')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  createTrash(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: CreateTrashBodyDto,
  ) {
    if (!image) {
      throw new BadRequestException('Cần upload ảnh vật phẩm');
    }
    return this.admin.createTrashItem(user, { ...dto, image });
  }

  @Post('trash-items/sync-manifest')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  syncTrashManifest(@CurrentUser() user: JwtPayload) {
    return this.admin.syncTrashManifest(user);
  }

  @Patch('trash-items/:id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  updateTrash(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: UpdateTrashDto,
  ) {
    return this.admin.updateTrashItem(user, id, dto, image);
  }

  @Delete('trash-items/:id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  deleteTrash(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.deleteTrashItem(user, id);
  }

  @Get('audit-logs')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  auditLogs(@CurrentUser() user: JwtPayload) {
    return this.admin.getAuditLogs(user);
  }
}
