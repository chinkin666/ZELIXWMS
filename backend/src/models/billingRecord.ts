import mongoose from 'mongoose';

// 请求明细ステータス / 请求明细状态
export type BillingRecordStatus = 'draft' | 'confirmed' | 'invoiced' | 'paid';

// 请求明细インターフェース / 请求明细接口
export interface IBillingRecord {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  period: string;              // '2026-03' 形式 / '2026-03' 格式
  clientId?: string;           // 荷主ID（OrderSourceCompany） / 货主ID
  clientName?: string;         // 荷主名 / 货主名
  carrierId?: string;          // 配送業者ID / 配送商ID
  carrierName?: string;        // 配送業者名 / 配送商名
  // 集計データ / 汇总数据
  orderCount: number;          // 出荷件数 / 出货件数
  totalQuantity: number;       // 商品総数 / 商品总数
  totalShippingCost: number;   // 配送料金合計 / 配送费用合计
  handlingFee: number;         // 作業手数料 / 操作手续费
  storageFee: number;          // 保管料 / 保管费
  otherFees: number;           // その他費用 / 其他费用
  totalAmount: number;         // 合計金額 / 合计金额
  // ステータス / 状态
  status: BillingRecordStatus;
  confirmedAt?: Date;
  confirmedBy?: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingRecordSchema = new mongoose.Schema<IBillingRecord>(
  {
    tenantId: { type: String, required: true, trim: true },
    period: {
      type: String,
      required: true,
      trim: true,
      validate: {
        // YYYY-MM 形式のバリデーション / YYYY-MM 格式验证
        validator: (v: string) => /^\d{4}-\d{2}$/.test(v),
        message: '期間はYYYY-MM形式である必要があります / 期间必须为YYYY-MM格式',
      },
    },
    clientId: { type: String, trim: true, default: undefined },
    clientName: { type: String, trim: true, default: undefined },
    carrierId: { type: String, trim: true, default: undefined },
    carrierName: { type: String, trim: true, default: undefined },
    // 集計データ / 汇总数据
    orderCount: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    totalShippingCost: { type: Number, default: 0 },
    handlingFee: { type: Number, default: 0 },
    storageFee: { type: Number, default: 0 },
    otherFees: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    // ステータス / 状态
    status: {
      type: String,
      required: true,
      enum: ['draft', 'confirmed', 'invoiced', 'paid'],
      default: 'draft',
    },
    confirmedAt: { type: Date },
    confirmedBy: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'billing_records',
  },
);

// インデックス / 索引
billingRecordSchema.index({ tenantId: 1, period: 1 });
billingRecordSchema.index({ tenantId: 1, clientId: 1 });
billingRecordSchema.index({ tenantId: 1, carrierId: 1 });
billingRecordSchema.index({ status: 1 });
billingRecordSchema.index({ tenantId: 1, period: 1, clientId: 1, carrierId: 1 }, { unique: true });

export const BillingRecord = mongoose.model<IBillingRecord>('BillingRecord', billingRecordSchema);
