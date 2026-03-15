import mongoose from 'mongoose';

// 顧客タイプ / 客户类型
export type ClientType = 'logistics_company' | 'domestic_company' | 'individual_seller';
// 信用等级 / 与信ランク
export type CreditTier = 'vip' | 'standard' | 'new' | 'custom';

export interface IClient {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 顧客コード（一意） / 客户编号（唯一） */
  clientCode: string;
  /** 顧客名 / 客户名称 */
  name: string;
  /** 顧客名2 / 别名 */
  name2?: string;
  /** 顧客タイプ / 客户类型 */
  clientType?: ClientType;
  /** 担当者名 / 负责人 */
  contactName?: string;
  /** 郵便番号 / 邮编 */
  postalCode?: string;
  /** 都道府県 / 都道府县 */
  prefecture?: string;
  /** 市区町村 / 市区町村 */
  city?: string;
  /** 住所 / 地址 */
  address?: string;
  /** 住所2 / 地址2 */
  address2?: string;
  /** 電話番号 / 电话 */
  phone?: string;
  /** メールアドレス / 邮箱 */
  email?: string;
  /** SaaS契約プラン / SaaS 合同计划 */
  plan?: 'free' | 'standard' | 'pro' | 'enterprise';
  /** 課金有効 / 计费启用 */
  billingEnabled?: boolean;

  // --- 信用额度 / 与信枠 ---
  /** 与信ランク / 信用等级 */
  creditTier?: CreditTier;
  /** 与信枠（円）/ 信用额度上限 */
  creditLimit?: number;
  /** 未精算残高（円）/ 当前未结余额 */
  currentBalance?: number;
  /** 支払条件（日数）/ 结算周期（天） */
  paymentTermDays?: number;

  // --- 门户设定 / ポータル設定 ---
  /** ポータル有効 / 门户启用 */
  portalEnabled?: boolean;
  /** ポータル言語 / 门户语言 */
  portalLanguage?: 'zh' | 'ja' | 'en';

  /** 備考 / 备注 */
  memo?: string;
  /** 有効フラグ / 有效标记 */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new mongoose.Schema<IClient>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    clientCode: {
      type: String,
      required: true,
      trim: true,
      // unique 由复合索引 {tenantId, clientCode} 保证
      // ユニークは複合インデックスで保証
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
    clientType: {
      type: String,
      enum: ['logistics_company', 'domestic_company', 'individual_seller'],
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

    // 信用额度 / 与信枠
    creditTier: {
      type: String,
      enum: ['vip', 'standard', 'new', 'custom'],
      default: 'new',
    },
    creditLimit: {
      type: Number,
      default: 100000,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    paymentTermDays: {
      type: Number,
      default: 30,
      min: 0,
    },

    // 门户设定 / ポータル設定
    portalEnabled: {
      type: Boolean,
      default: false,
    },
    portalLanguage: {
      type: String,
      enum: ['zh', 'ja', 'en'],
      default: 'ja',
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

// tenantId + clientCode 唯一（同一租户下客户编号不重复）
// tenantId + clientCode ユニーク（同一テナント内で顧客コード重複不可）
clientSchema.index({ tenantId: 1, clientCode: 1 }, { unique: true });
clientSchema.index({ tenantId: 1, isActive: 1 });
clientSchema.index({ name: 'text', clientCode: 'text' });
clientSchema.index({ tenantId: 1, clientType: 1 });
clientSchema.index({ tenantId: 1, creditTier: 1 });

export const Client = mongoose.model<IClient>('Client', clientSchema);
