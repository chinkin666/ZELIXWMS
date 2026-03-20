import mongoose from 'mongoose';

/** 拣货タスクステータス */
export type PickTaskStatus = 'pending' | 'picking' | 'completed' | 'cancelled';

/** 拣货タスク（PickTask）インターフェース */
export interface IPickTask {
  /** タスクID */
  _id: mongoose.Types.ObjectId;
  // テナントID / 租户ID
  tenantId?: string;
  /** 拣货タスク番号 */
  taskNumber: string;
  /** 波次ID */
  waveId: mongoose.Types.ObjectId;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 拣货担当者ID */
  pickerId?: string;
  /** 拣货担当者名 */
  pickerName?: string;
  /** タスクステータス */
  status: PickTaskStatus;
  /** 合計商品点数 */
  totalItems: number;
  /** 拣取済み点数 */
  pickedItems: number;
  /** 合計数量 */
  totalQuantity: number;
  /** 拣取済み数量 */
  pickedQuantity: number;
  /** 開始日時 */
  startedAt?: Date;
  /** 完了日時 */
  completedAt?: Date;
  /** 備考 */
  memo?: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

const pickTaskSchema = new mongoose.Schema<IPickTask>(
  {
    // テナントID / 租户ID
    tenantId: { type: String, trim: true, index: true },
    taskNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    waveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wave',
      required: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    pickerId: {
      type: String,
      trim: true,
    },
    pickerName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'picking', 'completed', 'cancelled'],
      required: true,
      default: 'pending',
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    pickedItems: {
      type: Number,
      default: 0,
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    pickedQuantity: {
      type: Number,
      default: 0,
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
  {
    timestamps: true,
    collection: 'pick_tasks',
  },
);

pickTaskSchema.index({ waveId: 1 });
pickTaskSchema.index({ warehouseId: 1, status: 1 });
pickTaskSchema.index({ pickerId: 1, status: 1 });
pickTaskSchema.index({ status: 1 });
pickTaskSchema.index({ createdAt: -1 });

/** 拣货タスクモデル */
export const PickTask = mongoose.model<IPickTask>('PickTask', pickTaskSchema);
