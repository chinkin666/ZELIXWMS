import mongoose from 'mongoose';

/** 梱包タスクステータス */
export type PackingTaskStatus = 'pending' | 'packing' | 'completed' | 'cancelled';

/** 梱包タスクインターフェース */
export interface IPackingTask {
  _id: mongoose.Types.ObjectId;
  /** 梱包タスク番号 */
  taskNumber: string;
  /** 波次ID */
  waveId?: mongoose.Types.ObjectId;
  /** 出荷指示ID */
  shipmentId: mongoose.Types.ObjectId;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 梱包担当者ID */
  packerId?: string;
  /** 梱包担当者名 */
  packerName?: string;
  /** タスクステータス */
  status: PackingTaskStatus;
  /** 梱包ステーションID */
  packingStationId?: string;
  /** 合計商品点数 */
  totalItems: number;
  /** 梱包済み点数 */
  packedItems: number;
  /** 箱数 */
  boxCount: number;
  /** 総重量（g） */
  totalWeight?: number;
  /** 送り状番号 */
  trackingNumber?: string;
  /** 面単印刷済み */
  labelPrinted: boolean;
  /** 開始日時 */
  startedAt?: Date;
  /** 完了日時 */
  completedAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 梱包タスクスキーマ */
const packingTaskSchema = new mongoose.Schema<IPackingTask>(
  {
    taskNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    waveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wave',
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShipmentOrder',
      required: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    packerId: {
      type: String,
      trim: true,
    },
    packerName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'packing', 'completed', 'cancelled'],
    },
    packingStationId: {
      type: String,
      trim: true,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    packedItems: {
      type: Number,
      default: 0,
    },
    boxCount: {
      type: Number,
      default: 1,
    },
    totalWeight: {
      type: Number,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    labelPrinted: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, collection: 'packing_tasks' }
);

/** 波次IDインデックス */
packingTaskSchema.index({ waveId: 1 });
/** 出荷指示IDインデックス */
packingTaskSchema.index({ shipmentId: 1 });
/** 倉庫ID + ステータス複合インデックス */
packingTaskSchema.index({ warehouseId: 1, status: 1 });
/** ステータスインデックス */
packingTaskSchema.index({ status: 1 });
/** 梱包ステーションインデックス */
packingTaskSchema.index({ packingStationId: 1 });
/** 作成日時インデックス */
packingTaskSchema.index({ createdAt: -1 });

/** 梱包タスクモデル */
export const PackingTask = mongoose.model<IPackingTask>('PackingTask', packingTaskSchema);
