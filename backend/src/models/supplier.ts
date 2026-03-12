import mongoose from 'mongoose';

export interface ISupplier {
  _id: mongoose.Types.ObjectId;
  /** 仕入先コード（一意） */
  supplierCode: string;
  /** 仕入先名 */
  name: string;
  /** 仕入先名2 */
  name2?: string;
  /** 郵便番号 */
  postalCode?: string;
  /** 住所1 */
  address1?: string;
  /** 住所2 */
  address2?: string;
  /** 住所3 */
  address3?: string;
  /** 電話番号 */
  phone?: string;
  /** 有効フラグ */
  isActive: boolean;
  /** メモ */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new mongoose.Schema<ISupplier>(
  {
    supplierCode: {
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
    address1: {
      type: String,
      trim: true,
    },
    address2: {
      type: String,
      trim: true,
    },
    address3: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'suppliers',
  },
);

supplierSchema.index({ isActive: 1 });
supplierSchema.index({ name: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
