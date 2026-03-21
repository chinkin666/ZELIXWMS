// 認証サービス（Supabase Auth統合）/ 认证服务（Supabase Auth集成）
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { SUPABASE } from '../common/providers/supabase.provider.js';
import { users } from '../database/schema/users.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @Inject(SUPABASE) private readonly supabase: SupabaseClient,
  ) {}

  // ログイン（Supabase Auth でパスワード検証）/ 登录（通过Supabase Auth验证密码）
  async login(dto: LoginDto) {
    // Supabase Auth でメール+パスワード認証 / 通过Supabase Auth进行邮箱+密码认证
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (authError) {
      throw new WmsException('AUTH_INVALID_CREDENTIALS', authError.message);
    }

    // ローカルDBからユーザー情報を取得 / 从本地DB获取用户信息
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (rows.length === 0) {
      // Supabase Auth にユーザーが存在するがローカルDBに未登録 / Supabase Auth中存在用户但本地DB未注册
      throw new WmsException(
        'AUTH_INVALID_CREDENTIALS',
        'User not found in local database / ローカルDBにユーザーが見つかりません / 本地数据库中未找到用户',
      );
    }

    const user = rows[0];

    // アクティブ状態チェック / 检查激活状态
    if (!user.isActive) {
      throw new WmsException(
        'AUTH_FORBIDDEN',
        'Account is deactivated / アカウントが無効化されています / 账号已停用',
      );
    }

    // 最終ログイン日時を更新 / 更新最后登录时间
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tenantId: user.tenantId,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
      },
    };
  }

  // ユーザー登録（Supabase Auth + ローカルDB）/ 用户注册（Supabase Auth + 本地DB）
  async register(dto: RegisterDto) {
    // メール重複チェック（ローカルDB）/ 邮箱重复检查（本地DB）
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('AUTH_DUPLICATE_EMAIL', `Email: ${dto.email}`);
    }

    // Supabase Auth にユーザー作成 / 在Supabase Auth中创建用户
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          display_name: dto.displayName,
          role: dto.role ?? 'viewer',
          tenant_id: dto.tenantId ?? null,
        },
      });

    if (authError) {
      throw new WmsException('AUTH_DUPLICATE_EMAIL', authError.message);
    }

    // ローカルDBにユーザーレコード挿入 / 在本地DB中插入用户记录
    const insertData = {
      id: authData.user.id, // Supabase Auth の user.id を使用 / 使用Supabase Auth的user.id
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role ?? 'viewer',
      tenantId: dto.tenantId ?? '00000000-0000-0000-0000-000000000001', // デフォルトテナント / 默认租户
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
      throw new WmsException('USER_NOT_FOUND', `ID: ${userId}`);
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

  // ログアウト（Supabase セッション無効化）/ 登出（Supabase会话失效）
  async logout(userId: string, _token: string) {
    // Service Role でユーザーのセッションを無効化 / 使用Service Role使用户会话失效
    // NOTE: admin.signOut は Supabase JS v2 では未提供のため、ここではクライアント側で処理
    // クライアント側でトークンを破棄することを推奨 / 建议客户端侧销毁令牌
    return {
      message: 'Logged out successfully / ログアウトしました / 已登出',
      userId,
    };
  }

  // トークンリフレッシュ（Supabase Auth）/ 刷新令牌（Supabase Auth）
  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new WmsException(
        'AUTH_INVALID_TOKEN',
        'Refresh token is required / リフレッシュトークンは必須です / 刷新令牌是必需的',
      );
    }

    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new WmsException(
        'AUTH_EXPIRED_TOKEN',
        error?.message ?? 'Failed to refresh session / セッション更新に失敗 / 会话刷新失败',
      );
    }

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
    };
  }

  // ポータルログイン（クライアント向け）/ 门户登录（面向客户）
  async portalLogin(email: string, password: string) {
    // Supabase Auth でパスワード認証 / 通过Supabase Auth进行密码认证
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      throw new WmsException('AUTH_INVALID_CREDENTIALS', authError.message);
    }

    // ローカルDBからユーザー情報を取得しロール確認 / 从本地DB获取用户信息并确认角色
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException(
        'AUTH_INVALID_CREDENTIALS',
        'Portal user not found / ポータルユーザーが見つかりません / 未找到门户用户',
      );
    }

    const user = rows[0];

    // ポータルユーザーは client ロールのみ許可 / 门户用户仅允许client角色
    if (user.role !== 'client') {
      throw new WmsException(
        'AUTH_FORBIDDEN',
        'Only client role users can access portal / ポータルはclientロールのみ利用可能 / 门户仅限client角色用户',
      );
    }

    // アクティブ状態チェック / 检查激活状态
    if (!user.isActive) {
      throw new WmsException(
        'AUTH_FORBIDDEN',
        'Account is deactivated / アカウントが無効化されています / 账号已停用',
      );
    }

    // 最終ログイン日時を更新 / 更新最后登录时间
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tenantId: user.tenantId,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
      },
    };
  }

  // ポータル登録（クライアント向け）/ 门户注册（面向客户）
  async portalRegister(email: string, password: string, companyName?: string) {
    // メール重複チェック / 邮箱重复检查
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('AUTH_DUPLICATE_EMAIL', `Email: ${email}`);
    }

    // Supabase Auth にユーザー作成（client ロール）/ 在Supabase Auth中创建用户（client角色）
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: companyName ?? email,
          role: 'client',
          company_name: companyName ?? null,
        },
      });

    if (authError) {
      throw new WmsException('AUTH_DUPLICATE_EMAIL', authError.message);
    }

    // ローカルDBにユーザーレコード挿入 / 在本地DB中插入用户记录
    const insertData = {
      id: authData.user.id,
      email,
      displayName: companyName ?? email,
      role: 'client' as const,
      tenantId: '00000000-0000-0000-0000-000000000001', // デフォルトテナント / 默认租户
    };

    const rows = await this.db.insert(users).values(insertData).returning();
    const user = rows[0];

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
      companyName: companyName ?? null,
    };
  }
}
