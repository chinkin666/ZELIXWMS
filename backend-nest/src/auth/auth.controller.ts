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

  // ログアウト（セッションクリアプレースホルダー）/ 登出（清除会话占位符）
  @Post('logout')
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.id);
  }

  // トークンリフレッシュ（プレースホルダー）/ 刷新令牌（占位符）
  @Post('refresh-token')
  refreshToken(@CurrentUser() user: AuthUser) {
    return this.authService.refreshToken(user.id);
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

// ポータル認証コントローラ / 门户认证控制器
@Controller('api/portal')
export class PortalAuthController {
  constructor(private readonly authService: AuthService) {}

  // ポータルログイン（プレースホルダー）/ 门户登录（占位符）
  @Public()
  @Post('login')
  portalLogin(@Body() body: { email: string; password: string }) {
    return this.authService.portalLogin(body.email, body.password);
  }

  // ポータル登録（プレースホルダー）/ 门户注册（占位符）
  @Public()
  @Post('register')
  portalRegister(@Body() body: { email: string; password: string; companyName?: string }) {
    return this.authService.portalRegister(body.email, body.password, body.companyName);
  }
}
