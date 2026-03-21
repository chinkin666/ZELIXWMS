import mongoose from 'mongoose';

/**
 * ============================================================================
 * Product モデル リファクタリング計画 / 商品模型重构计划
 * ============================================================================
 *
 * 現状 / 现状:
 *   フラットなフィールド構造で 100+ フィールドが存在。
 *   当前为扁平字段结构，存在 100+ 个字段。
 *
 * 計画 / 计划:
 *   Mongoose サブドキュメント（subdocuments）を使って論理グループに整理する。
 *   使用 Mongoose 子文档（subdocuments）按逻辑分组整理字段。
 *   同一コレクション内で構造化し、データ移行リスクを最小化。
 *   在同一集合内结构化，最小化数据迁移风险。
 *
 * 予定グループ / 预定分组:
 *   1. fba          - Amazon FBA 関連 / Amazon FBA 相关 (fnsku, asin, amazonSku, fbaEnabled)
 *   2. rsl          - 楽天RSL 関連 / 乐天RSL 相关 (rakutenSku, rslEnabled)
 *   3. logifast     - LOGIFAST 固有 / LOGIFAST 专属 (customerProductCode, brandCode, brandName, sizeName, colorName, unitType, etc.)
 *   4. dimensions   - 寸法・重量 / 尺寸・重量 (width, depth, height, weight, outerBox*, grossWeight, volume)
 *   5. packaging    - 梱包・配送 / 包装・配送 (caseQuantity, shippingSizeCode, etc.)
 *   6. marketplace  - 販売チャネル / 销售渠道 (marketplaceCodes, wholesalePartnerCodes)
 *
 * TODO: データ移行スクリプトの作成 / 创建数据迁移脚本
 *   - フラット → ネスト構造への MongoDB 移行スクリプトが必要
 *   - 需要 MongoDB 从扁平到嵌套结构的迁移脚本
 *   - 移行は既存 API レスポンス互換を維持する仮想ゲッターとセットで行う
 *   - 迁移需配合虚拟 getter 以保持现有 API 响应兼容性
 *
 * 参照ファイル / 涉及引用的文件:
 *   - controllers: fbaController, rslController, labelingTaskController, inboundOrderController
 *   - services: csvImportService, fbaBoxService
 * ============================================================================
 */

export type CoolType = '0' | '1' | '2';
export type ProductCategory = string;  // 自由入力: '0'-'4' or 日本語名（書籍、食品、アパレル等）
export type AllocationRule = 'FIFO' | 'FEFO' | 'LIFO';  // FIFO:先入先出 FEFO:先期限先出 LIFO:後入先出

// ---------------------------------------------------------------------------
// サブSKU / 子SKU
// ---------------------------------------------------------------------------
export interface ISubSku {
  subSku: string;        // 子SKU編碼 (必填，全局唯一)
  price?: number;        // 価格 (可選，不填時使用父商品価格)
  description?: string;  // 説明 (可選，如 "Black Friday活動")
  isActive?: boolean;    // 是否啟用 (默認 true)
}

// ---------------------------------------------------------------------------
// 倉庫側メモ / 仓库侧备注
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 論理グループ型定義（将来サブドキュメント化予定）
// 逻辑分组类型定义（将来计划转为子文档）
// ---------------------------------------------------------------------------

/** Amazon FBA 関連フィールド / Amazon FBA 相关字段 */
export interface IProductFba {
  fnsku?: string;              // Amazon FNSKU
  asin?: string;               // Amazon ASIN
  amazonSku?: string;          // Amazon出品者SKU / Amazon卖家SKU
  fbaEnabled?: boolean;        // FBA出荷対応 / 是否FBA出货对应
}

/** 楽天RSL 関連フィールド / 乐天RSL 相关字段 */
export interface IProductRsl {
  rakutenSku?: string;         // 楽天SKU / 乐天SKU
  rslEnabled?: boolean;        // RSL出荷対応 / 是否RSL出货对应
}

/** 寸法・重量フィールド / 尺寸・重量字段 */
export interface IProductDimensions {
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  /** 外箱サイズ / 外箱尺寸 */
  outerBoxWidth?: number;
  outerBoxDepth?: number;
  outerBoxHeight?: number;
  outerBoxVolume?: number;
  outerBoxWeight?: number;
  /** 総重量G/W(kg) / 毛重 */
  grossWeight?: number;
  /** 商品の容積(M3) / 商品体积 */
  volume?: number;
}

/** 梱包・配送フィールド / 包装・配送字段 */
export interface IProductPackaging {
  /** 箱入数 / ケース入数 */
  caseQuantity?: number;
  /** 配送サイズコード / 配送尺寸编码 (SS/60/80/.../260) */
  shippingSizeCode?: string;
  /** 単位区分 / 单位类型 (01:ﾋﾟｰｽ/02:ｹｰｽ/03:ﾕﾆｯﾄ/04:ﾎﾞｯｸｽ/05:ﾛｰﾙ) */
  unitType?: string;
}

