import mongoose from 'mongoose';
import type { ChargeType } from './serviceRate';
import { CHARGE_TYPES } from './serviceRate';

/**
 * 価格カタログ / 价格目录
 *
 * 新規顧客への見積もり用テンプレート。
 * ServiceRate のマスタ投入を効率化する。
 * 用于新客户报价的模板。
 * 提高 ServiceRate 主数据录入效率。
 *
 * 使い方 / 使用方式:
 * 1. 管理者が PriceCatalog を作成（複数のテンプレートを用意）
 * 2. 新顧客追加時、テンプレートを選択して ServiceRate を一括生成
 */

export interface IPriceCatalogItem {
  /** チャージ種別 / 费用类型 */
  chargeType: ChargeType;
  /** 料金名称 / 费率名称 */
  name: string;
  /** 単価 / 单价 */
  unitPrice: number;
  /** 単位 / 单位 */
  unit: string;
  /** 備考 / 备注 */
  memo?: string;
}

export interface IPriceCatalog {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** カタログ名 / 目录名称 */
  catalogName: string;
  /** 説明 / 说明 */
  description?: string;
  /** 対象顧客タイプ / 目标客户类型 */
  targetClientType?: 'logistics_company' | 'domestic_company' | 'individual_seller';
  /** 料金項目一覧 / 费率项目列表 */
  items: IPriceCatalogItem[];
  /** デフォルトカタログ / 默认目录 */
  isDefault: boolean;
  /** 有効フラグ / 有效标记 */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const priceCatalogItemSchema = new mongoose.Schema(
  {
    chargeType: {
      type: String,
      required: true,
      enum: CHARGE_TYPES,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'per_item',
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const priceCatalogSchema = new mongoose.Schema<IPriceCatalog>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    catalogName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetClientType: {
      type: String,
      enum: ['logistics_company', 'domestic_company', 'individual_seller'],
    },
    items: {
      type: [priceCatalogItemSchema],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'price_catalogs',
  },
);

priceCatalogSchema.index({ tenantId: 1, isActive: 1 });
priceCatalogSchema.index({ tenantId: 1, isDefault: 1 });

export const PriceCatalog = mongoose.model<IPriceCatalog>('PriceCatalog', priceCatalogSchema);
