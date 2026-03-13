import mongoose from 'mongoose';

export type TenantPlan = 'free' | 'starter' | 'standard' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface ITenant {
  _id: mongoose.Types.ObjectId;
  /** テナントコード（一意） */
  tenantCode: string;
  /** テナント名（会社名） */
  name: string;
  /** テナント名2（英語名等） */
  name2?: string;
  /** 契約プラン */
  plan: TenantPlan;
  /** テナントステータス */
  status: TenantStatus;
  /** 担当者名 */
  contactName?: string;
  /** 連絡先メールアドレス */
  contactEmail?: string;
  /** 連絡先電話番号 */
  contactPhone?: string;
  /** 郵便番号 */
  postalCode?: string;
  /** 都道府県 */
  prefecture?: string;
  /** 市区町村 */
  city?: string;
  /** 住所 */
  address?: string;
  /** 最大ユーザー数 */
  maxUsers: number;
  /** 最大倉庫数 */
  maxWarehouses: number;
  /** 最大顧客数 */
  maxClients: number;
  /** トライアル期限 */
  trialExpiresAt?: Date;
  /** 課金開始日 */
  billingStartedAt?: Date;
  /** 有効機能リスト */
  features: string[];
  /** テナント固有設定（JSON） */
  settings: Record<string, unknown>;
  /** 有効フラグ */
  isActive: boolean;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new mongoose.Schema<ITenant>(
  {
    tenantCode: {
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
    plan: {
      type: String,
      required: true,
      enum: ['free', 'starter', 'standard', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'suspended', 'trial', 'cancelled'],
      default: 'trial',
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    contactPhone: {
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
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxWarehouses: {
      type: Number,
      default: 1,
    },
    maxClients: {
      type: Number,
      default: 10,
    },
    trialExpiresAt: {
      type: Date,
    },
    billingStartedAt: {
      type: Date,
    },
    features: {
      type: [String],
      default: [],
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    collection: 'tenants',
  },
);

tenantSchema.index({ status: 1, isActive: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ name: 'text', tenantCode: 'text' });
tenantSchema.index({ createdAt: -1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
