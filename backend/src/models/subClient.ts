import mongoose from 'mongoose';

// 子客户タイプ / 子客户类型
export type SubClientType = 'end_customer' | 'branch_office';

export interface ISubClient {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** 所属顧客ID / 所属顶层客户ID */
  clientId: mongoose.Types.ObjectId;
  /** 子顧客コード / 子客户编号 */
  subClientCode: string;
  /** 名称 / 名称 */
  name: string;
  /** 名称2 / 别名 */
  name2?: string;
  /** タイプ / 类型（物流公司的客户 / 总公司的分公司） */
  subClientType?: SubClientType;
  /** 担当者名 / 负责人 */
  contactPerson?: string;
  /** 電話番号 / 电话 */
  phone?: string;
  /** メールアドレス / 邮箱 */
  email?: string;
  /** ポータル有効 / 门户启用（子客户可独立登录查看自己的数据） */
  portalEnabled?: boolean;
  /** ポータルユーザーID / 门户用户ID */
  portalUserId?: mongoose.Types.ObjectId;
  /** 備考 / 备注 */
  memo?: string;
  /** 有効フラグ / 有效标记 */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subClientSchema = new mongoose.Schema<ISubClient>(
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
    subClientCode: {
      type: String,
      required: true,
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
    subClientType: {
      type: String,
      enum: ['end_customer', 'branch_office'],
    },
    contactPerson: {
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
    portalEnabled: {
      type: Boolean,
      default: false,
    },
    portalUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    collection: 'sub_clients',
  },
);

// tenantId + subClientCode 唯一 / テナント内で子顧客コード重複不可
subClientSchema.index({ tenantId: 1, subClientCode: 1 }, { unique: true });
// 按顶层客户查询 / トップ顧客での検索用
subClientSchema.index({ tenantId: 1, clientId: 1 });
subClientSchema.index({ tenantId: 1, isActive: 1 });

export const SubClient = mongoose.model<ISubClient>('SubClient', subClientSchema);
