/**
 * 通知サービス / 通知服务
 *
 * Hook 事件に応じてユーザー/顧客に通知を送信する。
 * 根据 Hook 事件向用户/客户发送通知。
 *
 * 渠道 / チャネル:
 * - in_app: 站内通知（MongoDB 存储）
 * - email: 邮件通知（nodemailer）
 * - webhook: 外部 Webhook（已有 WebhookDispatcher）
 */

import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';
import { Notification, type NotificationChannel, type INotification } from '@/models/notification';
import { NotificationPreference } from '@/models/notificationPreference';

// ─── 邮件配置 / メール設定 ───

const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    })
  : null;

const EMAIL_FROM = process.env.SMTP_FROM || 'noreply@zelix-wms.com';

// ─── 事件→通知模板映射 / イベント→通知テンプレートマッピング ───

interface NotificationTemplate {
  title: (data: Record<string, unknown>) => string;
  body: (data: Record<string, unknown>) => string;
  priority: INotification['priority'];
  referenceType?: string;
}

const EVENT_TEMPLATES: Record<string, NotificationTemplate> = {
  'order.created': {
    title: (d) => `新しい出荷指示: ${d.orderNumber || ''}`,
    body: (d) => `出荷指示 ${d.orderNumber} が作成されました。/ 出荷指示 ${d.orderNumber} 已创建。`,
    priority: 'normal',
    referenceType: 'shipmentOrder',
  },
  'order.confirmed': {
    title: (d) => `出荷指示確認: ${(d.order as any)?.orderNumber || ''}`,
    body: (d) => `出荷指示 ${(d.order as any)?.orderNumber} が確認されました。/ 出荷指示已确认。`,
    priority: 'normal',
    referenceType: 'shipmentOrder',
  },
  'order.shipped': {
    title: (d) => `出荷完了: ${(d.order as any)?.orderNumber || ''}`,
    body: (d) => {
      const order = d.order as any;
      return `出荷指示 ${order?.orderNumber} が出荷されました。追跡番号: ${order?.trackingId || '未設定'}\n` +
        `出荷指示 ${order?.orderNumber} 已出荷。追踪号: ${order?.trackingId || '未设定'}`;
    },
    priority: 'high',
    referenceType: 'shipmentOrder',
  },
  'order.cancelled': {
    title: (d) => `出荷指示キャンセル: ${d.orderNumber || ''}`,
    body: (d) => `出荷指示 ${d.orderNumber} がキャンセルされました。理由: ${d.reason || '不明'}\n` +
      `出荷指示 ${d.orderNumber} 已取消。原因: ${d.reason || '不明'}`,
    priority: 'high',
    referenceType: 'shipmentOrder',
  },
  'order.held': {
    title: (d) => `出荷指示保留: ${(d.order as any)?.orderNumber || ''}`,
    body: (d) => `出荷指示 ${(d.order as any)?.orderNumber} が保留されました。/ 出荷指示已保留。`,
    priority: 'urgent',
    referenceType: 'shipmentOrder',
  },
  'inbound.received': {
    title: (d) => `入庫完了: ${d.orderNumber || ''}`,
    body: (d) => `入庫予定 ${d.orderNumber} の受け入れが完了しました。/ 入库预定 ${d.orderNumber} 入库完了。`,
    priority: 'normal',
    referenceType: 'inboundOrder',
  },
  'inbound.putaway.completed': {
    title: (d) => `上架完了: ${d.orderNumber || ''}`,
    body: (d) => `入庫予定 ${d.orderNumber} の棚入れが完了しました。/ 入库预定 ${d.orderNumber} 上架完了。`,
    priority: 'normal',
    referenceType: 'inboundOrder',
  },
  'inventory.changed': {
    title: (d) => `在庫変動: ${d.sku || ''}`,
    body: (d) => `SKU ${d.sku} の在庫が変動しました。現在庫: ${d.currentStock}\n` +
      `SKU ${d.sku} 库存变动。当前库存: ${d.currentStock}`,
    priority: 'low',
    referenceType: 'stock',
  },
  'return.completed': {
    title: (d) => `返品完了: ${d.returnNumber || ''}`,
    body: (d) => `返品 ${d.returnNumber} の処理が完了しました。再入庫: ${d.restockedTotal}, 廃棄: ${d.disposedTotal}\n` +
      `退货 ${d.returnNumber} 处理完了。重新入库: ${d.restockedTotal}, 废弃: ${d.disposedTotal}`,
    priority: 'normal',
    referenceType: 'returnOrder',
  },
};

// ─── 公开 API / 公開 API ───

/**
 * 事件触发时发送通知 / イベント発生時に通知を送信
 *
 * 检查所有订阅了该事件的用户，按渠道发送通知。
 * イベントをサブスクライブする全ユーザーを確認し、チャネルごとに通知を送信。
 */
