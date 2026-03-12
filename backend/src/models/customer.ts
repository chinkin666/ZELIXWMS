import mongoose from 'mongoose';

export interface ICustomer {
  _id: mongoose.Types.ObjectId;
  /** 得意先コード（一意） */
  customerCode: string;
  /** 得意先名 */
  name: string;
  /** 得意先名2 */
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
  /** メールアドレス */
  email?: string;
  /** 備考 */
  memo?: string;
  /** 有効フラグ */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new mongoose.Schema<ICustomer>(
  {
    customerCode: {
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
    email: {
      type: String,
      trim: true,
    },
    memo: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'customers',
  },
);

customerSchema.index({ isActive: 1 });
customerSchema.index({ name: 'text', customerCode: 'text' });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