/** 販売チャネルフィールド / 销售渠道字段 */
export interface IProductMarketplace {
  /** 販売商品コード（モール別）/ 各平台销售商品编码 */
  marketplaceCodes?: Record<string, string>;
  /** 顧客の顧客の商品コード（卸先別）/ B2B卸先商品编码 */
  wholesalePartnerCodes?: Record<string, string>;
}

/** LOGIFAST 固有フィールド / LOGIFAST 专属字段 */
export interface IProductLogifast {
  /** 顧客商品コード / 客户商品编码 */
  customerProductCode?: string;
  /** ブランドコード / 品牌编码 */
  brandCode?: string;
  /** ブランド名称 / 品牌名称 */
  brandName?: string;
  /** サイズ名称 / 尺码名称 */
  sizeName?: string;
  /** カラー名称 / 颜色名称 */
  colorName?: string;
  /** 税区分(01:課税/02:非課税) / 税区分 */
  taxType?: string;
  /** 税率(%) / 税率 */
  taxRate?: number;
  /** 危険区分(0:一般/1:危険) / 危险品区分 */
  hazardousType?: string;
  /** 航空搭載禁止 / 禁止航空运输 */
  airTransportBan?: boolean;
  /** バーコード委託区分 / 条码委托贴付 */
  barcodeCommission?: boolean;
  /** 予約対象区分 / 是否预约对象 */
  reservationTarget?: boolean;
  /** 通貨 / 货币 (1:JPY/2:RMB/3:USD) */
  currency?: string;
  /** 仕入先名称 / 供货方名称 */
  supplierName?: string;
  /** 有償無償区分 / 有偿无偿区分 (0:無償/1:有償) */
  paidType?: string;
}

// ---------------------------------------------------------------------------
// メイン IProduct インターフェース / 主 IProduct 接口
// ---------------------------------------------------------------------------
export interface IProduct {
  _id: mongoose.Types.ObjectId;

  // =========================================================================
  // [A] 所属関連 / 归属关联
  // =========================================================================
  /** テナントID / 租户ID */
  tenantId?: string;
  /** 所属顧客ID / 所属客户ID */
  clientId?: mongoose.Types.ObjectId;
  /** 所属子顧客ID / 所属子客户ID */
  subClientId?: mongoose.Types.ObjectId;
  /** 所属店舗ID / 所属店铺ID */
  shopId?: mongoose.Types.ObjectId;

  // =========================================================================
  // [B] 基本情報 / 基本信息
  // =========================================================================
  /** 倉庫側メモ / 仓库侧备注（仓库维护，客户不可改） */
  warehouseNotes?: IProductWarehouseNotes;
  sku: string;
  name: string;
  nameFull?: string;
  barcode?: string[];
  coolType?: CoolType;
  /** メール便計算設定 / 邮件便计算设置 */
  mailCalcEnabled: boolean;
  mailCalcMaxQuantity?: number;
  memo?: string;
  price?: number;
  handlingTypes?: string[];
  imageUrl?: string;
  subSkus?: ISubSku[];
  category?: ProductCategory;
  /** 原価/仕入単価（コスト計算用）/ 成本价/进货单价（用于成本计算） */
  costPrice?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  /** P3: 英語商品名 / 英文商品名 */
  nameEn?: string;
  /** P3: 原産国 / 原产国 */
  countryOfOrigin?: string;
  /** P3: 引当規則 / 分配规则 (FIFO/FEFO/LIFO) */
  allocationRule?: AllocationRule;
  /** P3: シリアルNo管理 / 序列号管理 */
  serialTrackingEnabled: boolean;
  /** P3: 入庫期限日数 / 入库期限天数 */
  inboundExpiryDays?: number;
  /** 内部フィールド: sku + 全子SKUコードの配列。unique index で重複を防止。 */
  _allSku?: string[];

  // =========================================================================
  // [C] 在庫管理設定 / 库存管理设置
  // =========================================================================
  inventoryEnabled: boolean;
  lotTrackingEnabled: boolean;
  expiryTrackingEnabled: boolean;
  alertDaysBeforeExpiry: number;
  defaultLocationId?: mongoose.Types.ObjectId;
  safetyStock: number;
  /** JAN码 / JANコード（GS1-128） */
  janCode?: string;
  /** デフォルト荷扱い / 默认荷扱いタグ */
  defaultHandlingTags?: string[];
  /** 主仕入先コード / 主要供应商编码 */
  supplierCode?: string;

