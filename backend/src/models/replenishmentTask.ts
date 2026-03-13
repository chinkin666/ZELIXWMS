import mongoose from 'mongoose';

/** 補充タスクステータス */
export type ReplenishmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** 補充トリガー種別 */
export type ReplenishmentTrigger = 'auto' | 'manual' | 'wave';

/** 補充タスク（ReplenishmentTask）インターフェース */
export interface IReplenishmentTask {
  /** タスクID */
  _id: mongoose.Types.ObjectId;
  /** 補充タスク番号 */
  taskNumber: string;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 商品ID */
  productId: mongoose.Types.ObjectId;
  /** 商品SKU */
  productSku: string;
  /** 商品名 */
  productName?: string;
  /** 補充元ロケーション（Storage） */
  fromLocationId: mongoose.Types.ObjectId;
  /** 補充先ロケーション（Picking） */
  toLocationId: mongoose.Types.ObjectId;
  /** 補充元コード（表示用） */
  fromLocationCode?: string;
  /** 補充先コード（表示用） */
  toLocationCode?: string;
  /** 補充数量 */
  quantity: number;
  /** ステータス */
  status: ReplenishmentStatus;
  /** トリガー種別 */
  trigger: ReplenishmentTrigger;
  /** 担当者ID */
  assignedTo?: string;
  /** 担当者名 */
  assignedName?: string;
  /** 関連波次ID */
  waveId?: mongoose.Types.ObjectId;
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

const replenishmentTaskSchema = new mongoose.Schema<IReplenishmentTask>(
  {
    taskNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
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
    fromLocationCode: {
      type: String,
      trim: true,
    },
    toLocationCode: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      required: true,
      default: 'pending',
    },
    trigger: {
      type: String,
      enum: ['auto', 'manual', 'wave'],
      required: true,
      default: 'auto',
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    assignedName: {
      type: String,
      trim: true,
    },
    waveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wave',
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
    collection: 'replenishment_tasks',
  },
);

replenishmentTaskSchema.index({ warehouseId: 1, status: 1 });
replenishmentTaskSchema.index({ productId: 1 });
replenishmentTaskSchema.index({ fromLocationId: 1 });
replenishmentTaskSchema.index({ toLocationId: 1 });
replenishmentTaskSchema.index({ status: 1 });
replenishmentTaskSchema.index({ waveId: 1 });
replenishmentTaskSchema.index({ createdAt: -1 });

/** 補充タスクモデル */
export const ReplenishmentTask = mongoose.model<IReplenishmentTask>(
  'ReplenishmentTask',
  replenishmentTaskSchema,
);
