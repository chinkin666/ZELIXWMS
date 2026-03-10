import mongoose from 'mongoose';
import type { TriggerEvent, IAutoProcessingAction } from './autoProcessingRule';

// ============================================
// Types
// ============================================

export interface IAutoProcessingLog {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orderSystemId: string;
  ruleId: mongoose.Types.ObjectId;
  ruleName: string;
  event: TriggerEvent;
  actionsExecuted: IAutoProcessingAction[];
  success: boolean;
  error?: string;
  executedAt: Date;
}

// ============================================
// Mongoose Schema
// ============================================

const actionSnapshotSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    productSku: { type: String },
    quantity: { type: Number },
    orderGroupId: { type: String },
  },
  { _id: false },
);

const autoProcessingLogSchema = new mongoose.Schema<IAutoProcessingLog>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ShipmentOrder' },
    orderSystemId: { type: String, required: true },
    ruleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'AutoProcessingRule' },
    ruleName: { type: String, required: true },
    event: { type: String, required: true },
    actionsExecuted: [actionSnapshotSchema],
    success: { type: Boolean, required: true, default: true },
    error: { type: String },
    executedAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: 'auto_processing_logs',
  },
);

// Fast rerun check: has this rule already been executed for this order?
autoProcessingLogSchema.index({ orderId: 1, ruleId: 1 });
// View execution history by order
autoProcessingLogSchema.index({ orderId: 1, executedAt: -1 });
// View execution history by rule
autoProcessingLogSchema.index({ ruleId: 1 });

export const AutoProcessingLog = mongoose.model<IAutoProcessingLog>(
  'AutoProcessingLog',
  autoProcessingLogSchema,
);
