// 認証サービス / 认证服务
import { Inject, Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { users } from '../database/schema/users.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ログイン（プレースホルダー: 本番ではSupabase Authを使用）/ 登录（占位符：生产环境使用Supabase Auth）
  async login(dto: LoginDto) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (rows.length === 0) {
      throw new UnauthorizedException(
        'Invalid credentials / 認証情報が無効です / 凭证无效',
      );
    }

    const user = rows[0];

    // NOTE: 実際のパスワード検証はSupabase Authで行う / 实际密码验证由Supabase Auth处理
    // このプレースホルダーではメールの存在確認のみ / 此占位符仅确认邮箱存在

    // 最終ログイン日時を更新 / 更新最后登录时间
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  // ユーザー登録 / 用户注册
  async register(dto: RegisterDto) {
    // メール重複チェック / 邮箱重复检查
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `Email "${dto.email}" already exists / メール "${dto.email}" は既に登録済みです / 邮箱 "${dto.email}" 已存在`,
      );
    }

    const insertData = {
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role ?? 'viewer',
      tenantId: dto.tenantId,
    };

    const rows = await this.db.insert(users).values(insertData).returning();
    const user = rows[0];

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  // プロフィール取得 / 获取个人资料
  async getProfile(userId: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `User not found / ユーザーが見つかりません / 用户未找到`,
      );
    }

    const user = rows[0];
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
      warehouseIds: user.warehouseIds,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // プロフィール更新 / 更新个人资料
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // 存在確認 / 确认存在
    await this.getProfile(userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName;
    }

    const rows = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    const user = rows[0];
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
      warehouseIds: user.warehouseIds,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ログアウト（セッションクリアプレースホルダー）/ 登出（清除会话占位符）
  async logout(userId: string) {
    // NOTE: 実際のセッション無効化はSupabase Auth側で行う / 实际会话失效由Supabase Auth处理
    return { message: 'Logged out successfully / ログアウトしました / 已登出', userId };
  }

  // トークンリフレッシュ（プレースホルダー）/ 刷新令牌（占位符）
  async refreshToken(userId: string) {
    // NOTE: 実際のトークンリフレッシュはSupabase Auth側で行う / 实际令牌刷新由Supabase Auth处理
    return {
      token: `mock-refreshed-token-${userId}-${Date.now()}`,
      expiresIn: 3600,
      message: 'Token refreshed (placeholder) / トークンリフレッシュ（プレースホルダー）/ 令牌已刷新（占位符）',
    };
  }

  // ポータルログイン（プレースホルダー）/ 门户登录（占位符）
  async portalLogin(email: string, _password: string) {
    // NOTE: ポータル認証の実装は後日 / 门户认证实现待定
    return {
      message: 'Portal login placeholder / ポータルログインプレースホルダー / 门户登录占位符',
      email,
      token: `mock-portal-token-${Date.now()}`,
    };
  }

  // ポータル登録（プレースホルダー）/ 门户注册（占位符）
  async portalRegister(email: string, _password: string, companyName?: string) {
    // NOTE: ポータル登録の実装は後日 / 门户注册实现待定
    return {
      message: 'Portal registration placeholder / ポータル登録プレースホルダー / 门户注册占位符',
      email,
      companyName: companyName ?? null,
    };
  }
}
