import mongoose from 'mongoose';

// ============================================
// Types
// ============================================

/** 対象モジュール */
export type RuleModule = 'putaway' | 'picking' | 'wave' | 'replenishment' | 'carrier_selection' | 'order_routing' | 'packing' | 'custom';

/** 条件演算子 */
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'between';

/** アクション種別 */
export type ActionType = 'assign_zone' | 'assign_location' | 'set_priority' | 'set_carrier' | 'set_wave_group' | 'set_pick_method' | 'trigger_replenishment' | 'notify' | 'custom';

/** 論理演算子 */
export type LogicOperator = 'AND' | 'OR';

// ============================================
// Sub-document Interfaces
// ============================================

/** ルール条件 */
export interface IRuleCondition {
  /** 対象フィールド（例: 'product.weight', 'order.carrier', 'inventory.quantity'） */
  field: string;
  /** 比較演算子 */
  operator: ConditionOperator;
  /** 比較値（文字列・数値・配列など） */
  value: unknown;
}

/** ルール条件グループ */
export interface IRuleConditionGroup {
  /** 論理演算子（AND / OR） */
  logic: LogicOperator;
  /** 条件リスト */
  conditions: IRuleCondition[];
}

/** ルールアクション */
export interface IRuleAction {
  /** アクション種別 */
  type: ActionType;
  /** アクション固有パラメータ */
  params: Record<string, unknown>;
}

// ============================================
// Main Interface
// ============================================

/** ルール定義インターフェース */
export interface IRuleDefinition {
  _id: mongoose.Types.ObjectId;
  /** ルール名 */
  name: string;
  /** ルール説明 */
  description?: string;
  /** 対象モジュール */
  module: RuleModule;
  /** 対象倉庫（未指定=全倉庫） */
  warehouseId?: mongoose.Types.ObjectId;
  /** 対象顧客（未指定=全顧客） */
  clientId?: mongoose.Types.ObjectId;
  /** 優先度（小さい値が先に評価） */
  priority: number;
  /** 条件グループ（AND/OR組合せ） */
  conditionGroups: IRuleConditionGroup[];
  /** 実行アクション */
  actions: IRuleAction[];
  /** マッチ時に後続ルール評価を停止 */
  stopOnMatch: boolean;
  /** 有効フラグ */
  isActive: boolean;
  /** 有効開始日 */
  validFrom?: Date;
  /** 有効終了日 */
  validTo?: Date;
  /** 実行回数 */
  executionCount: number;
  /** 最終実行日時 */
  lastExecutedAt?: Date;
  /** 備考 */
  memo?: string;
  /** 作成者 */
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Mongoose Schema
// ============================================

const ruleConditionSchema = new mongoose.Schema<IRuleCondition>(
  {
    field: { type: String, required: true, trim: true },
    operator: {
      type: String,
      required: true,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'starts_with', 'between'],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const ruleConditionGroupSchema = new mongoose.Schema<IRuleConditionGroup>(
  {
    logic: {
      type: String,
      required: true,
      enum: ['AND', 'OR'],
    },
    conditions: [ruleConditionSchema],
  },
  { _id: false },
);

const ruleActionSchema = new mongoose.Schema<IRuleAction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['assign_zone', 'assign_location', 'set_priority', 'set_carrier', 'set_wave_group', 'set_pick_method', 'trigger_replenishment', 'notify', 'custom'],
    },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const ruleDefinitionSchema = new mongoose.Schema<IRuleDefinition>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    module: {
      type: String,
      required: true,
      enum: ['putaway', 'picking', 'wave', 'replenishment', 'carrier_selection', 'order_routing', 'packing', 'custom'],
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    priority: { type: Number, required: true, default: 0 },
    conditionGroups: { type: [ruleConditionGroupSchema], required: true, default: [] },
    actions: { type: [ruleActionSchema], required: true, default: [] },
    stopOnMatch: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: { type: Date },
    memo: { type: String, trim: true },
    createdBy: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'rule_definitions',
  },
);

ruleDefinitionSchema.index({ module: 1, isActive: 1, priority: 1 });
ruleDefinitionSchema.index({ warehouseId: 1, module: 1 });
ruleDefinitionSchema.index({ clientId: 1 });
ruleDefinitionSchema.index({ isActive: 1 });
ruleDefinitionSchema.index({ priority: 1 });
ruleDefinitionSchema.index({ createdAt: -1 });

export const RuleDefinition = mongoose.model<IRuleDefinition>(
  'RuleDefinition',
  ruleDefinitionSchema,
);
