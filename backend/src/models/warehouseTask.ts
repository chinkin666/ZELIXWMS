import mongoose from 'mongoose';

/** 倉庫タスク種別 */
export type WarehouseTaskType = 'putaway' | 'picking' | 'replenishment' | 'packing' | 'sorting' | 'cycle_count' | 'transfer' | 'receiving';

/** 倉庫タスクステータス */
export type WarehouseTaskStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

/** 倉庫タスク優先度 */
export type WarehouseTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/** 倉庫タスク（WarehouseTask）インターフェース */
export interface IWarehouseTask {
  /** タスクID */
  _id: mongoose.Types.ObjectId;
  /** タスク番号 */
  taskNumber: string;
  /** タスク種別 */
  type: WarehouseTaskType;
  /** ステータス */
  status: WarehouseTaskStatus;
  /** 優先度 */
  priority: WarehouseTaskPriority;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 3PL顧客ID */
  clientId?: mongoose.Types.ObjectId;
  /** 担当者ID */
  assignedTo?: string;
  /** 担当者名 */
  assignedName?: string;
  /** 商品ID */
  productId?: mongoose.Types.ObjectId;
  /** 商品SKU */
  productSku?: string;
  /** 商品名 */
  productName?: string;
  /** 元ロケーションID */
  fromLocationId?: mongoose.Types.ObjectId;
  /** 元ロケーションコード */
  fromLocationCode?: string;
  /** 先ロケーションID */
  toLocationId?: mongoose.Types.ObjectId;
  /** 先ロケーションコード */
  toLocationCode?: string;
  /** ロットID */
  lotId?: mongoose.Types.ObjectId;
  /** ロット番号 */
  lotNumber?: string;
  /** 必要数量 */
  requiredQuantity: number;
  /** 完了数量 */
  completedQuantity: number;
  /** 関連元タイプ */
  referenceType?: string;
  /** 関連元ID */
  referenceId?: string;
  /** 関連元番号 */
  referenceNumber?: string;
  /** 波次ID */
  waveId?: mongoose.Types.ObjectId;
  /** 出荷指示ID */
  shipmentId?: mongoose.Types.ObjectId;
  /** 作業指示メモ */
  instructions?: string;
  /** 開始日時 */
  startedAt?: Date;
  /** 完了日時 */
  completedAt?: Date;
  /** 作業時間（ミリ秒） */
  durationMs?: number;
  /** 備考 */
  memo?: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

const warehouseTaskSchema = new mongoose.Schema<IWarehouseTask>(
  {
    taskNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['putaway', 'picking', 'replenishment', 'packing', 'sorting', 'cycle_count', 'transfer', 'receiving'],
    },
    status: {
      type: String,
      required: true,
      enum: ['created', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'],
      default: 'created',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    assignedName: {
      type: String,
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
    fromLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    fromLocationCode: {
      type: String,
      trim: true,
    },
    toLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    toLocationCode: {
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
    requiredQuantity: {
      type: Number,
      default: 0,
    },
    completedQuantity: {
      type: Number,
      default: 0,
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    waveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wave',
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShipmentOrder',
    },
    instructions: {
      type: String,
      trim: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'warehouse_tasks',
  },
);

warehouseTaskSchema.index({ warehouseId: 1, type: 1, status: 1 });
warehouseTaskSchema.index({ assignedTo: 1, status: 1 });
warehouseTaskSchema.index({ type: 1, status: 1 });
warehouseTaskSchema.index({ status: 1, priority: 1 });
warehouseTaskSchema.index({ clientId: 1 });
warehouseTaskSchema.index({ waveId: 1 });
warehouseTaskSchema.index({ shipmentId: 1 });
warehouseTaskSchema.index({ referenceType: 1, referenceId: 1 });
warehouseTaskSchema.index({ productId: 1 });
warehouseTaskSchema.index({ createdAt: -1 });

/** 倉庫タスクモデル */
export const WarehouseTask = mongoose.model<IWarehouseTask>('WarehouseTask', warehouseTaskSchema);
