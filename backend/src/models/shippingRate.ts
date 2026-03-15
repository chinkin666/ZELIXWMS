import mongoose from 'mongoose';

// ============================================
// 运费率表インターフェース / 运费率表接口
// ============================================

/**
 * 运费率表（ShippingRate）
 * 配送料金プランを管理するモデル / 管理配送费用方案的模型
 */
export interface IShippingRate {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 配送業者ID / 配送业者ID */
  carrierId: string;
  /** 配送業者名（表示用キャッシュ）/ 配送业者名（显示用缓存） */
  carrierName?: string;
  /** 料金プラン名（例：「ヤマト 関東→関東」）/ 费率方案名 */
  name: string;

  // サイズ条件 / 尺寸条件
  /** 重量ベース/才数ベース/一律 / 按重量/按体积/统一 */
  sizeType: 'weight' | 'dimension' | 'flat';
  /** 最小値（kg or cm3）/ 最小值 */
  sizeMin?: number;
  /** 最大値 / 最大值 */
  sizeMax?: number;

  // 地区条件 / 地区条件
  /** 発送元都道府県（空=全国）/ 发货地都道府县（空=全国） */
  fromPrefectures?: string[];
  /** 配送先都道府県（空=全国）/ 收货地都道府县（空=全国） */
  toPrefectures?: string[];

  // 料金 / 费用
  /** 基本料金 / 基本费用 */
  basePrice: number;
  /** クール便追加料金（0=なし）/ 冷藏附加费（0=无） */
  coolSurcharge: number;
  /** 代金引換手数料（0=なし）/ 货到付款手续费（0=无） */
  codSurcharge: number;
  /** 燃油サーチャージ（0=なし）/ 燃油附加费（0=无） */
  fuelSurcharge: number;

  // 有効期間 / 有效期间
  /** 有効開始日 / 有效开始日 */
  validFrom?: Date;
  /** 有効終了日 / 有效结束日 */
  validTo?: Date;
  /** 有効フラグ / 有效标志 */
  isActive: boolean;

  /** 備考 / 备注 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shippingRateSchema = new mongoose.Schema<IShippingRate>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    carrierId: {
      type: String,
      required: true,
      trim: true,
    },
    carrierName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // サイズ条件 / 尺寸条件
    sizeType: {
      type: String,
      required: true,
      enum: ['weight', 'dimension', 'flat'],
      default: 'flat',
    },
    sizeMin: { type: Number, min: 0 },
    sizeMax: { type: Number, min: 0 },

    // 地区条件 / 地区条件
    fromPrefectures: { type: [String], default: undefined },
    toPrefectures: { type: [String], default: undefined },

    // 料金 / 费用
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    coolSurcharge: { type: Number, min: 0, default: 0 },
    codSurcharge: { type: Number, min: 0, default: 0 },
    fuelSurcharge: { type: Number, min: 0, default: 0 },

    // 有効期間 / 有效期间
    validFrom: { type: Date },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },

    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'shipping_rates',
  },
);

// 複合インデックス / 复合索引
shippingRateSchema.index({ tenantId: 1, carrierId: 1 });
shippingRateSchema.index({ tenantId: 1, isActive: 1 });
shippingRateSchema.index({ tenantId: 1, carrierId: 1, isActive: 1 });

export const ShippingRate = mongoose.model<IShippingRate>(
  'ShippingRate',
  shippingRateSchema,
);
