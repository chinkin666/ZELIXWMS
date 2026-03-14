/**
 * AutomationScript 模型 / 自動化スクリプトモデル
 *
 * 用户编写的自动化脚本，在事件触发时于沙箱中执行。
 * ユーザーが記述した自動化スクリプト。イベント発生時にサンドボックス内で実行する。
 */

import mongoose from 'mongoose';

export interface IAutomationScript {
  _id: mongoose.Types.ObjectId;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 脚本名称 / スクリプト名 */
  name: string;
  /** 描述 / 説明 */
  description?: string;
  /** 触发事件 / トリガーイベント */
  event: string;
  /** 脚本代码 / スクリプトコード */
  code: string;
  /** 启用状态 / 有効状態 */
  enabled: boolean;
  /** 超时(ms) / タイムアウト(ms) */
  timeout: number;
  createdAt: Date;
  updatedAt: Date;
}

const automationScriptSchema = new mongoose.Schema<IAutomationScript>(
  {
    tenantId: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    timeout: {
      type: Number,
      default: 5000,
      min: 100,
      max: 30000,
    },
  },
  {
    timestamps: true,
    collection: 'automation_scripts',
  },
);

automationScriptSchema.index({ event: 1, enabled: 1 });

export const AutomationScript = mongoose.model<IAutomationScript>('AutomationScript', automationScriptSchema);
