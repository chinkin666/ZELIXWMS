/**
 * requirePermission 中间件测试 / requirePermission ミドルウェアテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/role', () => ({
  Role: {
    find: vi.fn(),
  },
}));

import { Role } from '@/models/role';

const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

// Express mock helpers
const mockReq = (user: any = null) => ({ user } as any);
const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};
const mockNext = vi.fn();

describe('requirePermission / 権限チェックミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // モジュールキャッシュをリセット（権限キャッシュを含む）/ 重置模块缓存（含权限缓存）
    vi.resetModules();
  });

  describe('requirePermission(single)', () => {
    it('認証なし→401 / 未认证返回401', async () => {
      const { requirePermission } = await import('../requirePermission');
      const middleware = requirePermission('inbound:receive');
      const req = mockReq(null);
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('admin→全権限通過 / admin拥有全权限', async () => {
      const { requirePermission } = await import('../requirePermission');
      const middleware = requirePermission('inbound:receive');
      const req = mockReq({ role: 'admin' });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('ロールIDなし→403 / 无角色ID返回403', async () => {
      const { requirePermission } = await import('../requirePermission');
      const middleware = requirePermission('inbound:receive');
      const req = mockReq({ role: 'user', roleIds: [] });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('権限あり→通過 / 有权限则通过', async () => {
      vi.mocked(Role.find).mockReturnValue(chainLean([
        { permissions: ['inbound:view', 'inbound:receive', 'exception:create'] },
      ]) as any);

      const { requirePermission } = await import('../requirePermission');
      const middleware = requirePermission('inbound:receive');
      const req = mockReq({ role: 'user', roleIds: ['role-1'] });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('権限なし→403 / 无权限返回403', async () => {
      vi.mocked(Role.find).mockReturnValue(chainLean([
        { permissions: ['inbound:view'] },
      ]) as any);

      const { requirePermission } = await import('../requirePermission');
      const middleware = requirePermission('inbound:receive');
      const req = mockReq({ role: 'user', roleIds: ['role-1'] });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAnyPermission(multi)', () => {
    it('いずれかの権限があれば通過 / 拥有任一权限则通过', async () => {
      vi.mocked(Role.find).mockReturnValue(chainLean([
        { permissions: ['shipping:operate'] },
      ]) as any);

      const { requireAnyPermission } = await import('../requirePermission');
      const middleware = requireAnyPermission('inbound:receive', 'shipping:operate');
      const req = mockReq({ role: 'user', roleIds: ['role-1'] });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('どの権限もなし→403 / 无任何权限返回403', async () => {
      vi.mocked(Role.find).mockReturnValue(chainLean([
        { permissions: ['report:view'] },
      ]) as any);

      const { requireAnyPermission } = await import('../requirePermission');
      const middleware = requireAnyPermission('inbound:receive', 'shipping:operate');
      const req = mockReq({ role: 'user', roleIds: ['role-1'] });
      const res = mockRes();

      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
