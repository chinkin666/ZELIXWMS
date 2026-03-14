/**
 * 功能开关模型 / フィーチャーフラグモデル
 *
 * 按租户计划控制功能开关。
 * テナントプランごとに機能フラグを制御。
 */

import mongoose from 'mongoose';

export interface IFeatureFlag {
  _id: mongoose.Types.ObjectId;
  /** 功能标识（全局唯一）/ 機能識別子（グローバルユニーク） */
  key: string;
  /** 显示名称 / 表示名 */
  name: string;
  /** 功能描述 / 機能説明 */
  description?: string;
  /** 是否全局启用（默认值）/ グローバル有効（デフォルト） */
  defaultEnabled: boolean;
  /** 按租户覆盖 / テナントごとのオーバーライド */
  tenantOverrides: Array<{
    tenantId: string;
    enabled: boolean;
  }>;
  /** 功能分组（用于前端分类显示）/ グループ（フロントエンド分類表示用） */
  group?: string;
  createdAt: Date;
  updatedAt: Date;
}

const featureFlagSchema = new mongoose.Schema<IFeatureFlag>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[a-zA-Z][a-zA-Z0-9_.]*$/,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    defaultEnabled: { type: Boolean, default: false },
    tenantOverrides: {
      type: [
        {
          tenantId: { type: String, required: true },
          enabled: { type: Boolean, required: true },
        },
      ],
      default: [],
    },
    group: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'feature_flags',
  },
);

export const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);
