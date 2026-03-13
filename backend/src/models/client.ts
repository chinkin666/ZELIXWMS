import mongoose from 'mongoose';

export interface IClient {
  _id: mongoose.Types.ObjectId;
  /** 顧客コード（一意） */
  clientCode: string;
  /** 顧客名 */
  name: string;
  /** 顧客名2 */
  name2?: string;
  /** 担当者名 */
  contactName?: string;
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
  /** SaaS契約プラン */
  plan?: 'free' | 'standard' | 'pro' | 'enterprise';
  /** 課金有効 */
  billingEnabled?: boolean;
  /** 備考 */
  memo?: string;
  /** 有効フラグ */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new mongoose.Schema<IClient>(
  {
    clientCode: {
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
    contactName: {
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
    plan: {
      type: String,
      trim: true,
      enum: ['free', 'standard', 'pro', 'enterprise'],
    },
    billingEnabled: {
      type: Boolean,
      default: false,
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
    collection: 'clients',
  },
);

clientSchema.index({ isActive: 1 });
clientSchema.index({ name: 'text', clientCode: 'text' });
clientSchema.index({ plan: 1 });

export const Client = mongoose.model<IClient>('Client', clientSchema);
