import mongoose from 'mongoose';
import crypto from 'crypto';

// ユーザーロール / 用户角色
export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer' | 'client';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** メールアドレス / 邮箱 */
  email: string;
  /** パスワードハッシュ / 密码哈希 */
  passwordHash: string;
  /** 表示名 / 显示名 */
  displayName: string;
  /** ロール / 角色 */
  role: UserRole;
  /** 倉庫制限（空=全倉庫アクセス） / 仓库限制（空=全仓库访问） */
  warehouseIds?: mongoose.Types.ObjectId[];
  /** 荷主制限（role=client時） / 荷主限制（role=client时） */
  clientId?: mongoose.Types.ObjectId;
  /** 荷主名 / 荷主名 */
  clientName?: string;
  /** 親ユーザーID / 父用户ID */
  parentUserId?: mongoose.Types.ObjectId;
  /** 電話番号 / 电话 */
  phone?: string;
  /** アバター / 头像 */
  avatar?: string;
  /** 言語 / 语言 */
  language?: 'ja' | 'zh' | 'en';
  /** 有効フラグ / 有效标志 */
  isActive: boolean;
  /** 最終ログイン日時 / 最后登录时间 */
  lastLoginAt?: Date;
  /** ログイン回数 / 登录次数 */
  loginCount: number;
  /** 備考 / 备注 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// パスワードハッシュ定数 / 密码哈希常量
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const SALT_BYTES = 16;

const userSchema = new mongoose.Schema<IUser>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
      default: 'default',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'manager', 'operator', 'viewer', 'client'],
      default: 'operator',
    },
    warehouseIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }],
      default: undefined,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    clientName: {
      type: String,
      trim: true,
    },
    parentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      enum: ['ja', 'zh', 'en'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    loginCount: {
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
    collection: 'users',
  },
);

// インデックス / 索引
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ parentUserId: 1 });
userSchema.index({ clientId: 1 });
userSchema.index({ isActive: 1 });

/**
 * パスワードをハッシュ化する / 密码哈希化
 * 形式: salt:hash (saltは16バイトhex, hashはpbkdf2 sha512 64バイト)
 */
userSchema.statics.hashPassword = function (plain: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(plain, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return `${salt}:${hash}`;
};

/**
 * パスワードを検証する / 验证密码
 */
userSchema.statics.verifyPassword = function (plain: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const hash = crypto
    .pbkdf2Sync(plain, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
};

// スタティックメソッドの型定義 / 静态方法类型定义
interface UserModel extends mongoose.Model<IUser> {
  hashPassword(plain: string): string;
  verifyPassword(plain: string, stored: string): boolean;
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
