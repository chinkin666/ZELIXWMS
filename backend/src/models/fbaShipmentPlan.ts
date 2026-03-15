import mongoose from 'mongoose';

// FBAプランステータス / FBA计划状态
export type FbaPlanStatus = 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';

// FBAプラン明細項目 / FBA计划明细项目
export interface IFbaPlanItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  fnsku?: string;
  asin?: string;
  quantity: number;
  preparedQuantity: number;   // 準備済み数量 / 已准备数量
  shippedQuantity: number;    // 出荷済み数量 / 已出货数量
}

export interface IFbaShipmentPlan {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  planNumber: string;          // FBA-20260315-001
  status: FbaPlanStatus;
  // Amazon情報 / Amazon信息
  amazonShipmentId?: string;   // Amazon側の入庫プランID / Amazon侧入库计划ID
  destinationFc: string;       // 配送先FC（例: NRT5）/ 配送目的FC（例: NRT5）
  // 出荷元 / 发货方
  shipFromName?: string;
  shipFromAddress?: string;
  // 明細 / 明细
  items: IFbaPlanItem[];
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
const fbaPlanItemSchema = new mongoose.Schema<IFbaPlanItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    fnsku: { type: String, trim: true },
    asin: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    preparedQuantity: { type: Number, default: 0, min: 0 },
    shippedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const fbaShipmentPlanSchema = new mongoose.Schema<IFbaShipmentPlan>(
  {
    tenantId: { type: String, required: true, trim: true },
    planNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'shipped', 'received', 'cancelled'],
      default: 'draft',
    },
    // Amazon情報 / Amazon信息
    amazonShipmentId: { type: String, trim: true },
    destinationFc: { type: String, required: true, trim: true },
    // 出荷元 / 发货方
    shipFromName: { type: String, trim: true },
    shipFromAddress: { type: String, trim: true },
    // 明細 / 明细
    items: { type: [fbaPlanItemSchema], required: true, default: [] },
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
    collection: 'fba_shipment_plans',
  },
);

// インデックス / 索引
fbaShipmentPlanSchema.index({ tenantId: 1, planNumber: 1 }, { unique: true });
fbaShipmentPlanSchema.index({ tenantId: 1, status: 1 });

export const FbaShipmentPlan = mongoose.model<IFbaShipmentPlan>(
  'FbaShipmentPlan',
  fbaShipmentPlanSchema,
);
