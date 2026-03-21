// 認証サービスのテスト / 认证服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === login テスト / login 测试 ===
  describe('login', () => {
    // ログイン成功 / 登录成功
    it('should return user data on successful login', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      // update lastLoginAt のチェーン / 更新最后登录时间的链
      mockDb.returning.mockResolvedValueOnce([mockUser]);

      const result = await service.login({ email: 'test@example.com', password: 'pass' });

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
    });

    // ユーザーが見つからない場合 UnauthorizedException / 用户不存在时抛出 UnauthorizedException
    it('should throw UnauthorizedException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.login({ email: 'notfound@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // === register テスト / register 测试 ===
  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      displayName: '新規ユーザー',
      role: 'viewer',
      tenantId: 'tenant-001',
    };

    // 登録成功 / 注册成功
    it('should register a new user', async () => {
      // メール重複チェック: 既存なし / 邮箱重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      const newUser = { id: 'new-id', ...registerDto };
      mockDb.returning.mockResolvedValueOnce([newUser]);

      const result = await service.register(registerDto as any);

      expect(result).toHaveProperty('id', 'new-id');
      expect(result.email).toBe(registerDto.email);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // メール重複時 ConflictException / 邮箱重复时抛出 ConflictException
    it('should throw ConflictException for duplicate email', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.register({ email: 'test@example.com', displayName: 'dup', tenantId: 'tenant-001' } as any),
      ).rejects.toThrow(ConflictException);
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

    // ユーザーが見つからない場合 NotFoundException / 用户不存在时抛出 NotFoundException
    it('should throw NotFoundException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // === updateProfile テスト / updateProfile 测试 ===
  describe('updateProfile', () => {
    // プロフィール更新成功 / 更新个人资料成功
    it('should update user profile', async () => {
      const updateDto = { displayName: '更新名前' };
      // getProfile (findById) 呼び出し / getProfile 调用
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, ...updateDto }]);

      const result = await service.updateProfile(userId, updateDto);

      expect(result.displayName).toBe('更新名前');
      expect(mockDb.update).toHaveBeenCalled();
    });

    // 存在しないユーザーの更新 / 更新不存在的用户
    it('should throw NotFoundException when updating nonexistent user', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.updateProfile('nonexistent', { displayName: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
