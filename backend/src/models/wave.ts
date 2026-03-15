import mongoose from 'mongoose';

/** 波次ステータス */
export type WaveStatus = 'draft' | 'picking' | 'sorting' | 'packing' | 'completed' | 'cancelled';

/** 波次優先度 */
export type WavePriority = 'low' | 'normal' | 'high' | 'urgent';

/** 波次インターフェース */
export interface IWave {
  _id: mongoose.Types.ObjectId;
  /** 波次番号 */
  waveNumber: string;
  /** 倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 3PL顧客ID */
  clientId?: mongoose.Types.ObjectId;
  /** 波次ステータス */
  status: WaveStatus;
  /** 優先度 */
  priority: WavePriority;
  /** 出荷指示IDリスト */
  shipmentIds: mongoose.Types.ObjectId[];
  /** 出荷件数 */
  shipmentCount: number;
  /** 合計商品点数 */
  totalItems: number;
  /** 合計数量 */
  totalQuantity: number;
  /** 担当者 */
  assignedTo?: string;
  /** 担当者名 */
  assignedName?: string;
  /** 開始日時 */
  startedAt?: Date;
  /** 完了日時 */
  completedAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 波次スキーマ */
const waveSchema = new mongoose.Schema<IWave>(
  {
    waveNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    status: {
      type: String,
      required: true,
      default: 'draft',
      enum: ['draft', 'picking', 'sorting', 'packing', 'completed', 'cancelled'],
    },
    priority: {
      type: String,
      default: 'normal',
      enum: ['low', 'normal', 'high', 'urgent'],
    },
    shipmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShipmentOrder',
      },
    ],
    shipmentCount: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    /** 担当者名 / 担当者名 */
    assignedName: {
      type: String,
      trim: true,
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
  { timestamps: true, collection: 'waves' }
);

/** 倉庫ID + ステータス複合インデックス */
waveSchema.index({ warehouseId: 1, status: 1 });
/** 顧客IDインデックス */
waveSchema.index({ clientId: 1 });
/** ステータスインデックス */
waveSchema.index({ status: 1 });
/** 優先度 + 作成日時インデックス */
waveSchema.index({ priority: 1, createdAt: -1 });
/** 作成日時インデックス */
waveSchema.index({ createdAt: -1 });

/** 波次モデル */
export const Wave = mongoose.model<IWave>('Wave', waveSchema);
