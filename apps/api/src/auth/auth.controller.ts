import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';
import { normalizeEmail } from '../common/email';
import { CurrentUser, JwtPayload } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { AuthService } from './auth.service';

class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Email không hợp lệ',
  })
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(4)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
