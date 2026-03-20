import mongoose from 'mongoose';

/** 引当ステータス */
export type ReservationStatus = 'active' | 'fulfilled' | 'released' | 'expired';

/** 引当元種別 */
export type ReservationSource = 'order' | 'shipment' | 'transfer' | 'manual';

/** 在庫引当インターフェース */
export interface IInventoryReservation {
  _id: mongoose.Types.ObjectId;
  // テナントID / 租户ID
  tenantId?: string;
  /** 商品ID */
  productId: mongoose.Types.ObjectId;
  /** 商品SKU */
  productSku: string;
  /** 3PL顧客ID */
  clientId?: mongoose.Types.ObjectId;
  /** 倉庫ID */
  warehouseId?: mongoose.Types.ObjectId;
  /** ロケーションID */
  locationId?: mongoose.Types.ObjectId;
  /** ロットID */
  lotId?: mongoose.Types.ObjectId;
  /** シリアル番号ID */
  serialId?: mongoose.Types.ObjectId;
  /** 引当数量 */
  quantity: number;
  /** 引当ステータス */
  status: ReservationStatus;
  /** 引当元種別 */
  source: ReservationSource;
  /** 引当元ID（注文ID・出荷IDなど） */
  referenceId: string;
  /** 引当元番号 */
  referenceNumber?: string;
  /** 引当日時 */
  reservedAt: Date;
  /** 消化日時（出荷完了時） */
  fulfilledAt?: Date;
  /** 解放日時（キャンセル時） */
  releasedAt?: Date;
  /** 引当期限 */
  expiresAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 在庫引当スキーマ */
const inventoryReservationSchema = new mongoose.Schema<IInventoryReservation>(
  {
    // テナントID / 租户ID
    tenantId: { type: String, trim: true, index: true },
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
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    serialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SerialNumber',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: ['active', 'fulfilled', 'released', 'expired'],
    },
    source: {
      type: String,
      required: true,
      enum: ['order', 'shipment', 'transfer', 'manual'],
    },
    referenceId: {
      type: String,
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    reservedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fulfilledAt: {
      type: Date,
    },
    releasedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventory_reservations',
  },
);

/** 引当検索用の複合インデックス */
inventoryReservationSchema.index({ productId: 1, warehouseId: 1, status: 1 });
/** 詳細引当チェック用の複合インデックス */
inventoryReservationSchema.index({ productId: 1, locationId: 1, lotId: 1, status: 1 });
/** 注文・出荷による引当検索用 */
inventoryReservationSchema.index({ referenceId: 1, source: 1 });
inventoryReservationSchema.index({ clientId: 1 });
inventoryReservationSchema.index({ status: 1 });
/** 期限切れ引当のクリーンアップ用 */
inventoryReservationSchema.index({ expiresAt: 1, status: 1 });
inventoryReservationSchema.index({ serialId: 1 });
/** 最新の引当検索用 */
inventoryReservationSchema.index({ createdAt: -1 });

export const InventoryReservation = mongoose.model<IInventoryReservation>('InventoryReservation', inventoryReservationSchema);
