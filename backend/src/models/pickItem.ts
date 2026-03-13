import mongoose from 'mongoose';

/** 拣货明細ステータス */
export type PickItemStatus = 'pending' | 'picked' | 'short' | 'skipped';

/** 拣货明細インターフェース */
export interface IPickItem {
  _id: mongoose.Types.ObjectId;
  /** 拣货タスクID */
  pickTaskId: mongoose.Types.ObjectId;
  /** 出荷指示ID */
  shipmentId: mongoose.Types.ObjectId;
  /** 商品ID */
  productId: mongoose.Types.ObjectId;
  /** 商品SKU */
  productSku: string;
  /** 商品名 */
  productName?: string;
  /** ロケーションID */
  locationId: mongoose.Types.ObjectId;
  /** ロケーションコード（表示用） */
  locationCode?: string;
  /** ロットID */
  lotId?: mongoose.Types.ObjectId;
  /** ロット番号 */
  lotNumber?: string;
  /** 必要数量 */
  requiredQuantity: number;
  /** 拣取済み数量 */
  pickedQuantity: number;
  /** 明細ステータス */
  status: PickItemStatus;
  /** 拣取日時 */
  pickedAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 拣货明細スキーマ */
const pickItemSchema = new mongoose.Schema<IPickItem>(
  {
    pickTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickTask',
      required: true,
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShipmentOrder',
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
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    locationCode: {
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
      required: true,
    },
    pickedQuantity: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'picked', 'short', 'skipped'],
    },
    pickedAt: {
      type: Date,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'pick_items',
  },
);

/** 拣货タスクIDインデックス */
pickItemSchema.index({ pickTaskId: 1 });
/** 出荷指示IDインデックス */
pickItemSchema.index({ shipmentId: 1 });
/** 商品IDインデックス */
pickItemSchema.index({ productId: 1 });
/** ロケーションIDインデックス */
pickItemSchema.index({ locationId: 1 });
/** ステータスインデックス */
pickItemSchema.index({ status: 1 });
/** 拣货タスク + ロケーション複合インデックス（ルート最適化用） */
pickItemSchema.index({ pickTaskId: 1, locationId: 1 });

/** 拣货明細モデル */
export const PickItem = mongoose.model<IPickItem>('PickItem', pickItemSchema);
