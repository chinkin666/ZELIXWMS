// 認証コントローラ / 认证控制器
import { Controller, Get, Post, Put, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { loginSchema, type LoginDto } from './dto/login.dto.js';
import { registerSchema, type RegisterDto } from './dto/register.dto.js';
import { updateProfileSchema, type UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('api/auth')
@Public()
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

  // ログアウト（セッション無効化）/ 登出（会话失效）
  @Post('logout')
  logout(
    @CurrentUser() user: AuthUser,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') ?? '';
    return this.authService.logout(user.id, token);
  }

  // トークンリフレッシュ / 刷新令牌
  @Public()
  @Post('refresh-token')
  refreshToken(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
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
@Public()
export class PortalAuthController {
  constructor(private readonly authService: AuthService) {}

  // ポータルログイン / 门户登录
  @Public()
  @Post('login')
  portalLogin(@Body() body: { email: string; password: string }) {
    return this.authService.portalLogin(body.email, body.password);
  }

  // ポータルログイン（/auth/login パス互換）/ 门户登录（/auth/login 路径兼容）
  @Public()
  @Post('auth/login')
  portalAuthLogin(@Body() body: { email: string; password: string }) {
    return this.authService.portalLogin(body.email, body.password);
  }

  // ポータル登録 / 门户注册
  @Public()
  @Post('register')
  portalRegister(@Body() body: { email: string; password: string; companyName?: string }) {
    return this.authService.portalRegister(body.email, body.password, body.companyName);
  }

  // ポータル登録（/auth/register パス互換）/ 门户注册（/auth/register 路径兼容）
  @Public()
  @Post('auth/register')
  portalAuthRegister(@Body() body: { email: string; password: string; companyName?: string }) {
    return this.authService.portalRegister(body.email, body.password, body.companyName);
  }
}
