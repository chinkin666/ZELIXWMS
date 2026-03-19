/**
 * 通知モデル / 通知模型
 *
 * 用户通知记录（邮件/站内/LINE/Slack）。
 * ユーザー通知レコード（メール/サイト内/LINE/Slack）。
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type NotificationChannel = 'email' | 'in_app' | 'webhook' | 'line' | 'slack';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface INotification extends Document {
  /** 接收者类型 / 受信者タイプ */
  recipientType: 'user' | 'client' | 'role';
  /** 接收者ID / 受信者ID */
  recipientId: string;
  /** 接收者邮箱（email 渠道用）/ 受信者メール */
  recipientEmail?: string;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 渠道 / チャネル */
  channel: NotificationChannel;
  /** 优先级 / 優先度 */
  priority: NotificationPriority;
  /** 标题 / タイトル */
  title: string;
  /** 正文 / 本文 */
  body: string;
  /** HTML 正文（email 用）/ HTML 本文 */
  htmlBody?: string;
  /** 关联事件 / 関連イベント */
  event?: string;
  /** 关联实体 / 関連エンティティ */
  referenceType?: string;
  referenceId?: string;
  /** 状态 / ステータス */
  status: NotificationStatus;
  /** 发送时间 / 送信時刻 */
  sentAt?: Date;
  /** 阅读时间 / 既読時刻 */
  readAt?: Date;
  /** 失败原因 / 失敗理由 */
  errorMessage?: string;
  /** 重试次数 / リトライ回数 */
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientType: { type: String, required: true, enum: ['user', 'client', 'role'] },
    recipientId: { type: String, required: true, index: true },
    recipientEmail: { type: String },
    tenantId: { type: String, index: true },
    channel: { type: String, required: true, enum: ['email', 'in_app', 'webhook', 'line', 'slack'] },
    priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    htmlBody: { type: String },
    event: { type: String, index: true },
    referenceType: { type: String },
    referenceId: { type: String },
    status: { type: String, required: true, default: 'pending', enum: ['pending', 'sent', 'failed', 'read'] },
    sentAt: { type: Date },
    readAt: { type: Date },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// 复合索引: 按用户查未读 / 複合インデックス: ユーザーの未読を取得
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
// TTL: 90天自动清理 / TTL: 90日自動クリーンアップ
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
