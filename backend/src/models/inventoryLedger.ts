import mongoose from 'mongoose';

/** 流水タイプ */
export type LedgerType = 'inbound' | 'outbound' | 'reserve' | 'release' | 'adjustment' | 'count';

/** 関連単据タイプ */
export type ReferenceType = 'inbound-order' | 'shipment-order' | 'adjustment' | 'stocktaking-order' | 'return-order' | 'manual';

/** 在庫流水台帳インターフェース */
export interface IInventoryLedger {
  _id: mongoose.Types.ObjectId;
  // テナントID / 租户ID
  tenantId?: string;
  /** 3PL顧客ID（将来の3PL対応用） */
  clientId?: mongoose.Types.ObjectId;
  /** 商品ID */
  productId: mongoose.Types.ObjectId;
  /** 商品SKU（検索用） */
  productSku: string;
  /** 倉庫ID */
  warehouseId?: mongoose.Types.ObjectId;
  /** ロケーションID */
  locationId?: mongoose.Types.ObjectId;
  /** ロットID */
  lotId?: mongoose.Types.ObjectId;
  /** ロット番号 */
  lotNumber?: string;
  /** 流水タイプ */
  type: LedgerType;
  /** 変動数量（正=増加、負=減少） */
  quantity: number;
  /** 関連単据タイプ */
  referenceType?: ReferenceType;
  /** 関連単据ID */
  referenceId?: string;
  /** 関連単据番号 */
  referenceNumber?: string;
  /** 変動理由 */
  reason?: string;
  /** 実行者 */
  executedBy?: string;
  /** 実行日時 */
  executedAt?: Date;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 在庫流水台帳スキーマ */
const inventoryLedgerSchema = new mongoose.Schema<IInventoryLedger>(
  {
    // テナントID / 租户ID
    tenantId: { type: String, trim: true, index: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
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
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['inbound', 'outbound', 'reserve', 'release', 'adjustment', 'count'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ['inbound-order', 'shipment-order', 'adjustment', 'stocktaking-order', 'return-order', 'manual'],
    },
    referenceId: {
      type: String,
    },
    referenceNumber: {
      type: String,
    },
    reason: {
      type: String,
      trim: true,
    },
    executedBy: {
      type: String,
      trim: true,
    },
    executedAt: {
      type: Date,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventory_ledger',
  },
);

/** 在庫計算用の複合インデックス */
inventoryLedgerSchema.index({ productId: 1, warehouseId: 1, clientId: 1 });
inventoryLedgerSchema.index({ productId: 1, type: 1 });
inventoryLedgerSchema.index({ clientId: 1 });
inventoryLedgerSchema.index({ warehouseId: 1 });
inventoryLedgerSchema.index({ locationId: 1 });
inventoryLedgerSchema.index({ lotId: 1 });
inventoryLedgerSchema.index({ referenceType: 1, referenceId: 1 });
inventoryLedgerSchema.index({ type: 1, executedAt: -1 });
/** 最新の流水検索用 */
inventoryLedgerSchema.index({ createdAt: -1 });

// テナント別在庫台帳検索用複合インデックス / 租户级库存台账查询复合索引
inventoryLedgerSchema.index({ tenantId: 1, createdAt: -1 });

export const InventoryLedger = mongoose.model<IInventoryLedger>('InventoryLedger', inventoryLedgerSchema);
