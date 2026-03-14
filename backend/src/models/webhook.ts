/**
 * Webhook 配置模型 / Webhook 設定モデル
 *
 * 用户配置的 Webhook 订阅，事件触发后自动推送到外部 URL。
 * ユーザーが設定した Webhook サブスクリプション。イベント発生時に外部 URL へ自動送信する。
 */

import mongoose from 'mongoose';

export interface IWebhook {
  _id: mongoose.Types.ObjectId;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 订阅的事件名 / サブスクライブするイベント名 */
  event: string;
  /** 名称（管理用）/ 名前（管理用） */
  name: string;
  /** 目标 URL / 送信先 URL */
  url: string;
  /** HMAC-SHA256 密钥 / HMAC-SHA256 シークレット */
  secret: string;
  /** 启用状态 / 有効状態 */
  enabled: boolean;
  /** 最大重试次数 / 最大リトライ回数 */
  retry: number;
  /** 自定义请求头 / カスタムリクエストヘッダー */
  headers?: Record<string, string>;
  /** 备注 / メモ */
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new mongoose.Schema<IWebhook>(
  {
    tenantId: {
      type: String,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    retry: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'webhooks',
  },
);

webhookSchema.index({ event: 1, enabled: 1 });

export const Webhook = mongoose.model<IWebhook>('Webhook', webhookSchema);
