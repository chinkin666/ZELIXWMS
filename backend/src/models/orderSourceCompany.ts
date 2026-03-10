import mongoose from 'mongoose';

/**
 * 依頼主（注文元）マスタ
 * - フロントの `/settings/orderSourceCompany` で CRUD する
 * - postalCode / phone は数字のみ
 */

export interface IOrderSourceCompany {
  _id: mongoose.Types.ObjectId;
  senderName: string;
  senderPostalCode?: string; // 数字7桁（可选）
  senderAddressPrefecture?: string; // 都道府県（可选）
  senderAddressCity?: string; // 郡市区（可选）
  senderAddressStreet?: string; // それ以降の住所（可选）
  senderPhone?: string; // 数字のみ（可选）
  /** 発店コード1（3桁数字、可选） */
  hatsuBaseNo1?: string;
  /** 発店コード2（3桁数字、可选） */
  hatsuBaseNo2?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSourceCompanySchema = new mongoose.Schema<IOrderSourceCompany>(
  {
    // _id 由 MongoDB 自动生成，不需要手动定义
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderPostalCode: {
      type: String,
      required: false,
      trim: true,
      // 只有当值存在且不为空时才进行格式验证
      validate: {
        validator: function(value: string | undefined | null) {
          // 如果值为空、未定义或 null，跳过验证
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return true;
          }
          // 否则验证格式
          return /^\d{7}$/.test(value);
        },
        message: '郵便番号は7桁の数字で入力してください',
      },
      default: undefined,
      // 使用 setter 将空字符串转换为 undefined
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    senderAddressPrefecture: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    senderAddressCity: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    senderAddressStreet: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    senderPhone: {
      type: String,
      required: false,
      trim: true,
      // 只有当值存在且不为空时才进行格式验证
      validate: {
        validator: function(value: string | undefined | null) {
          // 如果值为空、未定义或 null，跳过验证
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return true;
          }
          // 否则验证格式
          return /^\d+$/.test(value);
        },
        message: '電話番号は数字のみで入力してください',
      },
      default: undefined,
      // 使用 setter 将空字符串转换为 undefined
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    hatsuBaseNo1: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(value: string | undefined | null) {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return true;
          }
          return /^\d{3}$/.test(value);
        },
        message: '発店コード1は3桁の数字で入力してください',
      },
      default: undefined,
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
    hatsuBaseNo2: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(value: string | undefined | null) {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return true;
          }
          return /^\d{3}$/.test(value);
        },
        message: '発店コード2は3桁の数字で入力してください',
      },
      default: undefined,
      set: function(value: string | undefined | null) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return undefined;
        }
        return value;
      },
    },
  },
  {
    timestamps: true,
    collection: 'order_source_companies',
  },
);

// 普通索引（非唯一，允许重复）
orderSourceCompanySchema.index({ senderName: 1 });
orderSourceCompanySchema.index({ senderPostalCode: 1 });

export const OrderSourceCompany = mongoose.model<IOrderSourceCompany>(
  'OrderSourceCompany',
  orderSourceCompanySchema,
);
