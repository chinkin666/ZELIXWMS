import mongoose from 'mongoose';

export type ReturnOrderStatus = 'draft' | 'inspecting' | 'completed' | 'cancelled';
export type ReturnReason = 'customer_request' | 'defective' | 'wrong_item' | 'damaged' | 'other';
export type Disposition = 'restock' | 'dispose' | 'repair' | 'pending';

export interface IReturnOrderLine {
  lineNumber: number;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  quantity: number;
  inspectedQuantity: number;
  disposition: Disposition;
  restockedQuantity: number;
  disposedQuantity: number;
  locationId?: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  memo?: string;
}

export interface IReturnOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  status: ReturnOrderStatus;
  shipmentOrderId?: mongoose.Types.ObjectId;
  shipmentOrderNumber?: string;
  returnReason: ReturnReason;
  reasonDetail?: string;
  customerName?: string;
  receivedDate: Date;
  completedAt?: Date;
  lines: IReturnOrderLine[];
  memo?: string;
  createdBy?: string;
  // RMA番号（返品承認番号）
  rmaNumber?: string;
  // 返品配送伝票番号
  returnTrackingId?: string;
  // 顧客注文番号
  customerOrderNumber?: string;
  /** 自定义字段 / カスタムフィールド */
  customFields?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const returnOrderLineSchema = new mongoose.Schema<IReturnOrderLine>(
  {
    lineNumber: {
      type: Number,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    inspectedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    disposition: {
      type: String,
      required: true,
      enum: ['restock', 'dispose', 'repair', 'pending'],
      default: 'pending',
    },
    restockedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    disposedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const returnOrderSchema = new mongoose.Schema<IReturnOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'inspecting', 'completed', 'cancelled'],
      default: 'draft',
    },
    shipmentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShipmentOrder',
    },
    shipmentOrderNumber: {
      type: String,
      trim: true,
    },
    returnReason: {
      type: String,
      required: true,
      enum: ['customer_request', 'defective', 'wrong_item', 'damaged', 'other'],
    },
    reasonDetail: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    receivedDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    lines: {
      type: [returnOrderLineSchema],
      default: [],
    },
    memo: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      trim: true,
    },

    // RMA番号（返品承認番号）
    rmaNumber: { type: String, trim: true },
    // 返品配送伝票番号
    returnTrackingId: { type: String, trim: true },
    // 顧客注文番号
    customerOrderNumber: { type: String, trim: true },

    // 自定义字段 / カスタムフィールド（Phase 5）
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'return_orders',
  },
);

returnOrderSchema.index({ status: 1, receivedDate: -1 });
returnOrderSchema.index({ shipmentOrderId: 1 });
returnOrderSchema.index({ 'lines.productId': 1 });
returnOrderSchema.index({ returnReason: 1 });

export const ReturnOrder = mongoose.model<IReturnOrder>('ReturnOrder', returnOrderSchema);
