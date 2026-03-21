// 認証コントローラ / 认证控制器
import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { loginSchema, type LoginDto } from './dto/login.dto.js';
import { registerSchema, type RegisterDto } from './dto/register.dto.js';
import { updateProfileSchema, type UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ログイン（公開エンドポイント）/ 登录（公开端点）
  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ユーザー登録（公開エンドポイント）/ 用户注册（公开端点）
  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 現在のユーザープロフィール取得 / 获取当前用户资料
  @Get('me')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }

  // プロフィール更新 / 更新个人资料
  @Put('me')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
