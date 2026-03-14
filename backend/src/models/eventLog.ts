/**
 * EventLog — 统一事件日志模型 / 統一イベントログモデル
 *
 * 记录所有扩展系统事件（Hook/Plugin/Script/Webhook）。
 * すべての拡張システムイベント（Hook/Plugin/Script/Webhook）を記録する。
 *
 * 90天自动过期 / 90日で自動期限切れ
 */

import mongoose from 'mongoose';
import type { EventLogSource, EventLogStatus } from '@/core/extensions/types';

export interface IEventLog {
  _id: mongoose.Types.ObjectId;
  /** 事件名 / イベント名 */
  event: string;
  /** 来源 / ソース: engine | plugin | script | webhook */
  source: EventLogSource;
  /** 来源名称（插件名/脚本名）/ ソース名（プラグイン名/スクリプト名） */
  sourceName?: string;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 事件载荷摘要 / イベントペイロード要約 */
  payload?: Record<string, unknown>;
  /** 状态 / ステータス */
  status: EventLogStatus;
  /** 错误信息 / エラー情報 */
  error?: string;
  /** 处理耗时(ms) / 処理時間(ms) */
  duration: number;
  /** 处理的 handler 数量 / 処理した handler 数 */
  handlerCount: number;
  createdAt: Date;
}

const eventLogSchema = new mongoose.Schema<IEventLog>(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['engine', 'plugin', 'script', 'webhook'],
      required: true,
    },
    sourceName: {
      type: String,
      trim: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['emitted', 'processed', 'error'],
      required: true,
    },
    error: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
    },
    handlerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'event_logs',
  },
);

// 90天自动过期 / 90日で自動期限切れ
eventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
// 按事件+时间查询 / イベント+時間でクエリ
eventLogSchema.index({ event: 1, createdAt: -1 });

export const EventLog = mongoose.model<IEventLog>('EventLog', eventLogSchema);
