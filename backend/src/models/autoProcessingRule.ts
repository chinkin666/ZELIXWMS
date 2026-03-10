import mongoose from 'mongoose';

// ============================================
// Types
// ============================================

export type TriggerEvent =
  | 'order.created'
  | 'order.confirmed'
  | 'order.carrierReceived'
  | 'order.printed'
  | 'order.inspected'
  | 'order.shipped'
  | 'order.ecExported';

export const TRIGGER_EVENTS: TriggerEvent[] = [
  'order.created',
  'order.confirmed',
  'order.carrierReceived',
  'order.printed',
  'order.inspected',
  'order.shipped',
  'order.ecExported',
];

export type ConditionType = 'orderField' | 'orderStatus' | 'orderGroup' | 'carrierRawRow' | 'sourceRawRow';

export type RawRowOperator = 'is' | 'isNot' | 'contains' | 'notContains' | 'isEmpty' | 'hasAnyValue';

export type OrderFieldOperator =
  | 'is' | 'isNot'
  | 'contains' | 'notContains'
  | 'hasAnyValue' | 'isEmpty'
  | 'equals' | 'notEquals'
  | 'lessThan' | 'lessThanOrEqual'
  | 'greaterThan' | 'greaterThanOrEqual'
  | 'between'
  | 'before' | 'after';

export type ActionType = 'addProduct' | 'setOrderGroup';

export interface IAutoProcessingCondition {
  type: ConditionType;

  // orderField
  fieldKey?: string;
  operator?: OrderFieldOperator;
  value?: unknown;
  orderGroupIds?: string[]; // when fieldKey === 'orderGroupId'

  // carrierRawRow
  carrierColumnName?: string;
  carrierOperator?: RawRowOperator;
  carrierValue?: unknown;

  // sourceRawRow
  sourceColumnName?: string;
  sourceOperator?: RawRowOperator;
  sourceValue?: unknown;
}

export interface IAutoProcessingAction {
  type: ActionType;

  // addProduct
  productSku?: string;
  quantity?: number;

  // setOrderGroup
  orderGroupId?: string;
}

export interface IAutoProcessingRule {
  _id: mongoose.Types.ObjectId;
  name: string;
  enabled: boolean;
  triggerMode: 'auto' | 'manual';
  allowRerun: boolean;
  memo?: string;
  triggerEvents: TriggerEvent[];
  conditions: IAutoProcessingCondition[];
  actions: IAutoProcessingAction[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Mongoose Schema
// ============================================

const conditionSchema = new mongoose.Schema<IAutoProcessingCondition>(
  {
    type: { type: String, required: true, enum: ['orderField', 'orderStatus', 'orderGroup', 'carrierRawRow', 'sourceRawRow'] },

    // orderField
    fieldKey: { type: String },
    operator: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    orderGroupIds: [{ type: String }],

    // carrierRawRow
    carrierColumnName: { type: String },
    carrierOperator: { type: String },
    carrierValue: { type: mongoose.Schema.Types.Mixed },

    // sourceRawRow
    sourceColumnName: { type: String },
    sourceOperator: { type: String },
    sourceValue: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const actionSchema = new mongoose.Schema<IAutoProcessingAction>(
  {
    type: { type: String, required: true, enum: ['addProduct', 'setOrderGroup'] },
    productSku: { type: String },
    quantity: { type: Number },
    orderGroupId: { type: String },
  },
  { _id: false },
);

const autoProcessingRuleSchema = new mongoose.Schema<IAutoProcessingRule>(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    triggerMode: { type: String, required: true, enum: ['auto', 'manual'], default: 'auto' },
    allowRerun: { type: Boolean, default: false },
    memo: { type: String, trim: true },
    triggerEvents: [{ type: String, enum: TRIGGER_EVENTS }],
    conditions: [conditionSchema],
    actions: [actionSchema],
    priority: { type: Number, required: true, default: 100 },
  },
  {
    timestamps: true,
    collection: 'auto_processing_rules',
  },
);

autoProcessingRuleSchema.index({ enabled: 1, triggerMode: 1 });
autoProcessingRuleSchema.index({ priority: 1 });

export const AutoProcessingRule = mongoose.model<IAutoProcessingRule>(
  'AutoProcessingRule',
  autoProcessingRuleSchema,
);
