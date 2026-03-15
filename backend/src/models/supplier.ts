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
  // 都道府県
  prefecture?: string;
  // 市区町村
  city?: string;
  // 番地
  street?: string;
  // 建物名
  building?: string;
  // メールアドレス
  email?: string;
  // 担当者名
  contactPerson?: string;
  // リードタイム（日数）
  leadTime?: number;
  // 最小発注数量（MOQ）
  minimumOrder?: number;
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
    // 都道府県
    prefecture: { type: String, trim: true },
    // 市区町村
    city: { type: String, trim: true },
    // 番地
    street: { type: String, trim: true },
    // 建物名
    building: { type: String, trim: true },
    // メールアドレス
    email: { type: String, trim: true },
    // 担当者名
    contactPerson: { type: String, trim: true },
    // リードタイム（日数）
    leadTime: { type: Number },
    // 最小発注数量（MOQ）
    minimumOrder: { type: Number },
  },
  {
    timestamps: true,
    collection: 'suppliers',
  },
);

supplierSchema.index({ isActive: 1 });
supplierSchema.index({ name: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
