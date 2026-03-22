// 認証サービスのテスト（Supabase Auth統合）/ 认证服务测试（Supabase Auth集成）
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { SUPABASE } from '../common/providers/supabase.provider';
import { WmsException } from '../common/exceptions/wms.exception';
import { AuthService } from './auth.service';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createSelectChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;
  let mockSupabase: any;

  // テスト用定数 / 测试用常量
  const userId = 'user-001';
  const mockUser = {
    id: userId,
    email: 'test@example.com',
    displayName: 'テストユーザー',
    role: 'admin',
    tenantId: 'tenant-001',
    warehouseIds: ['wh-001'],
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: 1700000000,
    token_type: 'bearer',
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
    };

    // Supabase クライアントモック / Supabase客户端mock
    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(),
        refreshSession: jest.fn(),
        admin: {
          createUser: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: SUPABASE, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === login テスト / login 测试 ===
  describe('login', () => {
    // ログイン成功 / 登录成功
    it('should return user and session on successful login', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: userId }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      // update lastLoginAt チェーン / 更新最后登录时间链
      mockDb.returning.mockResolvedValueOnce([mockUser]);

      const result = await service.login({ email: 'test@example.com', password: 'pass' });

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
      expect((result as any).session).toEqual(mockSession);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass',
      });
    });

    // Supabase Auth 認証失敗 / Supabase Auth认证失败
    it('should throw WmsException when Supabase auth fails', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        service.login({ email: 'wrong@example.com', password: 'bad' }),
      ).rejects.toThrow(WmsException);
    });

    // ローカルDBにユーザーが見つからない場合 / 本地DB中未找到用户
    it('should throw WmsException when user not in local DB', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'unknown-id' }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(WmsException);
    });

    // アカウント無効の場合 / 账号已停用
    it('should throw WmsException when account is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: userId }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([inactiveUser]));

      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === register テスト / register 测试 ===
  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'securepass123',
      displayName: '新規ユーザー',
      role: 'viewer' as const,
      tenantId: 'tenant-001',
    };

    // 登録成功 / 注册成功
    it('should register a new user via Supabase Auth + local DB', async () => {
      const supabaseUserId = 'supabase-new-id';
      // メール重複チェック: 既存なし / 邮箱重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: supabaseUserId } },
        error: null,
      });
      const newUser = { id: supabaseUserId, ...registerDto };
      mockDb.returning.mockResolvedValueOnce([newUser]);

      const result = await service.register(registerDto as any);

      expect(result).toHaveProperty('id', supabaseUserId);
      expect(result.email).toBe(registerDto.email);
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        email_confirm: true,
        user_metadata: {
          display_name: registerDto.displayName,
          role: registerDto.role,
          tenant_id: registerDto.tenantId,
        },
      });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // メール重複時（ローカルDB）/ 邮箱重复时（本地DB）
    it('should throw WmsException for duplicate email in local DB', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.register({ email: 'test@example.com', displayName: 'dup', password: 'pass', tenantId: 'tenant-001' } as any),
      ).rejects.toThrow(WmsException);
    });

    // Supabase Auth でのユーザー作成失敗 / Supabase Auth用户创建失败
    it('should throw WmsException when Supabase admin.createUser fails', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      await expect(
        service.register(registerDto as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === getProfile テスト / getProfile 测试 ===
  describe('getProfile', () => {
    // プロフィール取得成功 / 获取个人资料成功
    it('should return user profile', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));

      const result = await service.getProfile(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe(mockUser.email);
      expect(result).toHaveProperty('warehouseIds');
      expect(result).toHaveProperty('isActive');
    });

    // ユーザーが見つからない場合 / 用户不存在时
    it('should throw WmsException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.getProfile('nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === updateProfile テスト / updateProfile 测试 ===
  describe('updateProfile', () => {
    // プロフィール更新成功 / 更新个人资料成功
    it('should update user profile', async () => {
      const updateDto = { displayName: '更新名前' };
      // getProfile 呼び出し / getProfile 调用
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, ...updateDto }]);

      const result = await service.updateProfile(userId, updateDto);

      expect(result.displayName).toBe('更新名前');
      expect(mockDb.update).toHaveBeenCalled();
    });

    // 存在しないユーザーの更新 / 更新不存在的用户
    it('should throw WmsException when updating nonexistent user', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.updateProfile('nonexistent', { displayName: 'test' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === logout テスト / logout 测试 ===
  describe('logout', () => {
    // ログアウト成功 / 登出成功
    it('should return success message with userId', async () => {
      const result = await service.logout(userId, 'some-token');

      expect(result).toEqual({
        message: 'Logged out successfully / ログアウトしました / 已登出',
        userId,
      });
    });
  });

  // === refreshToken テスト / refreshToken 测试 ===
  describe('refreshToken', () => {
    // リフレッシュ成功 / 刷新成功
    it('should return new session on successful refresh', async () => {
      const newSession = { ...mockSession, access_token: 'new-access-token' };
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: newSession },
        error: null,
      });

      const result = await service.refreshToken('refresh-token-123');

      expect(result.session.access_token).toBe('new-access-token');
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'refresh-token-123',
      });
    });

    // リフレッシュトークンが空の場合 / 刷新令牌为空时
    it('should throw WmsException when refresh token is empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(WmsException);
    });

    // Supabase リフレッシュ失敗 / Supabase刷新失败
    it('should throw WmsException when Supabase refresh fails', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(WmsException);
    });

    // セッションが null の場合 / 会话为null时
    it('should throw WmsException when session is null', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(WmsException);
    });
  });

  // === portalLogin テスト / portalLogin 测试 ===
  describe('portalLogin', () => {
    const clientUser = { ...mockUser, role: 'client' };

    // ポータルログイン成功 / 门户登录成功
    it('should return user and session for client role user', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: userId }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([clientUser]));
      mockDb.returning.mockResolvedValueOnce([clientUser]);

      const result = await service.portalLogin('test@example.com', 'pass');

      expect(result.user.role).toBe('client');
      expect((result as any).session).toEqual(mockSession);
    });

    // Supabase Auth 認証失敗 / Supabase Auth认证失败
    it('should throw WmsException when Supabase auth fails', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.portalLogin('wrong@example.com', 'bad'),
      ).rejects.toThrow(WmsException);
    });

    // ローカルDBにユーザーが見つからない場合 / 本地DB中未找到用户
    it('should throw WmsException when portal user not in local DB', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'unknown-id' }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.portalLogin('test@example.com', 'pass'),
      ).rejects.toThrow(WmsException);
    });

    // client ロール以外は拒否 / 非client角色被拒绝
    it('should throw WmsException when user role is not client', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: userId }, session: mockSession },
        error: null,
      });
      // mockUser has role 'admin' / mockUser的角色是'admin'
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));

      await expect(
        service.portalLogin('test@example.com', 'pass'),
      ).rejects.toThrow(WmsException);
    });

    // アカウント無効の場合 / 账号已停用
    it('should throw WmsException when client account is deactivated', async () => {
      const inactiveClient = { ...clientUser, isActive: false };
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: userId }, session: mockSession },
        error: null,
      });
      mockDb.select.mockReturnValueOnce(createSelectChain([inactiveClient]));

      await expect(
        service.portalLogin('test@example.com', 'pass'),
      ).rejects.toThrow(WmsException);
    });
  });

  // === portalRegister テスト / portalRegister 测试 ===
  describe('portalRegister', () => {
    // ポータル登録成功 / 门户注册成功
    it('should register a portal user with client role', async () => {
      const supabaseUserId = 'supabase-portal-id';
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: supabaseUserId } },
        error: null,
      });
      const portalUser = {
        id: supabaseUserId,
        email: 'portal@example.com',
        displayName: 'PortalCo',
        role: 'client',
        tenantId: '00000000-0000-0000-0000-000000000001',
      };
      mockDb.returning.mockResolvedValueOnce([portalUser]);

      const result = await service.portalRegister('portal@example.com', 'pass123', 'PortalCo');

      expect(result.role).toBe('client');
      expect(result.displayName).toBe('PortalCo');
      expect(result.companyName).toBe('PortalCo');
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'portal@example.com',
        password: 'pass123',
        email_confirm: true,
        user_metadata: {
          display_name: 'PortalCo',
          role: 'client',
          company_name: 'PortalCo',
        },
      });
    });

    // companyName なしの場合 email をデフォルト使用 / 无companyName时使用email作为默认值
    it('should use email as displayName when companyName is not provided', async () => {
      const supabaseUserId = 'supabase-portal-id-2';
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: supabaseUserId } },
        error: null,
      });
      const portalUser = {
        id: supabaseUserId,
        email: 'nocompany@example.com',
        displayName: 'nocompany@example.com',
        role: 'client',
        tenantId: '00000000-0000-0000-0000-000000000001',
      };
      mockDb.returning.mockResolvedValueOnce([portalUser]);

      const result = await service.portalRegister('nocompany@example.com', 'pass123');

      expect(result.displayName).toBe('nocompany@example.com');
      expect(result.companyName).toBeNull();
    });

    // メール重複時 / 邮箱重复时
    it('should throw WmsException for duplicate email', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.portalRegister('existing@example.com', 'pass'),
      ).rejects.toThrow(WmsException);
    });

    // Supabase Auth でのユーザー作成失敗 / Supabase Auth用户创建失败
    it('should throw WmsException when Supabase admin.createUser fails', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      await expect(
        service.portalRegister('portal@example.com', 'pass'),
      ).rejects.toThrow(WmsException);
    });
  });
});
