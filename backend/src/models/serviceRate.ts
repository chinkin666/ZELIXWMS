import mongoose from 'mongoose';

// ============================================
// サービス料金マスタインターフェース / 服务费率主数据接口
// ============================================

/**
 * チャージ種別 / 费用类型
 */
export type ChargeType =
  | 'inbound_handling'   // 入庫作業料 / 入库作业费
  | 'storage'            // 保管料 / 保管费
  | 'outbound_handling'  // 出荷作業料 / 出货作业费
  | 'picking'            // ピッキング料 / 拣货费
  | 'packing'            // 梱包料 / 包装费
  | 'inspection'         // 検品料 / 检品费
  | 'shipping'           // 配送料 / 配送费
  | 'material'           // 梱包材料費 / 包装材料费
  | 'return_handling'    // 返品処理料 / 退货处理费
  | 'labeling'           // ラベル貼付料 / 贴标费
  | 'other';             // その他 / 其他

/** チャージ種別の有効値一覧 / 费用类型有效值列表 */
export const CHARGE_TYPES: readonly ChargeType[] = [
  'inbound_handling',
  'storage',
  'outbound_handling',
  'picking',
  'packing',
  'inspection',
  'shipping',
  'material',
  'return_handling',
  'labeling',
  'other',
] as const;

/**
 * チャージ単位 / 费用单位
 */
export type ChargeUnit =
  | 'per_order'          // 注文あたり / 每订单
  | 'per_item'           // 個あたり / 每件
  | 'per_case'           // ケースあたり / 每箱
  | 'per_line'           // 行あたり / 每行
  | 'per_pallet'         // パレットあたり / 每托盘
  | 'per_location_day'   // ロケーション・日あたり / 每库位・天
  | 'per_sheet'          // 枚あたり / 每张
  | 'flat';              // 一律 / 统一

/** チャージ単位の有効値一覧 / 费用单位有效值列表 */
export const CHARGE_UNITS: readonly ChargeUnit[] = [
  'per_order',
  'per_item',
  'per_case',
  'per_line',
  'per_pallet',
  'per_location_day',
  'per_sheet',
  'flat',
] as const;

/**
 * サービス料金マスタ（ServiceRate / 見積マスタ）
 * 荷主ごとの料金表を管理するモデル / 管理每个货主的费率表模型
 */
export interface IServiceRate {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 荷主ID（空=デフォルト料金）/ 货主ID（空=默认费率） */
  clientId?: string;
  /** 荷主名（表示用キャッシュ）/ 货主名（显示用缓存） */
  clientName?: string;
  /** チャージ種別 / 费用类型 */
  chargeType: ChargeType;
  /** 料金名称（例：「入庫作業料（通常）」）/ 费率名称 */
  name: string;
  /** チャージ単位 / 费用单位 */
  unit: ChargeUnit;
  /** 単価 / 单价 */
  unitPrice: number;
  /** 条件 / 条件 */
  conditions?: {
    /** クール便の場合の追加料金タイプ / 冷藏件的附加费类型 */
    coolType?: string;
    /** 最小数量（ボリュームディスカウント）/ 最小数量（量折） */
    minQuantity?: number;
    /** 最大数量 / 最大数量 */
    maxQuantity?: number;
  };
  /** 有効フラグ / 有效标志 */
  isActive: boolean;
  /** 有効開始日 / 有效开始日 */
  validFrom?: Date;
  /** 有効終了日 / 有效结束日 */
  validTo?: Date;
  /** 備考 / 备注 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const serviceRateSchema = new mongoose.Schema<IServiceRate>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    clientId: {
      type: String,
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
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
    unit: {
      type: String,
      required: true,
      enum: CHARGE_UNITS,
      default: 'per_item',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // 条件 / 条件
    conditions: {
      type: new mongoose.Schema(
        {
          coolType: { type: String, trim: true },
          minQuantity: { type: Number, min: 0 },
          maxQuantity: { type: Number, min: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },

    isActive: { type: Boolean, default: true },

    // 有効期間 / 有效期间
    validFrom: { type: Date },
    validTo: { type: Date },

    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'service_rates',
  },
);

// 複合インデックス / 复合索引
serviceRateSchema.index({ tenantId: 1, clientId: 1, chargeType: 1 });
serviceRateSchema.index({ tenantId: 1, isActive: 1 });

export const ServiceRate = mongoose.model<IServiceRate>(
  'ServiceRate',
  serviceRateSchema,
);
