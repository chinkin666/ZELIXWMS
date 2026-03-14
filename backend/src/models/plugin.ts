/**
 * Plugin 模型 / プラグインモデル
 *
 * 记录已安装插件的元数据和状态。
 * インストール済みプラグインのメタデータと状態を記録する。
 */

import mongoose from 'mongoose';

export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'error';

export interface IPlugin {
  _id: mongoose.Types.ObjectId;
  /** 插件唯一名称 / プラグイン一意名称 */
  name: string;
  /** 版本号 / バージョン */
  version: string;
  /** 描述 / 説明 */
  description?: string;
  /** 作者 / 作者 */
  author?: string;
  /** 状态 / ステータス */
  status: PluginStatus;
  /** 订阅的 Hook 事件 / サブスクライブする Hook イベント */
  hooks: string[];
  /** 所需权限 / 必要な権限 */
  permissions: string[];
  /** 安装时间 / インストール日時 */
  installedAt: Date;
  /** 启用时间 / 有効化日時 */
  enabledAt?: Date;
  /** 错误信息 / エラー情報 */
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pluginSchema = new mongoose.Schema<IPlugin>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    author: {
      type: String,
    },
    status: {
      type: String,
      enum: ['installed', 'enabled', 'disabled', 'error'],
      default: 'installed',
    },
    hooks: [{
      type: String,
    }],
    permissions: [{
      type: String,
    }],
    installedAt: {
      type: Date,
      default: Date.now,
    },
    enabledAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'plugins',
  },
);

export const Plugin = mongoose.model<IPlugin>('Plugin', pluginSchema);