  // =========================================================================
  // [D] 寸法・重量 / 尺寸・重量  → 将来: IProductDimensions
  // =========================================================================
  width?: number;
  depth?: number;
  height?: number;
  weight?: number;
  /** 外箱サイズ縦(cm) / 外箱尺寸-长 */
  outerBoxWidth?: number;
  /** 外箱サイズ横(cm) / 外箱尺寸-宽 */
  outerBoxDepth?: number;
  /** 外箱サイズ高(cm) / 外箱尺寸-高 */
  outerBoxHeight?: number;
  /** 外箱容積(M3) / 外箱体积 */
  outerBoxVolume?: number;
  /** 外箱重量(kg) / 外箱重量 */
  outerBoxWeight?: number;
  /** 総重量G/W(kg) / 毛重 */
  grossWeight?: number;
  /** 商品の容積(M3) / 商品体积 */
  volume?: number;

  // =========================================================================
  // [E] 梱包・配送 / 包装・配送  → 将来: IProductPackaging
  // =========================================================================
  /** 箱入数 / ケース入数 */
  caseQuantity?: number;
  /** 配送サイズコード / 配送尺寸编码 (SS/60/80/.../260) */
  shippingSizeCode?: string;
  /** 単位区分 / 单位类型 (01:ﾋﾟｰｽ/02:ｹｰｽ/03:ﾕﾆｯﾄ/04:ﾎﾞｯｸｽ/05:ﾛｰﾙ) */
  unitType?: string;

  // =========================================================================
  // [F] Amazon FBA 関連 / Amazon FBA 相关  → 将来: IProductFba
  // =========================================================================
  fnsku?: string;
  asin?: string;
  amazonSku?: string;
  fbaEnabled?: boolean;

  // =========================================================================
  // [G] 楽天RSL 関連 / 乐天RSL 相关  → 将来: IProductRsl
  // =========================================================================
  rakutenSku?: string;
  rslEnabled?: boolean;

  // =========================================================================
  // [H] LOGIFAST 固有 / LOGIFAST 专属  → 将来: IProductLogifast
  // =========================================================================
  /** 顧客商品コード/ハウスコード / 客户商品编码 */
  customerProductCode?: string;
  /** ブランドコード / 品牌编码 */
  brandCode?: string;
  /** ブランド名称 / 品牌名称 */
  brandName?: string;
  /** サイズ名称 / 尺码名称 */
  sizeName?: string;
  /** カラー名称 / 颜色名称 */
  colorName?: string;
  /** 税区分(01:課税/02:非課税) / 税区分 */
  taxType?: string;
  /** 税率(%) / 税率 */
  taxRate?: number;
  /** 危険区分(0:一般/1:危険) / 危险品区分 */
  hazardousType?: string;
  /** 航空搭載禁止 / 禁止航空运输 */
  airTransportBan?: boolean;
  /** バーコード委託区分 / 条码委托贴付 */
  barcodeCommission?: boolean;
  /** 予約対象区分 / 是否预约对象 */
  reservationTarget?: boolean;
  /** 通貨 / 货币 (1:JPY/2:RMB/3:USD) */
  currency?: string;
  /** 仕入先名称 / 供货方名称 */
  supplierName?: string;
  /** 有償無償区分 / 有偿无偿区分 (0:無償/1:有償) */
  paidType?: string;

  // =========================================================================
  // [I] 販売チャネル / 销售渠道  → 将来: IProductMarketplace
  // =========================================================================
  /**
   * 販売商品コード（モール別）/ 各平台销售商品编码
   * key: モール名 (例: 'rakuten','amazon','yahoo','wowma','mercari','temu','shopify','tiktok'...)
   * value: そのモールでの商品コード
   */
  marketplaceCodes?: Record<string, string>;
  /**
   * 顧客の顧客の商品コード（卸先別）/ B2B客户的客户商品编码
   * key: 卸先名 (例: 'joshin','biccamera','yodobashi','nitori'...)
   * value: その卸先での商品コード
   */
  wholesalePartnerCodes?: Record<string, string>;

  // =========================================================================
  // [J] その他 / 其他
  // =========================================================================
  /** 備考（複数）/ 备注（多条） */
  remarks?: string[];
  /** 自定义字段 / カスタムフィールド */
  customFields?: Record<string, unknown>;

  // =========================================================================
  // [Z] タイムスタンプ / 时间戳 (Mongoose自動管理)
  // =========================================================================
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
    // =======================================================================
    // [A] 所属関連 / 归属关联
    // =======================================================================
    tenantId: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    subClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubClient' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

