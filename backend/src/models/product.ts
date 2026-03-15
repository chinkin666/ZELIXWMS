import mongoose from 'mongoose';

export type CoolType = '0' | '1' | '2';
export type ProductCategory = '0' | '1' | '2' | '3' | '4';  // 0:商品 1:消耗品 2:作業 3:おまけ 4:部材
export type AllocationRule = 'FIFO' | 'FEFO' | 'LIFO';  // FIFO:先入先出 FEFO:先期限先出 LIFO:後入先出
export interface ISubSku {
  subSku: string;        // 子SKU編碼 (必填，全局唯一)
  price?: number;        // 価格 (可選，不填時使用父商品価格)
  description?: string;  // 説明 (可選，如 "Black Friday活動")
  isActive?: boolean;    // 是否啟用 (默認 true)
}

export interface IProductWarehouseNotes {
  /** 推奨ロケーション / 库位偏好 */
  preferredLocation?: string;
  /** 特殊取扱注意 / 特殊处理备注 */
  handlingNotes?: string;
  /** 壊れ物 / 易碎 */
  isFragile?: boolean;
  /** 液体 / 液体 */
  isLiquid?: boolean;
  /** OPP袋要 / 需要OPP袋 */
  requiresOppBag?: boolean;
  /** 窒息防止ラベル要 / 需要防窒息标 */
  requiresSuffocationLabel?: boolean;
  /** 保管温度帯 / 保管温度带 */
  storageType?: 'ambient' | 'chilled' | 'frozen';
}

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId?: string;
  /** 所属顧客ID / 所属客户ID */
  clientId?: mongoose.Types.ObjectId;
  /** 所属子顧客ID / 所属子客户ID */
  subClientId?: mongoose.Types.ObjectId;
  /** 所属店舗ID / 所属店铺ID */
  shopId?: mongoose.Types.ObjectId;
  /** 倉庫側メモ / 仓库侧备注（仓库维护，客户不可改） */
  warehouseNotes?: IProductWarehouseNotes;
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
  category?: ProductCategory;
  // 原価/仕入単価（コスト計算用）/ 成本价/进货单价（用于成本计算）
  costPrice?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  // P3: 国際・追加情報
  nameEn?: string;              // 英語商品名
  countryOfOrigin?: string;     // 原産国
  // P3: 引当規則
  allocationRule?: AllocationRule;  // 引当規則 (FIFO/FEFO/LIFO)
  // P3: シリアルNo管理
  serialTrackingEnabled: boolean;   // シリアルNo管理有効
  // P3: 入庫期限日数
  inboundExpiryDays?: number;       // 入庫期限日数 (入庫時に残り日数がこの値未満なら警告)
  /** 内部フィールド: sku + 全子SKUコードの配列。unique index で重複を防止。 */
  _allSku?: string[];
  // 在庫管理設定
  inventoryEnabled: boolean;
  lotTrackingEnabled: boolean;
  expiryTrackingEnabled: boolean;
  alertDaysBeforeExpiry: number;
  defaultLocationId?: mongoose.Types.ObjectId;
  safetyStock: number;
  // JAN码 / JANコード（GS1-128）
  janCode?: string;
  // 箱入数 / ケース入数（1ケースあたりの個数）
  caseQuantity?: number;
  // デフォルト荷扱い / 默认荷扱いタグ（出荷時に自動適用）
  defaultHandlingTags?: string[];
  // 主仕入先コード / 主要仕入先コード
  supplierCode?: string;
  // Amazon FBA関連 / Amazon FBA相关
  fnsku?: string;              // Amazon FNSKU
  asin?: string;               // Amazon ASIN
  amazonSku?: string;          // Amazon出品者SKU / Amazon卖家SKU
  fbaEnabled?: boolean;        // FBA出荷対応商品か / 是否FBA出货对应商品
  // 楽天RSL関連 / 乐天RSL相关
  rakutenSku?: string;         // 楽天SKU / 乐天SKU
  rslEnabled?: boolean;        // RSL出荷対応商品か / 是否RSL出货对应商品
  /** 自定义字段 / カスタムフィールド */
  customFields?: Record<string, unknown>;
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
    // 所属関連 / 归属关联
    tenantId: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    subClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubClient' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

    // 倉庫側メモ / 仓库侧备注
    warehouseNotes: {
      type: new mongoose.Schema(
        {
          preferredLocation: { type: String, trim: true },
          handlingNotes: { type: String, trim: true },
          isFragile: { type: Boolean, default: false },
          isLiquid: { type: Boolean, default: false },
          requiresOppBag: { type: Boolean, default: false },
          requiresSuffocationLabel: { type: Boolean, default: false },
          storageType: { type: String, enum: ['ambient', 'chilled', 'frozen'], default: 'ambient' },
        },
        { _id: false },
      ),
      default: undefined,
    },

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
    category: {
      type: String,
      enum: ['0', '1', '2', '3', '4'],
      default: '0',
    },
    // 原価/仕入単価（コスト計算用）/ 成本价/进货单价（用于成本计算）
    costPrice: { type: Number, min: 0 },
    customField1: { type: String, trim: true },
    customField2: { type: String, trim: true },
    customField3: { type: String, trim: true },
    customField4: { type: String, trim: true },
    width: { type: Number },
    depth: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    nameEn: { type: String, trim: true },
    countryOfOrigin: { type: String, trim: true },
    allocationRule: {
      type: String,
      enum: ['FIFO', 'FEFO', 'LIFO'],
      default: 'FIFO',
    },
    serialTrackingEnabled: {
      type: Boolean,
      default: false,
    },
    inboundExpiryDays: {
      type: Number,
      validate: {
        validator: (v: unknown) => {
          if (v === undefined || v === null) return true;
          if (typeof v !== 'number') return false;
          return Number.isInteger(v) && v > 0;
        },
        message: 'inboundExpiryDays must be a positive integer',
      },
    },
    _allSku: {
      type: [String],
      default: [],
    },
    // 在庫管理設定
    inventoryEnabled: {
      type: Boolean,
      default: false,
    },
    lotTrackingEnabled: {
      type: Boolean,
      default: false,
    },
    expiryTrackingEnabled: {
      type: Boolean,
      default: false,
    },
    alertDaysBeforeExpiry: {
      type: Number,
      default: 30,
    },
    defaultLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    safetyStock: {
      type: Number,
      default: 0,
    },

    // JAN码 / JANコード（GS1-128）
    janCode: { type: String, trim: true },
    // 箱入数 / ケース入数（1ケースあたりの個数）
    caseQuantity: { type: Number, min: 1 },
    // デフォルト荷扱い / 默认荷扱いタグ（出荷時に自動適用）
    defaultHandlingTags: { type: [String], default: [] },
    // 主仕入先コード / 主要仕入先コード
    supplierCode: { type: String, trim: true },

    // Amazon FBA関連 / Amazon FBA相关
    fnsku: { type: String, trim: true },
    asin: { type: String, trim: true },
    amazonSku: { type: String, trim: true },
    fbaEnabled: { type: Boolean, default: false },

    // 楽天RSL関連 / 乐天RSL相关
    rakutenSku: { type: String, trim: true },
    rslEnabled: { type: Boolean, default: false },

    // 自定义字段 / カスタムフィールド（Phase 5）
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'products',
  },
);

// unique index on _allSku: MongoDB multikey unique index ensures no two documents share the same SKU/sub-SKU value
productSchema.index({ _allSku: 1 }, { unique: true });

// 客户/店铺归属索引 / 顧客・店舗帰属インデックス
productSchema.index({ tenantId: 1, clientId: 1 });
productSchema.index({ tenantId: 1, shopId: 1 });
productSchema.index({ tenantId: 1, shopId: 1, sku: 1 });

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

