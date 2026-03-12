import mongoose from 'mongoose';

export type InboundOrderStatus = 'draft' | 'confirmed' | 'receiving' | 'received' | 'done' | 'cancelled';
export type StockCategory = 'new' | 'damaged';

export interface IInboundOrderLine {
  lineNumber: number;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  expectedQuantity: number;
  receivedQuantity: number;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  expiryDate?: Date;
  locationId?: mongoose.Types.ObjectId;
  stockMoveIds: mongoose.Types.ObjectId[];
  putawayLocationId?: mongoose.Types.ObjectId;
  putawayQuantity: number;
  stockCategory: StockCategory;
  orderReferenceNumber?: string;
  memo?: string;
}

export interface IInboundOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  status: InboundOrderStatus;
  destinationLocationId: mongoose.Types.ObjectId;
  supplier?: {
    name: string;
    code?: string;
    memo?: string;
  };
  lines: IInboundOrderLine[];
  expectedDate?: Date;
  completedAt?: Date;
  memo?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inboundOrderLineSchema = new mongoose.Schema<IInboundOrderLine>(
  {
    lineNumber: { type: Number, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productSku: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    expectedQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    lotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot' },
    lotNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    stockMoveIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StockMove' }],
    putawayLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    putawayQuantity: { type: Number, default: 0, min: 0 },
    stockCategory: { type: String, enum: ['new', 'damaged'], default: 'new' },
    orderReferenceNumber: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  { _id: false },
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  { _id: false },
);

const inboundOrderSchema = new mongoose.Schema<IInboundOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'confirmed', 'receiving', 'received', 'done', 'cancelled'],
      default: 'draft',
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    supplier: { type: supplierSchema },
    lines: { type: [inboundOrderLineSchema], default: [] },
    expectedDate: { type: Date },
    completedAt: { type: Date },
    memo: { type: String, trim: true },
    createdBy: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'inbound_orders',
  },
);

inboundOrderSchema.index({ status: 1 });
inboundOrderSchema.index({ expectedDate: 1 });
inboundOrderSchema.index({ 'lines.productId': 1 });
inboundOrderSchema.index({ 'lines.productSku': 1 });

export const InboundOrder = mongoose.model<IInboundOrder>('InboundOrder', inboundOrderSchema);
