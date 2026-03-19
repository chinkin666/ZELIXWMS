/**
 * 通知 API 控制器 / 通知 API コントローラ
 *
 * 站内通知 CRUD + 偏好管理。
 * サイト内通知 CRUD + 設定管理。
 */

import type { Request, Response } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '@/services/notificationService';
import { NotificationPreference } from '@/models/notificationPreference';

/**
 * GET /api/notifications
 * 获取当前用户的站内通知 / 現在のユーザーのサイト内通知を取得
 */
export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id || req.query.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const result = await getNotifications(String(userId), {
      status: req.query.status as string,
      limit: Number(req.query.limit) || 20,
      offset: Number(req.query.offset) || 0,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/notifications/unread-count
 * 获取未读数 / 未読数を取得
 */
export async function unreadCount(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id || req.query.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const count = await getUnreadCount(String(userId));
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/notifications/:id/read
 * 标记已读 / 既読にする
 */
export async function markRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const ok = await markAsRead(req.params.id, String(userId));
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/notifications/read-all
 * 全部标记已读 / すべて既読にする
 */
export async function markReadAll(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const count = await markAllAsRead(String(userId));
    res.json({ markedCount: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/notifications/preferences
 * 获取通知偏好 / 通知設定を取得
 */
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id || req.query.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const pref = await NotificationPreference.findOne({
      subscriberId: String(userId),
    }).lean();

    res.json(pref || {
      subscriberId: String(userId),
      channels: ['in_app'],
      subscribedEvents: [
        'order.shipped', 'order.cancelled', 'order.held',
        'inbound.received', 'return.completed',
      ],
      muted: false,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * PUT /api/notifications/preferences
 * 更新通知偏好 / 通知設定を更新
 */
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id || req.query.userId || req.body.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { channels, subscribedEvents, muted, email } = req.body;

    const updated = await NotificationPreference.findOneAndUpdate(
      { subscriberId: String(userId) },
      {
        $set: {
          subscriberId: String(userId),
          subscriberType: 'user',
          channels: channels || ['in_app'],
          subscribedEvents: subscribedEvents || [],
          muted: muted ?? false,
          email,
          tenantId: (req as any).user?.tenantId,
        },
      },
      { upsert: true, new: true },
    ).lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
