import mongoose from 'mongoose';

export type CoolType = '0' | '1' | '2';

export interface ISubSku {
  subSku: string;        // 子SKU編碼 (必填，全局唯一)
  price?: number;        // 価格 (可選，不填時使用父商品価格)
  description?: string;  // 説明 (可選，如 "Black Friday活動")
  isActive?: boolean;    // 是否啟用 (默認 true)
}

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  nameFull?: string;
  barcode?: string[];
  coolType?: CoolType;
  // メール便計算設定
  mailCalcEnabled: boolean;                 // メール便計算（true: 自動計算する, false: 自動計算しない）
  mailCalcMaxQuantity?: number;             // メール便最大数量（mailCalcEnabled が true の時のみ有効）
  memo?: string;
  price?: number;
  handlingTypes?: string[];
  imageUrl?: string;
  subSkus?: ISubSku[];
  /** 内部フィールド: sku + 全子SKUコードの配列。unique index で重複を防止。 */
  _allSku?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const subSkuSchema = new mongoose.Schema<ISubSku>(
  {
    subSku: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema<IProduct>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameFull: {
      type: String,
      trim: true,
    },
    barcode: {
      type: [String],
      default: [],
      set: (val: unknown) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
          .filter((v) => v.length > 0);
      },
    },
    coolType: {
      type: String,
      enum: ['0', '1', '2'],
      trim: true,
    },
    // メール便計算設定
    mailCalcEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    mailCalcMaxQuantity: {
      type: Number,
      validate: {
        validator: (v: unknown) => {
          if (v === undefined || v === null) return true;
          if (typeof v !== 'number') return false;
          return Number.isInteger(v) && v > 0;
        },
        message: 'mailCalcMaxQuantity must be a positive integer',
      },
    },
    memo: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
    },
    handlingTypes: {
      type: [String],
      default: [],
      set: (val: unknown) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
          .filter((v) => v.length > 0);
      },
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    subSkus: {
      type: [subSkuSchema],
      default: [],
    },
    _allSku: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'products',
  },
);

// unique index on _allSku: MongoDB multikey unique index ensures no two documents share the same SKU/sub-SKU value
productSchema.index({ _allSku: 1 }, { unique: true });

// Pre-save hook: auto-compute _allSku from sku + subSkus
productSchema.pre('save', function () {
  const allCodes = [this.sku];
  if (this.subSkus && this.subSkus.length > 0) {
    for (const sub of this.subSkus) {
      if (sub.subSku) allCodes.push(sub.subSku);
    }
  }
  this._allSku = allCodes;
});

export const Product = mongoose.model<IProduct>('Product', productSchema);

/** Utility: compute _allSku array from sku + subSkus (for use in insertMany / bulkWrite where pre-save hooks don't fire). */
export function computeAllSku(sku: string, subSkus?: { subSku: string }[]): string[] {
  const allCodes = [sku];
  if (subSkus) {
    for (const sub of subSkus) {
      if (sub.subSku) allCodes.push(sub.subSku);
    }
  }
  return allCodes;
}

