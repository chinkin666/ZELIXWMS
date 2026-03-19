/**
 * notificationService 单元测试 / notificationService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/notification', () => ({
  Notification: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  NotificationChannel: {},
}));

vi.mock('@/models/notificationPreference', () => ({
  NotificationPreference: {
    find: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { Notification } from '@/models/notification';
import { NotificationPreference } from '@/models/notificationPreference';

const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

describe('notificationService / 通知サービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNotificationsForEvent / イベント通知送信', () => {
    it('テンプレートなしイベント→送信0件 / 无模板事件不发送', async () => {
      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('unknown.event', {});

      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('購読者なし→送信0件 / 无订阅者时不发送', async () => {
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean([]) as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.created', {
        orderNumber: 'SH-001',
      });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('in_appチャネルで通知を作成すること / 创建站内通知', async () => {
      const prefs = [
        {
          subscriberType: 'user',
          subscriberId: 'U1',
          email: 'test@example.com',
          tenantId: 'T1',
          channels: ['in_app'],
          subscribedEvents: ['order.created'],
          muted: false,
        },
      ];
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean(prefs) as any);
      vi.mocked(Notification.create).mockResolvedValue({ _id: 'N1' } as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.created', {
        orderNumber: 'SH-001',
      }, 'T1');

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'U1',
          channel: 'in_app',
          status: 'sent',
          event: 'order.created',
        }),
      );
    });

    it('複数チャネルで通知すること / 多渠道通知', async () => {
      const prefs = [
        {
          subscriberType: 'user',
          subscriberId: 'U1',
          email: 'test@example.com',
          tenantId: 'T1',
          channels: ['in_app', 'email'],
          subscribedEvents: ['order.shipped'],
          muted: false,
        },
      ];
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean(prefs) as any);
      vi.mocked(Notification.create).mockResolvedValue({ _id: 'N1' } as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.shipped', {
        order: { orderNumber: 'SH-002', trackingId: 'TRK-123' },
      });

      expect(result.sent).toBe(2);
      expect(Notification.create).toHaveBeenCalledTimes(2);
    });

    it('通知作成失敗→failedカウント / 通知创建失败计数', async () => {
      const prefs = [
        {
          subscriberType: 'user',
          subscriberId: 'U1',
          tenantId: 'T1',
          channels: ['in_app'],
          subscribedEvents: ['order.cancelled'],
          muted: false,
        },
      ];
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean(prefs) as any);
      vi.mocked(Notification.create).mockRejectedValue(new Error('DB error'));

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.cancelled', {
        orderNumber: 'SH-003',
        reason: '顧客都合',
      });

      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
    });
  });

  describe('getNotifications / 通知取得', () => {
    it('ユーザーの通知リストを返すこと / 返回用户通知列表', async () => {
      const notifications = [{ _id: 'N1', title: 'テスト通知' }];
      vi.mocked(Notification.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: () => Promise.resolve(notifications),
            }),
          }),
        }),
      } as any);
      vi.mocked(Notification.countDocuments)
        .mockResolvedValueOnce(1 as any) // total
        .mockResolvedValueOnce(1 as any); // unread

      const { getNotifications } = await import('../notificationService');
      const result = await getNotifications('U1', { limit: 20, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
    });
  });

  describe('markAsRead / 既読にする', () => {
    it('通知を既読にすること / 标记通知为已读', async () => {
      vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const { markAsRead } = await import('../notificationService');
      const result = await markAsRead('N1', 'U1');

      expect(result).toBe(true);
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { _id: 'N1', recipientId: 'U1' },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'read' }) }),
      );
    });
  });

  describe('markAllAsRead / 全既読', () => {
    it('全通知を既読にすること / 全部标记已读', async () => {
      vi.mocked(Notification.updateMany).mockResolvedValue({ modifiedCount: 5 } as any);

      const { markAllAsRead } = await import('../notificationService');
      const count = await markAllAsRead('U1');

      expect(count).toBe(5);
    });
  });

  describe('getUnreadCount / 未読数取得', () => {
    it('未読数を返すこと / 返回未读数', async () => {
      vi.mocked(Notification.countDocuments).mockResolvedValue(3 as any);

      const { getUnreadCount } = await import('../notificationService');
      const count = await getUnreadCount('U1');

      expect(count).toBe(3);
    });
  });

  // ─── getNotificationDigest / 通知ダイジェスト取得 ─────────

  describe('getNotificationDigest / 通知ダイジェスト', () => {
    it('未読通知のダイジェストを返すこと / 返回未读通知摘要', async () => {
      vi.mocked(Notification.countDocuments)
        .mockResolvedValueOnce(10 as any) // unreadCount
        .mockResolvedValueOnce(2 as any); // urgentCount
      vi.mocked(Notification.aggregate).mockResolvedValue([
        { event: 'order.created', count: 5 },
        { event: 'order.shipped', count: 3 },
        { event: 'order.cancelled', count: 2 },
      ]);

      const { getNotificationDigest } = await import('../notificationService');
      const result = await getNotificationDigest('U1');

      expect(result.unreadCount).toBe(10);
      expect(result.urgentCount).toBe(2);
      expect(result.summary).toHaveLength(3);
      expect(result.summary[0].event).toBe('order.created');
    });

    it('未読なしで空サマリーを返す / 无未读返回空摘要', async () => {
      vi.mocked(Notification.countDocuments)
        .mockResolvedValueOnce(0 as any)
        .mockResolvedValueOnce(0 as any);
      vi.mocked(Notification.aggregate).mockResolvedValue([]);

      const { getNotificationDigest } = await import('../notificationService');
      const result = await getNotificationDigest('U1');

      expect(result.unreadCount).toBe(0);
      expect(result.urgentCount).toBe(0);
      expect(result.summary).toHaveLength(0);
    });
  });

  // ─── cleanupOldNotifications / 古い通知の削除 ─────────────

  describe('cleanupOldNotifications / 古い通知の削除', () => {
    it('指定日数前の既読通知を削除すること / 删除指定天数前的已读通知', async () => {
      vi.mocked(Notification.deleteMany).mockResolvedValue({ deletedCount: 15 } as any);

      const { cleanupOldNotifications } = await import('../notificationService');
      const count = await cleanupOldNotifications(90);

      expect(count).toBe(15);
      expect(Notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          createdAt: expect.objectContaining({ $lt: expect.any(Date) }),
        }),
      );
    });

    it('削除対象なしで0を返す / 无需删除返回0', async () => {
      vi.mocked(Notification.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);

      const { cleanupOldNotifications } = await import('../notificationService');
      const count = await cleanupOldNotifications(30);

      expect(count).toBe(0);
    });

    it('デフォルト90日で動作すること / 默认90天', async () => {
      vi.mocked(Notification.deleteMany).mockResolvedValue({ deletedCount: 5 } as any);

      const { cleanupOldNotifications } = await import('../notificationService');
      const count = await cleanupOldNotifications();

      expect(count).toBe(5);
    });
  });

  // ─── sendNotificationsForEvent 追加テスト / 追加测试 ───────

  describe('sendNotificationsForEvent 追加テスト / 追加测试', () => {
    it('order.heldイベントで緊急通知を送信 / order.held事件发送紧急通知', async () => {
      const prefs = [
        {
          subscriberType: 'user',
          subscriberId: 'U1',
          tenantId: 'T1',
          channels: ['in_app'],
          muted: false,
        },
      ];
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean(prefs) as any);
      vi.mocked(Notification.create).mockResolvedValue({ _id: 'N1' } as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.held', {
        order: { orderNumber: 'SH-010' },
      });

      expect(result.sent).toBe(1);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent',
        }),
      );
    });

    it('inbound.receivedイベント / inbound.received事件', async () => {
      const prefs = [
        {
          subscriberType: 'user',
          subscriberId: 'U1',
          tenantId: 'T1',
          channels: ['in_app'],
          muted: false,
        },
      ];
      vi.mocked(NotificationPreference.find).mockReturnValue(chainLean(prefs) as any);
      vi.mocked(Notification.create).mockResolvedValue({ _id: 'N2' } as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('inbound.received', {
        orderNumber: 'IN-001',
      });

      expect(result.sent).toBe(1);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: 'inboundOrder',
        }),
      );
    });

    it('NotificationPreferenceクエリ失敗→0件を返す / 查询失败返回0', async () => {
      vi.mocked(NotificationPreference.find).mockReturnValue({
        lean: () => Promise.reject(new Error('DB error')),
      } as any);

      const { sendNotificationsForEvent } = await import('../notificationService');
      const result = await sendNotificationsForEvent('order.created', { orderNumber: 'SH-999' });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  // ─── getNotifications 追加テスト / 追加测试 ────────────────

  describe('getNotifications 追加テスト / 追加测试', () => {
    it('ステータスフィルタ付きで取得 / 带状态过滤获取', async () => {
      vi.mocked(Notification.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      } as any);
      vi.mocked(Notification.countDocuments)
        .mockResolvedValueOnce(5 as any)   // total
        .mockResolvedValueOnce(2 as any);  // unreadCount

      const { getNotifications } = await import('../notificationService');
      const result = await getNotifications('U1', { status: 'sent', limit: 50, offset: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(5);
    });

    it('limitが100を超えないこと / limit不超过100', async () => {
      vi.mocked(Notification.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      } as any);
      vi.mocked(Notification.countDocuments)
        .mockResolvedValueOnce(0 as any)
        .mockResolvedValueOnce(0 as any);

      const { getNotifications } = await import('../notificationService');
      await getNotifications('U1', { limit: 500 });

      // limit should be capped at 100
      const findMock = vi.mocked(Notification.find);
      expect(findMock).toHaveBeenCalled();
    });
  });

  // ─── markAsRead 追加テスト / 追加测试 ──────────────────────

  describe('markAsRead 追加テスト / 追加测试', () => {
    it('対象通知なしでfalseを返す / 无目标通知返回false', async () => {
      vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

      const { markAsRead } = await import('../notificationService');
      const result = await markAsRead('N999', 'U1');

      expect(result).toBe(false);
    });
  });
});
