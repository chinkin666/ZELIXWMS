import mongoose from 'mongoose';

export type MoveType = 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'return' | 'stocktaking';
export type MoveState = 'draft' | 'confirmed' | 'done' | 'cancelled';
export type ReferenceType = 'inbound-order' | 'shipment-order' | 'adjustment' | 'manual' | 'stocktaking-order' | 'return-order';

export interface IStockMove {
  _id: mongoose.Types.ObjectId;
  moveNumber: string;
  moveType: MoveType;
  state: MoveState;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  fromLocationId: mongoose.Types.ObjectId;
  toLocationId: mongoose.Types.ObjectId;
  quantity: number;
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  scheduledDate?: Date;
  executedAt?: Date;
  executedBy?: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockMoveSchema = new mongoose.Schema<IStockMove>(
  {
    moveNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    moveType: {
      type: String,
      required: true,
      enum: ['inbound', 'outbound', 'transfer', 'adjustment', 'return', 'stocktaking'],
    },
    state: {
      type: String,
      required: true,
      enum: ['draft', 'confirmed', 'done', 'cancelled'],
      default: 'draft',
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
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    fromLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    toLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceType: {
      type: String,
      enum: ['inbound-order', 'shipment-order', 'adjustment', 'manual', 'stocktaking-order', 'return-order'],
    },
    referenceId: {
      type: String,
    },
    referenceNumber: {
      type: String,
    },
    scheduledDate: {
      type: Date,
    },
    executedAt: {
      type: Date,
    },
    executedBy: {
      type: String,
      trim: true,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'stock_moves',
  },
);

stockMoveSchema.index({ moveType: 1, state: 1 });
stockMoveSchema.index({ productId: 1, state: 1 });
stockMoveSchema.index({ fromLocationId: 1 });
stockMoveSchema.index({ toLocationId: 1 });
stockMoveSchema.index({ referenceType: 1, referenceId: 1 });
stockMoveSchema.index({ lotId: 1 });
stockMoveSchema.index({ executedAt: -1 });
stockMoveSchema.index({ scheduledDate: 1, state: 1 });
// 単独referenceId検索用 / 单独referenceId查询用索引
stockMoveSchema.index({ referenceId: 1 });
// 複合インデックス：referenceId×state / 复合索引：referenceId×state
stockMoveSchema.index({ referenceId: 1, state: 1 });

export const StockMove = mongoose.model<IStockMove>('StockMove', stockMoveSchema);
