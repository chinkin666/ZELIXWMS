/**
 * auth ミドルウェアテスト / 认证中间件测试
 *
 * JWT生成・検証・ロールチェックのテスト
 * JWT生成、验证、角色检查的测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockReq = (overrides: any = {}) => ({
  headers: {},
  query: {},
  user: undefined,
  ...overrides,
}) as any;

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('auth middleware / 認証ミドルウェア', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('generateToken / トークン生成', () => {
    it('JWT文字列を返すこと / 返回JWT字符串', async () => {
      const { generateToken } = await import('../auth');
      const token = generateToken({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'テスト',
        role: 'admin' as any,
        warehouseIds: [],
        tenantId: 'T1',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken / トークン検証', () => {
    it('有効なトークンを検証できること / 可以验证有效token', async () => {
      const { generateToken, verifyToken } = await import('../auth');
      const token = generateToken({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'テスト',
        role: 'admin' as any,
        warehouseIds: [],
        tenantId: 'T1',
      });

      const decoded = verifyToken(token);
      expect(decoded.id).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('無効なトークンでエラーを投げること / 无效token抛出错误', async () => {
      const { verifyToken } = await import('../auth');
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  });

  describe('requireAuth / 認証必須', () => {
    it('トークンなしで401を返す（本番モード） / 无token返回401（生产模式）', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { requireAuth } = await import('../auth');
      const req = mockReq({ headers: {} });
      const res = mockRes();

      requireAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('有効なトークンでreq.userを設定すること / 有效token设置req.user', async () => {
      const { generateToken, requireAuth } = await import('../auth');
      const token = generateToken({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'テスト',
        role: 'admin' as any,
        warehouseIds: [],
        tenantId: 'T1',
      });

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();

      requireAuth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
      expect(mockNext).toHaveBeenCalledWith(); // no error
    });
  });

  describe('optionalAuth / オプション認証', () => {
    it('トークンなしでも通過すること / 无token也放行', async () => {
      const { optionalAuth } = await import('../auth');
      const req = mockReq();
      const res = mockRes();

      optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('有効なトークンでreq.userを設定すること / 有效token设置req.user', async () => {
      const { generateToken, optionalAuth } = await import('../auth');
      const token = generateToken({
        id: 'user-1',
        email: 'a@b.com',
        displayName: 'A',
        role: 'admin' as any,
        warehouseIds: [],
        tenantId: 'T1',
      });

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
    });

    it('無効なトークンでもエラーにしない / 无效token不报错', async () => {
      const { optionalAuth } = await import('../auth');
      const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
      const res = mockRes();

      optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });
  });

  describe('requireRole / ロールチェック', () => {
    it('正しいロールで通過すること / 正确角色放行', async () => {
      const { requireRole } = await import('../auth');
      const middleware = requireRole('admin' as any);

      const req = mockReq({ user: { id: 'u1', role: 'admin' } });
      const res = mockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('不正なロールで403を返す / 错误角色返回403', async () => {
      const { requireRole } = await import('../auth');
      const middleware = requireRole('admin' as any);

      const req = mockReq({ user: { id: 'u1', role: 'viewer' } });
      const res = mockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 }),
      );
    });

    it('未認証で401を返す / 未认证返回401', async () => {
      const { requireRole } = await import('../auth');
      const middleware = requireRole('admin' as any);

      const req = mockReq({ user: undefined });
      const res = mockRes();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });
});
