/**
 * PluginConfig 模型 / プラグイン設定モデル
 *
 * 按租户存储插件的自定义配置。
 * テナントごとにプラグインのカスタム設定を保存する。
 */

import mongoose from 'mongoose';

export interface IPluginConfig {
  _id: mongoose.Types.ObjectId;
  /** 插件名称 / プラグイン名 */
  pluginName: string;
  /** 租户ID / テナントID */
  tenantId: string;
  /** 配置数据 / 設定データ */
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const pluginConfigSchema = new mongoose.Schema<IPluginConfig>(
  {
    pluginName: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'plugin_configs',
  },
);

pluginConfigSchema.index({ pluginName: 1, tenantId: 1 }, { unique: true });

export const PluginConfig = mongoose.model<IPluginConfig>('PluginConfig', pluginConfigSchema);
