import mongoose from 'mongoose';
import type { ChargeType } from './serviceRate';
import { CHARGE_TYPES } from './serviceRate';

// ============================================
// 作業チャージインターフェース / 作业费用接口
// ============================================

/**
 * 参照種別 / 引用类型
 */
export type ReferenceType =
  | 'shipmentOrder'   // 出荷指示 / 出货指令
  | 'inboundOrder'    // 入庫指示 / 入库指令
  | 'returnOrder'     // 返品 / 退货
  | 'stocktaking'     // 棚卸 / 盘点
  | 'manual';         // 手動 / 手动

/** 参照種別の有効値一覧 / 引用类型有效值列表 */
export const REFERENCE_TYPES: readonly ReferenceType[] = [
  'shipmentOrder',
  'inboundOrder',
  'returnOrder',
  'stocktaking',
  'manual',
] as const;

/**
 * 作業チャージ（WorkCharge）
 * 作業実行時に発生する個別チャージレコード / 作业执行时产生的单笔费用记录
 */
export interface IWorkCharge {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 荷主ID / 货主ID */
  clientId?: string;
  /** 荷主名（表示用キャッシュ）/ 货主名（显示用缓存） */
  clientName?: string;
  /** 子顧客ID（費用明細の分類用）/ 子客户ID（费用明细按子客户拆分） */
  subClientId?: string;
  /** 子顧客名 / 子客户名 */
  subClientName?: string;
  /** 店舗ID（費用明細の分類用）/ 店铺ID（费用明细按店铺拆分） */
  shopId?: string;
  /** 店舗名 / 店铺名 */
  shopName?: string;
  /** チャージ種別 / 费用类型 */
  chargeType: ChargeType;
  /** チャージ発生日 / 费用发生日 */
  chargeDate: Date;

  // 参照 / 引用
  /** 参照種別 / 引用类型 */
  referenceType: ReferenceType;
  /** 参照ID / 引用ID */
  referenceId?: string;
  /** 注文番号等 / 订单号等 */
  referenceNumber?: string;

  // 金額 / 金额
  /** 数量 / 数量 */
  quantity: number;
  /** 単価 / 单价 */
  unitPrice: number;
  /** 合計金額（quantity * unitPrice）/ 总金额 */
  amount: number;
  /** 説明 / 说明 */
  description: string;

  // 請求ステータス / 请求状态
  /** 請求期間（例：'2026-03'）/ 计费期间 */
  billingPeriod?: string;
  /** 請求レコードID / 计费记录ID */
  billingRecordId?: string;
  /** 請求済みか / 是否已计费 */
  isBilled: boolean;

  /** 備考 / 备注 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workChargeSchema = new mongoose.Schema<IWorkCharge>(
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
    subClientId: {
      type: String,
      trim: true,
    },
    subClientName: {
      type: String,
      trim: true,
    },
    shopId: {
      type: String,
      trim: true,
    },
    shopName: {
      type: String,
      trim: true,
    },
    chargeType: {
      type: String,
      required: true,
      enum: CHARGE_TYPES,
    },
    chargeDate: {
      type: Date,
      required: true,
    },

    // 参照 / 引用
    referenceType: {
      type: String,
      required: true,
      enum: REFERENCE_TYPES,
      default: 'manual',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },

    // 金額 / 金额
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // 請求ステータス / 请求状态
    billingPeriod: {
      type: String,
      trim: true,
    },
    billingRecordId: {
      type: String,
      trim: true,
    },
    isBilled: {
      type: Boolean,
      default: false,
    },

    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'work_charges',
  },
);

// 複合インデックス / 复合索引
workChargeSchema.index({ tenantId: 1, chargeDate: -1 });
workChargeSchema.index({ tenantId: 1, clientId: 1, isBilled: 1 });
workChargeSchema.index({ tenantId: 1, billingPeriod: 1 });
workChargeSchema.index({ referenceId: 1 });
// 按子客户/店铺查费用明细 / サブ顧客・店舗別費用明細用
workChargeSchema.index({ tenantId: 1, subClientId: 1 });
workChargeSchema.index({ tenantId: 1, shopId: 1 });

export const WorkCharge = mongoose.model<IWorkCharge>(
  'WorkCharge',
  workChargeSchema,
);