    // =======================================================================
    // [B] 基本情報 / 基本信息
    // =======================================================================
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
      // enum 制限を解除: 日本語カテゴリ名も許可（書籍、食品、アパレル等）
      // 取消 enum 限制: 允许日语类别名（书籍、食品、服装等）
      default: '0',
    },
    // 原価/仕入単価（コスト計算用）/ 成本价/进货单价（用于成本计算）
    costPrice: { type: Number, min: 0 },
    customField1: { type: String, trim: true },
    customField2: { type: String, trim: true },
    customField3: { type: String, trim: true },
    customField4: { type: String, trim: true },
    // P3: 国際・追加情報 / 国际・附加信息
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
    // =======================================================================
    // [C] 在庫管理設定 / 库存管理设置
    // =======================================================================
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

    janCode: { type: String, trim: true },
    defaultHandlingTags: { type: [String], default: [] },
    supplierCode: { type: String, trim: true },

    // =======================================================================
    // [D] 寸法・重量 / 尺寸・重量  → 将来: dimensions サブドキュメント
    // =======================================================================
    width: { type: Number },
    depth: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    // 外箱サイズ / 外箱尺寸
    outerBoxWidth: { type: Number, min: 0 },
    outerBoxDepth: { type: Number, min: 0 },
    outerBoxHeight: { type: Number, min: 0 },
    outerBoxVolume: { type: Number, min: 0 },
    outerBoxWeight: { type: Number, min: 0 },
    // 総重量G/W / 毛重
    grossWeight: { type: Number, min: 0 },
    // 商品の容積 / 商品体积
    volume: { type: Number, min: 0 },

    // =======================================================================
    // [E] 梱包・配送 / 包装・配送  → 将来: packaging サブドキュメント
    // =======================================================================
    caseQuantity: { type: Number, min: 1 },
    // 配送サイズ / 配送尺寸
    shippingSizeCode: { type: String, trim: true },
    // 単位区分 / 单位类型
    unitType: { type: String, enum: ['01', '02', '03', '04', '05'], trim: true },

    // =======================================================================
    // [F] Amazon FBA 関連 / Amazon FBA 相关  → 将来: fba サブドキュメント
    // =======================================================================
    fnsku: { type: String, trim: true },
    asin: { type: String, trim: true },
    amazonSku: { type: String, trim: true },
    fbaEnabled: { type: Boolean, default: false },

    // =======================================================================
    // [G] 楽天RSL 関連 / 乐天RSL 相关  → 将来: rsl サブドキュメント
    // =======================================================================
    rakutenSku: { type: String, trim: true },
    rslEnabled: { type: Boolean, default: false },

    // =======================================================================
    // [H] LOGIFAST 固有 / LOGIFAST 专属  → 将来: logifast サブドキュメント
    // =======================================================================
    customerProductCode: { type: String, trim: true },
    // ブランド / 品牌
    brandCode: { type: String, trim: true },
    brandName: { type: String, trim: true },
    // サイズ・カラー / 尺码・颜色
    sizeName: { type: String, trim: true },
    colorName: { type: String, trim: true },
    // 税 / 税金
    taxType: { type: String, enum: ['01', '02'], trim: true },
    taxRate: { type: Number, min: 0 },
    // 危険物・航空・バーコード・予約 / 危险品・航空・条码・预约
    hazardousType: { type: String, enum: ['0', '1'], default: '0' },
    airTransportBan: { type: Boolean, default: false },
    barcodeCommission: { type: Boolean, default: false },
    reservationTarget: { type: Boolean, default: false },
    // 通貨 / 货币
    currency: { type: String, enum: ['1', '2', '3'], trim: true },
    // 仕入先名称 / 供货方名称
    supplierName: { type: String, trim: true },
    // 有償無償区分 / 有偿无偿区分
    paidType: { type: String, enum: ['0', '1'], default: '0' },

    // =======================================================================
    // [I] 販売チャネル / 销售渠道  → 将来: marketplace サブドキュメント
    // =======================================================================
    marketplaceCodes: { type: mongoose.Schema.Types.Mixed, default: {} },
    wholesalePartnerCodes: { type: mongoose.Schema.Types.Mixed, default: {} },

    // =======================================================================
    // [J] その他 / 其他
    // =======================================================================
    remarks: { type: [String], default: [] },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'products',
  },
);

// unique index on _allSku: MongoDB multikey unique index ensures no two documents share the same SKU/sub-SKU value
productSchema.index({ tenantId: 1, _allSku: 1 }, { unique: true });
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// 客户/店铺归属索引 / 顧客・店舗帰属インデックス
productSchema.index({ tenantId: 1, clientId: 1 });
productSchema.index({ tenantId: 1, shopId: 1 });
productSchema.index({ tenantId: 1, shopId: 1, sku: 1 });
// LOGIFAST: 顧客商品コード検索用 / 客户商品编码检索
productSchema.index({ tenantId: 1, customerProductCode: 1 });
productSchema.index({ tenantId: 1, brandCode: 1 });

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

