/**
 * 通知偏好モデル / 通知偏好模型
 *
 * 用户/客户订阅哪些事件通知。
 * ユーザー/顧客がどのイベント通知をサブスクライブするか。
 */

import mongoose, { Schema, type Document } from 'mongoose';
import type { NotificationChannel } from './notification';

export interface INotificationPreference extends Document {
  /** 用户ID或客户ID / ユーザーIDまたは顧客ID */
  subscriberId: string;
  /** 订阅者类型 / サブスクライバータイプ */
  subscriberType: 'user' | 'client';
  /** 邮箱 / メールアドレス */
  email?: string;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 渠道偏好（启用的渠道）/ チャネル設定（有効なチャネル） */
  channels: NotificationChannel[];
  /** 订阅的事件 / サブスクライブするイベント */
  subscribedEvents: string[];
  /** 静默模式（暂停所有通知）/ サイレントモード */
  muted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    subscriberId: { type: String, required: true },
    subscriberType: { type: String, required: true, enum: ['user', 'client'] },
    email: { type: String },
    tenantId: { type: String },
    channels: [{ type: String, enum: ['email', 'in_app', 'webhook', 'line', 'slack'] }],
    subscribedEvents: [{ type: String }],
    muted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationPreferenceSchema.index({ subscriberId: 1, subscriberType: 1 }, { unique: true });

export const NotificationPreference = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema,
);
