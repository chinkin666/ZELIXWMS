/**
 * notificationController 统合测试 / 通知コントローラ統合テスト
 *
 * HTTP リクエスト→コントローラ→サービス のフローを検証
 * 验证 HTTP请求 → Controller → Service 的流程
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/notificationService', () => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
}));

vi.mock('@/models/notificationPreference', () => ({
  NotificationPreference: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '@/services/notificationService';
import { NotificationPreference } from '@/models/notificationPreference';

// req/res モックヘルパー / req/res mock辅助
const mockReq = (overrides: any = {}) => ({
  query: {},
  params: {},
  body: {},
  headers: {},
  user: { id: 'user-1', _id: 'user-1', tenantId: 'T1' },
  ...overrides,
}) as any;

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('notificationController / 通知コントローラ', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('listNotifications / 通知一覧', () => {
    it('認証済みユーザーの通知を返すこと / 返回已认证用户的通知', async () => {
      const data = { data: [{ _id: 'n1', title: 'テスト' }], total: 1, unreadCount: 1 };
      vi.mocked(getNotifications).mockResolvedValue(data as any);

      const { listNotifications } = await import('../notificationController');
      const req = mockReq({ query: { limit: '10', offset: '0' } });
      const res = mockRes();
      await listNotifications(req, res);

      expect(getNotifications).toHaveBeenCalledWith('user-1', { status: undefined, limit: 10, offset: 0 });
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('未認証の場合は401を返すこと / 未认证返回401', async () => {
      const { listNotifications } = await import('../notificationController');
      const req = mockReq({ user: null, query: {} });
      const res = mockRes();
      await listNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('サービスエラーで500を返すこと / 服务错误返回500', async () => {
      vi.mocked(getNotifications).mockRejectedValue(new Error('DB error'));

      const { listNotifications } = await import('../notificationController');
      const req = mockReq();
      const res = mockRes();
      await listNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('unreadCount / 未読数', () => {
    it('未読数を返すこと / 返回未读数', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(5 as any);

      const { unreadCount } = await import('../notificationController');
      const req = mockReq();
      const res = mockRes();
      await unreadCount(req, res);

      expect(res.json).toHaveBeenCalledWith({ unreadCount: 5 });
    });
  });

  describe('markRead / 既読', () => {
    it('通知を既読にすること / 标记已读', async () => {
      vi.mocked(markAsRead).mockResolvedValue(true);

      const { markRead } = await import('../notificationController');
      const req = mockReq({ params: { id: 'n1' } });
      const res = mockRes();
      await markRead(req, res);

      expect(markAsRead).toHaveBeenCalledWith('n1', 'user-1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('markReadAll / 全既読', () => {
    it('全通知を既読にすること / 全部标记已读', async () => {
      vi.mocked(markAllAsRead).mockResolvedValue(10 as any);

      const { markReadAll } = await import('../notificationController');
      const req = mockReq();
      const res = mockRes();
      await markReadAll(req, res);

      expect(res.json).toHaveBeenCalledWith({ markedCount: 10 });
    });
  });

  describe('getPreferences / 設定取得', () => {
    it('既存の設定を返すこと / 返回现有设置', async () => {
      const pref = { subscriberId: 'user-1', channels: ['in_app', 'email'] };
      vi.mocked(NotificationPreference.findOne).mockReturnValue({ lean: () => Promise.resolve(pref) } as any);

      const { getPreferences } = await import('../notificationController');
      const req = mockReq();
      const res = mockRes();
      await getPreferences(req, res);

      expect(res.json).toHaveBeenCalledWith(pref);
    });

    it('設定がない場合はデフォルトを返す / 无设置返回默认值', async () => {
      vi.mocked(NotificationPreference.findOne).mockReturnValue({ lean: () => Promise.resolve(null) } as any);

      const { getPreferences } = await import('../notificationController');
      const req = mockReq();
      const res = mockRes();
      await getPreferences(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ subscriberId: 'user-1', channels: ['in_app'] }),
      );
    });
  });

  describe('updatePreferences / 設定更新', () => {
    it('設定を更新すること / 更新设置', async () => {
      const updated = { subscriberId: 'user-1', channels: ['in_app', 'email'], muted: false };
      vi.mocked(NotificationPreference.findOneAndUpdate).mockReturnValue({ lean: () => Promise.resolve(updated) } as any);

      const { updatePreferences } = await import('../notificationController');
      const req = mockReq({
        body: { channels: ['in_app', 'email'], subscribedEvents: ['order.shipped'], email: 'test@example.com' },
      });
      const res = mockRes();
      await updatePreferences(req, res);

      expect(NotificationPreference.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });
});
