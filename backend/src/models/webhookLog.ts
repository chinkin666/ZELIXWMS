/**
 * Webhook 投递日志模型 / Webhook 配信ログモデル
 *
 * 记录每次 Webhook 投递的结果（成功/失败/重试）。
 * 各 Webhook 配信の結果（成功/失敗/リトライ）を記録する。
 *
 * 30天自动过期 / 30日で自動期限切れ
 */

import mongoose from 'mongoose';

export type WebhookLogStatus = 'success' | 'failed' | 'retrying';

export interface IWebhookLog {
  _id: mongoose.Types.ObjectId;
  /** 关联的 Webhook 配置 / 関連する Webhook 設定 */
  webhookId: mongoose.Types.ObjectId;
  /** 事件名 / イベント名 */
  event: string;
  /** 发送的载荷 / 送信したペイロード */
  payload?: Record<string, unknown>;
  /** 投递状态 / 配信ステータス */
  status: WebhookLogStatus;
  /** HTTP 状态码 / HTTP ステータスコード */
  statusCode: number;
  /** 响应内容（截断）/ レスポンス内容（切り捨て） */
  responseBody?: string;
  /** 第几次尝试 / 何回目の試行か */
  attempt: number;
  /** 错误信息 / エラー情報 */
  error?: string;
  /** 响应时间(ms) / レスポンス時間(ms) */
  duration: number;
  createdAt: Date;
}

const webhookLogSchema = new mongoose.Schema<IWebhookLog>(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'retrying'],
      required: true,
    },
    statusCode: {
      type: Number,
      default: 0,
    },
    responseBody: {
      type: String,
      maxlength: 10000,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    error: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'webhook_logs',
  },
);

// 30天自动过期 / 30日で自動期限切れ
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
webhookLogSchema.index({ webhookId: 1, createdAt: -1 });

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', webhookLogSchema);
