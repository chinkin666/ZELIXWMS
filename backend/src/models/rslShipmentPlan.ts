import mongoose from 'mongoose';

// RSLプランステータス / RSL计划状态
export type RslPlanStatus = 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';

// RSLプラン明細項目 / RSL计划明细项目
export interface IRslPlanItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  rakutenSku?: string;          // 楽天SKU / 乐天SKU
  quantity: number;
  preparedQuantity: number;     // 準備済み数量 / 已准备数量
  shippedQuantity: number;      // 出荷済み数量 / 已出货数量
}

export interface IRslShipmentPlan {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  planNumber: string;            // RSL-20260315-001
  status: RslPlanStatus;
  // 楽天情報 / 乐天信息
  rakutenShipmentId?: string;   // 楽天側の入庫プランID / 乐天侧入库计划ID
  destinationWarehouse: string; // 配送先倉庫（例: 市川FC, 八千代FC, 茨木FC）/ 配送目的仓库
  // 明細 / 明细
  items: IRslPlanItem[];
  // 配送 / 配送
  carrierId?: string;
  trackingNumber?: string;
  boxCount?: number;
  totalQuantity: number;
  // 日付 / 日期
  shipDate?: Date;
  estimatedArrival?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  receivedAt?: Date;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 明細項目スキーマ / 明细项目 Schema
const rslPlanItemSchema = new mongoose.Schema<IRslPlanItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    rakutenSku: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    preparedQuantity: { type: Number, default: 0, min: 0 },
    shippedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const rslShipmentPlanSchema = new mongoose.Schema<IRslShipmentPlan>(
  {
    tenantId: { type: String, required: true, trim: true },
    planNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'shipped', 'received', 'cancelled'],
      default: 'draft',
    },
    // 楽天情報 / 乐天信息
    rakutenShipmentId: { type: String, trim: true },
    destinationWarehouse: { type: String, required: true, trim: true },
    // 明細 / 明细
    items: { type: [rslPlanItemSchema], required: true, default: [] },
    // 配送 / 配送
    carrierId: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    boxCount: { type: Number, min: 1 },
    totalQuantity: { type: Number, required: true, default: 0, min: 0 },
    // 日付 / 日期
    shipDate: { type: Date },
    estimatedArrival: { type: Date },
    confirmedAt: { type: Date },
    shippedAt: { type: Date },
    receivedAt: { type: Date },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'rsl_shipment_plans',
  },
);

// インデックス / 索引
rslShipmentPlanSchema.index({ tenantId: 1, planNumber: 1 }, { unique: true });
rslShipmentPlanSchema.index({ tenantId: 1, status: 1 });

export const RslShipmentPlan = mongoose.model<IRslShipmentPlan>(
  'RslShipmentPlan',
  rslShipmentPlanSchema,
);
