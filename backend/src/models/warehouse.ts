import mongoose from 'mongoose';

/** 倉庫マスタ — 3PL複数倉庫管理用の上位エンティティ */
export interface IWarehouse {
  _id: mongoose.Types.ObjectId;
  /** 倉庫コード */
  code: string;
  /** 倉庫名 */
  name: string;
  /** 倉庫名2（英語名等） */
  name2?: string;
  /** 郵便番号 */
  postalCode?: string;
  /** 都道府県 */
  prefecture?: string;
  /** 市区町村 */
  city?: string;
  /** 住所 */
  address?: string;
  /** 住所2 */
  address2?: string;
  /** 電話番号 */
  phone?: string;
  /** 対応温度帯（'0'=常温, '1'=冷蔵, '2'=冷凍） */
  coolTypes?: string[];
  /** 保管キャパシティ（パレット数等） */
  capacity?: number;
  /** 営業時間 */
  operatingHours?: string;
  /** 有効フラグ */
  isActive: boolean;
  /** 表示順 */
  sortOrder: number;
  /** 備考 */
  memo?: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

const warehouseSchema = new mongoose.Schema<IWarehouse>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    name2: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    prefecture: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    address2: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    coolTypes: {
      type: [String],
      enum: ['0', '1', '2'],
    },
    capacity: {
      type: Number,
    },
    operatingHours: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'warehouses',
  },
);

warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ sortOrder: 1 });
warehouseSchema.index({ name: 'text', code: 'text' });

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
