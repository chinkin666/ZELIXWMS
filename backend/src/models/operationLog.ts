import mongoose from 'mongoose';

export type OperationAction =
  | 'inbound_receive'
  | 'inbound_putaway'
  | 'outbound_pick'
  | 'outbound_inspect'
  | 'outbound_ship'
  | 'transfer'
  | 'adjustment'
  | 'stocktaking'
  | 'return_receive'
  | 'return_inspect'
  | 'lot_update'
  | 'product_update'
  | 'location_update'
  | 'order_create'
  | 'order_update'
  | 'order_cancel';

export type OperationCategory = 'inbound' | 'outbound' | 'inventory' | 'master' | 'return';

export interface IOperationLog {
  _id: mongoose.Types.ObjectId;
  action: OperationAction;
  category: OperationCategory;
  description: string;
  productId?: mongoose.Types.ObjectId;
  productSku?: string;
  productName?: string;
  locationCode?: string;
  lotNumber?: string;
  quantity?: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  userName: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const operationLogSchema = new mongoose.Schema<IOperationLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'inbound_receive',
        'inbound_putaway',
        'outbound_pick',
        'outbound_inspect',
        'outbound_ship',
        'transfer',
        'adjustment',
        'stocktaking',
        'return_receive',
        'return_inspect',
        'lot_update',
        'product_update',
        'location_update',
        'order_create',
        'order_update',
        'order_cancel',
      ],
    },
    category: {
      type: String,
      enum: ['inbound', 'outbound', 'inventory', 'master', 'return'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productSku: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    locationCode: {
      type: String,
      trim: true,
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      default: 'system',
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'operation_logs',
  },
);

operationLogSchema.index({ createdAt: -1 });
operationLogSchema.index({ action: 1 });
operationLogSchema.index({ productSku: 1 });
operationLogSchema.index({ referenceNumber: 1 });
operationLogSchema.index({ category: 1 });
// 複合インデックス：カテゴリ×アクション×日時 / 复合索引：类别×操作×时间
operationLogSchema.index({ category: 1, action: 1, createdAt: -1 });

export const OperationLog = mongoose.model<IOperationLog>('OperationLog', operationLogSchema);
