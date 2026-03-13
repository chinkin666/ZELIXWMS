import mongoose from 'mongoose';

/** 分拣タスクステータス */
export type SortingTaskStatus = 'pending' | 'sorting' | 'completed' | 'cancelled';

/** 分拣タスクインターフェース */
export interface ISortingTask {
  _id: mongoose.Types.ObjectId;
  /** 分拣タスク番号 */
  taskNumber: string;
  /** 波次ID */
  waveId: mongoose.Types.ObjectId;
  /** 出荷指示ID */
  shipmentId: mongoose.Types.ObjectId;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 分拣担当者ID */
  sorterId?: string;
  /** 分拣担当者名 */
  sorterName?: string;
  /** タスクステータス */
  status: SortingTaskStatus;
  /** 分拣スロット番号（分拣台の位置） */
  sortingSlot?: string;
  /** 合計商品点数 */
  totalItems: number;
  /** 仕分け済み点数 */
  sortedItems: number;
  /** 開始日時 */
  startedAt?: Date;
  /** 完了日時 */
  completedAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 分拣タスクスキーマ */
const sortingTaskSchema = new mongoose.Schema<ISortingTask>(
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
      required: true,
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
    sorterId: {
      type: String,
      trim: true,
    },
    sorterName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'sorting', 'completed', 'cancelled'],
    },
    sortingSlot: {
      type: String,
      trim: true,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    sortedItems: {
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
  { timestamps: true, collection: 'sorting_tasks' }
);

/** 波次IDインデックス */
sortingTaskSchema.index({ waveId: 1 });
/** 出荷指示IDインデックス */
sortingTaskSchema.index({ shipmentId: 1 });
/** 倉庫ID + ステータス複合インデックス */
sortingTaskSchema.index({ warehouseId: 1, status: 1 });
/** ステータスインデックス */
sortingTaskSchema.index({ status: 1 });
/** 分拣スロットインデックス */
sortingTaskSchema.index({ sortingSlot: 1 });
/** 作成日時インデックス */
sortingTaskSchema.index({ createdAt: -1 });

/** 分拣タスクモデル */
export const SortingTask = mongoose.model<ISortingTask>('SortingTask', sortingTaskSchema);
