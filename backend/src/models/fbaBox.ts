import mongoose from 'mongoose';

/**
 * FBA箱管理 / FBA 箱管理
 *
 * FBA 納品プランの箱レベル管理（分箱・合箱・箱替え・箱規格検証）
 * FBA 纳品计划的箱级管理（分箱、合箱、换箱、箱规校验）
 */

export type FbaBoxStatus = 'packing' | 'labeled' | 'sealed' | 'shipped';

export interface IFbaBoxItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  fnsku: string;
  quantity: number;
}

export interface IFbaBox {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  /** 関連入庫予約 / 关联入库预定 */
  inboundOrderId: mongoose.Types.ObjectId;
  /** 箱番号 / 箱号 */
  boxNumber: string;
  /** 目的FC / 目的 FC（多仓拆分时可与预定不同） */
  destinationFc?: string;

  // 箱内容 / 箱内容
  items: IFbaBoxItem[];

  // 物理属性 / 物理属性
  weight?: number;    // kg
  length?: number;    // cm
  width?: number;     // cm
  height?: number;    // cm

  // ステータス / 状态
  status: FbaBoxStatus;
  boxLabelPrinted: boolean;
  shippingLabelPrinted: boolean;
  photoUrl?: string;

  // 追跡 / 追踪
  trackingNumber?: string;
  sealedAt?: Date;
  sealedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Amazon FBA 箱規格制限 / Amazon FBA 箱规格限制
export const FBA_BOX_LIMITS = {
  maxWeightMixed: 15,      // kg（混合 SKU）
  maxWeightSingle: 30,     // kg（単一 SKU + 重量物表示）
  maxLongestSide: 63.5,    // cm
  maxTotalDimensions: 150, // cm（三辺合計）
};

const fbaBoxItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    fnsku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const fbaBoxSchema = new mongoose.Schema<IFbaBox>(
  {
    tenantId: { type: String, required: true },
    inboundOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'InboundOrder', required: true },
    boxNumber: { type: String, required: true, trim: true },
    destinationFc: { type: String, trim: true },

    items: { type: [fbaBoxItemSchema], default: [] },

    weight: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },

    status: {
      type: String,
      required: true,
      enum: ['packing', 'labeled', 'sealed', 'shipped'],
      default: 'packing',
    },
    boxLabelPrinted: { type: Boolean, default: false },
    shippingLabelPrinted: { type: Boolean, default: false },
    photoUrl: { type: String, trim: true },

    trackingNumber: { type: String, trim: true },
    sealedAt: { type: Date },
    sealedBy: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'fba_boxes',
  },
);

fbaBoxSchema.index({ tenantId: 1, inboundOrderId: 1 });
fbaBoxSchema.index({ tenantId: 1, boxNumber: 1 }, { unique: true });

/**
 * 箱規格検証 / 箱规校验
 */
export function validateFbaBox(box: IFbaBox): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { weight, length, width, height, items } = box;

  // 重量チェック / 重量检查
  if (weight) {
    const isSingleSku = items.length <= 1;
    const maxWeight = isSingleSku ? FBA_BOX_LIMITS.maxWeightSingle : FBA_BOX_LIMITS.maxWeightMixed;
    if (weight > maxWeight) {
      errors.push(`重量 ${weight}kg が上限 ${maxWeight}kg を超過 / 重量超过上限`);
    }
  }

  // 寸法チェック / 尺寸检查
  if (length && width && height) {
    const sides = [length, width, height].sort((a, b) => b - a);
    if (sides[0] > FBA_BOX_LIMITS.maxLongestSide) {
      errors.push(`最長辺 ${sides[0]}cm が上限 ${FBA_BOX_LIMITS.maxLongestSide}cm を超過 / 最长边超过上限`);
    }
    const total = sides[0] + sides[1] + sides[2];
    if (total > FBA_BOX_LIMITS.maxTotalDimensions) {
      errors.push(`三辺合計 ${total}cm が上限 ${FBA_BOX_LIMITS.maxTotalDimensions}cm を超過 / 三边合计超过上限`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export const FbaBox = mongoose.model<IFbaBox>('FbaBox', fbaBoxSchema);
