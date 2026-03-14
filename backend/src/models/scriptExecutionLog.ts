/**
 * ScriptExecutionLog 模型 / スクリプト実行ログモデル
 *
 * 记录每次脚本执行的结果。
 * 各スクリプト実行の結果を記録する。
 *
 * 30天自动过期 / 30日で自動期限切れ
 */

import mongoose from 'mongoose';

export type ScriptExecutionStatus = 'success' | 'error' | 'timeout';

export interface IScriptExecutionLog {
  _id: mongoose.Types.ObjectId;
  /** 关联的脚本 / 関連するスクリプト */
  scriptId: mongoose.Types.ObjectId;
  /** 脚本名称快照 / スクリプト名スナップショット */
  scriptName: string;
  /** 事件名 / イベント名 */
  event: string;
  /** 执行状态 / 実行ステータス */
  status: ScriptExecutionStatus;
  /** 错误信息 / エラー情報 */
  error?: string;
  /** 输入数据摘要 / 入力データ要約 */
  input?: Record<string, unknown>;
  /** 输出修改 / 出力変更 */
  output?: Record<string, unknown>;
  /** 执行耗时(ms) / 実行時間(ms) */
  duration: number;
  createdAt: Date;
}

const scriptExecutionLogSchema = new mongoose.Schema<IScriptExecutionLog>(
  {
    scriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationScript',
      required: true,
      index: true,
    },
    scriptName: {
      type: String,
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'timeout'],
      required: true,
    },
    error: {
      type: String,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'script_execution_logs',
  },
);

// 30天自动过期 / 30日で自動期限切れ
scriptExecutionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
scriptExecutionLogSchema.index({ scriptId: 1, createdAt: -1 });

export const ScriptExecutionLog = mongoose.model<IScriptExecutionLog>('ScriptExecutionLog', scriptExecutionLogSchema);