export async function sendNotificationsForEvent(
  event: string,
  payload: Record<string, unknown>,
  tenantId?: string,
): Promise<{ sent: number; failed: number }> {
  const template = EVENT_TEMPLATES[event];
  if (!template) return { sent: 0, failed: 0 };

  // 查找订阅了此事件的偏好 / このイベントをサブスクライブしている設定を検索
  const filter: Record<string, unknown> = {
    subscribedEvents: event,
    muted: false,
  };
  if (tenantId) filter.tenantId = tenantId;

  let preferences;
  try {
    preferences = await NotificationPreference.find(filter).lean();
  } catch (err) {
    logger.error({ event, err }, 'Failed to query notification preferences / 通知設定クエリ失敗');
    return { sent: 0, failed: 0 };
  }

  if (preferences.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  const title = template.title(payload);
  const body = template.body(payload);
  const referenceId = String(payload.orderId || payload.returnOrderId || payload.waveId || '');

  for (const pref of preferences) {
    for (const channel of pref.channels) {
      try {
        const notification = await Notification.create({
          recipientType: pref.subscriberType,
          recipientId: pref.subscriberId,
          recipientEmail: pref.email,
          tenantId: pref.tenantId,
          channel,
          priority: template.priority,
          title,
          body,
          event,
          referenceType: template.referenceType,
          referenceId,
          status: channel === 'in_app' ? 'sent' : 'pending',
          sentAt: channel === 'in_app' ? new Date() : undefined,
        });

        // email 渠道异步发送 / email チャネルは非同期送信
        if (channel === 'email' && pref.email) {
          sendEmail(pref.email, title, body, String(notification._id)).catch(() => {});
        }

        sent++;
      } catch (err) {
        logger.error({ event, channel, subscriberId: pref.subscriberId, err }, 'Notification create failed / 通知作成失敗');
        failed++;
      }
    }
  }

  if (sent > 0) {
    logger.info({ event, sent, failed }, 'Notifications dispatched / 通知送信完了');
  }

  return { sent, failed };
}

/**
 * 获取用户的站内通知 / ユーザーのサイト内通知を取得
 */
export async function getNotifications(
  recipientId: string,
  options?: { status?: string; limit?: number; offset?: number },
): Promise<{ data: any[]; total: number; unreadCount: number }> {
  const filter: Record<string, unknown> = {
    recipientId,
    channel: 'in_app',
  };
  if (options?.status) filter.status = options.status;

  const limit = Math.min(options?.limit || 20, 100);
  const offset = options?.offset || 0;

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId, channel: 'in_app', status: { $ne: 'read' } }),
  ]);

  return { data, total, unreadCount };
}

/**
 * 标记通知为已读 / 通知を既読にする
 */
export async function markAsRead(notificationId: string, recipientId: string): Promise<boolean> {
  const result = await Notification.updateOne(
    { _id: notificationId, recipientId },
    { $set: { status: 'read', readAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

/**
 * 全部标记已读 / すべて既読にする
 */
export async function markAllAsRead(recipientId: string): Promise<number> {
  const result = await Notification.updateMany(
    { recipientId, channel: 'in_app', status: { $ne: 'read' } },
    { $set: { status: 'read', readAt: new Date() } },
  );
  return result.modifiedCount;
}

/**
 * 获取未读数 / 未読数を取得
 */
export async function getUnreadCount(recipientId: string): Promise<number> {
  return Notification.countDocuments({ recipientId, channel: 'in_app', status: { $ne: 'read' } });
}

// ============================================
// 通知ダイジェスト / 通知摘要（批量汇总）
// ============================================

/**
 * 未読通知のダイジェストを取得 / 获取未读通知摘要
 *
 * 定期実行（例：1時間ごと）で未読通知の件数と概要を返す。
 * 定期执行（例：每小时）返回未读通知的件数和概要。
 * メールダイジェスト送信の元データとして使用。
 */
export async function getNotificationDigest(
  recipientId: string,
): Promise<{
  unreadCount: number;
  urgentCount: number;
  summary: Array<{ event: string; count: number }>;
}> {
  const [unreadCount, urgentCount, summary] = await Promise.all([
    Notification.countDocuments({ recipientId, channel: 'in_app', status: { $ne: 'read' } }),
    Notification.countDocuments({ recipientId, channel: 'in_app', status: { $ne: 'read' }, priority: 'urgent' }),
    Notification.aggregate([
      { $match: { recipientId, channel: 'in_app', status: { $ne: 'read' } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $project: { event: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { unreadCount, urgentCount, summary };
}

// ============================================
// 古い通知のクリーンアップ / 旧通知清理
// ============================================

/**
 * 指定日数以上前の既読通知を削除 / 删除指定天数前的已读通知
 *
 * TTL 90日のデフォルト設定。BullMQスケジューラーから呼び出す想定。
 * 默认TTL 90天。由BullMQ调度器调用。
 */
export async function cleanupOldNotifications(
  daysOld: number = 90,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const result = await Notification.deleteMany({
    status: 'read',
    createdAt: { $lt: cutoff },
  });

  const deleted = result.deletedCount || 0;
  if (deleted > 0) {
    logger.info({ deleted, daysOld }, 'Old notifications cleaned up / 古い通知を削除');
  }

  return deleted;
}

// ─── 邮件发送 / メール送信 ───

async function sendEmail(to: string, subject: string, text: string, notificationId: string): Promise<void> {
  if (!smtpTransport) {
    logger.debug({ to, subject }, 'SMTP not configured, skipping email / SMTP 未設定、メール送信スキップ');
    await Notification.updateOne({ _id: notificationId }, {
      $set: { status: 'failed', errorMessage: 'SMTP not configured' },
    });
    return;
  }

  try {
    await smtpTransport.sendMail({
      from: EMAIL_FROM,
      to,
      subject: `[ZELIX WMS] ${subject}`,
      text,
    });

    await Notification.updateOne({ _id: notificationId }, {
      $set: { status: 'sent', sentAt: new Date() },
    });
  } catch (err) {
    logger.error({ to, err }, 'Email send failed / メール送信失敗');
    await Notification.updateOne({ _id: notificationId }, {
      $set: { status: 'failed', errorMessage: (err as Error).message },
      $inc: { retryCount: 1 },
    });
  }
}
