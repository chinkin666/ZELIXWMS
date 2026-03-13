import mongoose from 'mongoose';

export type SerialStatus = 'available' | 'reserved' | 'shipped' | 'returned' | 'damaged' | 'scrapped';

export interface ISerialNumber {
  _id: mongoose.Types.ObjectId;
  /** シリアル番号 */
  serialNumber: string;
  /** 商品ID */
  productId: mongoose.Types.ObjectId;
  /** 商品SKU */
  productSku: string;
  /** 商品名 */
  productName?: string;
  /** 3PL顧客ID */
  clientId?: mongoose.Types.ObjectId;
  /** 倉庫ID */
  warehouseId?: mongoose.Types.ObjectId;
  /** 現在ロケーションID */
  locationId?: mongoose.Types.ObjectId;
  /** 現在ロケーションコード */
  locationCode?: string;
  /** 関連ロットID */
  lotId?: mongoose.Types.ObjectId;
  /** 関連ロット番号 */
  lotNumber?: string;
  /** ステータス */
  status: SerialStatus;
  /** 入庫日時 */
  receivedAt?: Date;
  /** 出荷日時 */
  shippedAt?: Date;
  /** 入庫指示ID */
  inboundOrderId?: string;
  /** 出荷指示ID */
  shipmentId?: string;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const serialNumberSchema = new mongoose.Schema<ISerialNumber>(
  {
    serialNumber: {
      type: String,
      required: true,
      trim: true,
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
    status: {
      type: String,
      required: true,
      enum: ['available', 'reserved', 'shipped', 'returned', 'damaged', 'scrapped'],
      default: 'available',
    },
    receivedAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    inboundOrderId: {
      type: String,
    },
    shipmentId: {
      type: String,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'serial_numbers',
  },
);

// 同一商品のシリアル番号はユニーク
serialNumberSchema.index({ productId: 1, serialNumber: 1 }, { unique: true });
serialNumberSchema.index({ serialNumber: 1 });
serialNumberSchema.index({ productId: 1, status: 1 });
serialNumberSchema.index({ clientId: 1 });
serialNumberSchema.index({ warehouseId: 1, locationId: 1 });
serialNumberSchema.index({ lotId: 1 });
serialNumberSchema.index({ status: 1 });
serialNumberSchema.index({ shipmentId: 1 });

export const SerialNumber = mongoose.model<ISerialNumber>('SerialNumber', serialNumberSchema);
