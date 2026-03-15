import mongoose from 'mongoose';

// 店铺平台 / 店舗プラットフォーム
export type ShopPlatform =
  | 'amazon_jp'
  | 'rakuten'
  | 'yahoo_shopping'
  | 'shopify'
  | 'b2b'
  | 'other';

export interface IShop {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 所属顧客ID / 所属顶层客户ID */
  clientId: mongoose.Types.ObjectId;
  /** 所属子顧客ID（任意）/ 所属子客户ID（可选，独立卖家直接挂 Client） */
  subClientId?: mongoose.Types.ObjectId;
  /** 店舗コード / 店铺编号 */
  shopCode: string;
  /** 店舗名 / 店铺名称 */
  shopName: string;
  /** プラットフォーム / 平台 */
  platform: ShopPlatform;
  /** プラットフォームアカウントID / 平台账户ID（如 Amazon Seller ID） */
  platformAccountId?: string;
  /** プラットフォーム店舗名 / 平台上的店铺名 */
  platformStoreName?: string;
  /** 備考 / 备注 */
  memo?: string;
  /** 有効フラグ / 有效标记 */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new mongoose.Schema<IShop>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    subClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubClient',
    },
    shopCode: {
      type: String,
      required: true,
      trim: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['amazon_jp', 'rakuten', 'yahoo_shopping', 'shopify', 'b2b', 'other'],
    },
    platformAccountId: {
      type: String,
      trim: true,
    },
    platformStoreName: {
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
    collection: 'shops',
  },
);

// tenantId + shopCode 唯一 / テナント内で店舗コード重複不可
shopSchema.index({ tenantId: 1, shopCode: 1 }, { unique: true });
// 按顶层客户查询 / トップ顧客での検索用
shopSchema.index({ tenantId: 1, clientId: 1 });
// 按子客户查询 / 子顧客での検索用
shopSchema.index({ tenantId: 1, subClientId: 1 });
shopSchema.index({ tenantId: 1, platform: 1 });

export const Shop = mongoose.model<IShop>('Shop', shopSchema);
