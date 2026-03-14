/**
 * 自定义字段定义模型 / カスタムフィールド定義モデル
 *
 * 管理员可为指定实体类型（订单/商品/入库单/退货单）定义自定义字段。
 * 管理者が指定エンティティ（注文/商品/入庫/返品）にカスタムフィールドを定義可能。
 */

import mongoose from 'mongoose';

export type CustomFieldEntityType = 'order' | 'product' | 'inboundOrder' | 'returnOrder';
export type CustomFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select';

export interface ICustomFieldDefinition {
  _id: mongoose.Types.ObjectId;
  tenantId?: string;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  labelJa?: string;
  fieldType: CustomFieldType;
  required: boolean;
  defaultValue?: unknown;
  /** select 类型的可选项 / select タイプの選択肢 */
  options?: string[];
  /** 显示顺序 / 表示順序 */
  sortOrder: number;
  /** 是否启用 / 有効かどうか */
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldDefinitionSchema = new mongoose.Schema<ICustomFieldDefinition>(
  {
    tenantId: { type: String, trim: true },
    entityType: {
      type: String,
      required: true,
      enum: ['order', 'product', 'inboundOrder', 'returnOrder'],
    },
    fieldKey: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    },
    label: { type: String, required: true, trim: true },
    labelJa: { type: String, trim: true },
    fieldType: {
      type: String,
      required: true,
      enum: ['text', 'number', 'boolean', 'date', 'select'],
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    options: { type: [String], default: undefined },
    sortOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'custom_field_definitions',
  },
);

// 同一租户 + 实体类型 + 字段 key 唯一 / 同一テナント + エンティティ + フィールドキーはユニーク
customFieldDefinitionSchema.index(
  { tenantId: 1, entityType: 1, fieldKey: 1 },
  { unique: true },
);

export const CustomFieldDefinition = mongoose.model<ICustomFieldDefinition>(
  'CustomFieldDefinition',
  customFieldDefinitionSchema,
);
