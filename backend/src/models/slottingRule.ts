import mongoose from 'mongoose';

// ============================================
// Types
// ============================================

/** 庫位分配基準 */
export type SlottingCriterion = 'sales_velocity' | 'weight' | 'volume' | 'cool_type' | 'category' | 'client';

/** 庫位分配優先度 */
export type SlottingPriority = 'high' | 'medium' | 'low';

/** マッチング条件 */
export interface ISlottingCondition {
  /** 対象フィールド */
  field: string;
  /** 比較演算子 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
  /** 比較値 */
  value: unknown;
}

/** 庫位分配ルールインターフェース */
export interface ISlottingRule {
  _id: mongoose.Types.ObjectId;
  /** ルール名 */
  name: string;
  /** 対象倉庫ID */
  warehouseId: mongoose.Types.ObjectId;
  /** 分配基準 */
  criterion: SlottingCriterion;
  /** 優先度 */
  priority: SlottingPriority;
  /** 優先ゾーン（例: 'A'=出口近く） */
  zonePreference?: string;
  /** 優先ロケーションタイプ（例: 'bin'） */
  locationTypePreference?: string;
  /** 必要温度帯 */
  coolTypeRequired?: string;
  /** 最大重量（kg） */
  maxWeight?: number;
  /** 最大体積（㎥） */
  maxVolume?: number;
  /** マッチング条件 */
  conditions: ISlottingCondition[];
  /** 評価順序（小さい値が先） */
  sortOrder: number;
  /** 有効フラグ */
  isActive: boolean;
  /** 備考 */
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Mongoose Schema
// ============================================

const conditionSchema = new mongoose.Schema<ISlottingCondition>(
  {
    field: { type: String, required: true, trim: true },
    operator: {
      type: String,
      required: true,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in'],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const slottingRuleSchema = new mongoose.Schema<ISlottingRule>(
  {
    name: { type: String, required: true, trim: true },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    criterion: {
      type: String,
      required: true,
      enum: ['sales_velocity', 'weight', 'volume', 'cool_type', 'category', 'client'],
    },
    priority: {
      type: String,
      default: 'medium',
      enum: ['high', 'medium', 'low'],
    },
    zonePreference: { type: String, trim: true },
    locationTypePreference: { type: String, trim: true },
    coolTypeRequired: { type: String, enum: ['0', '1', '2'] },
    maxWeight: { type: Number },
    maxVolume: { type: Number },
    conditions: [conditionSchema],
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'slotting_rules',
  },
);

slottingRuleSchema.index({ warehouseId: 1, isActive: 1 });
slottingRuleSchema.index({ criterion: 1 });
slottingRuleSchema.index({ sortOrder: 1 });

export const SlottingRule = mongoose.model<ISlottingRule>(
  'SlottingRule',
  slottingRuleSchema,
);
