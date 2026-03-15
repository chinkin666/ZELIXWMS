import mongoose from 'mongoose';

/**
 * ラベル貼付タスク / 贴标任务
 */

export type LabelType = 'fnsku' | 'product_barcode' | 'warning_label' | 'box_label' | 'shipping_label' | 'compliance_label';
export type LabelingStatus = 'pending' | 'printing' | 'labeling' | 'verifying' | 'completed' | 'cancelled';

export interface ILabelingTask {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  taskNumber: string;

  // 関連 / 关联
  inboundOrderId?: mongoose.Types.ObjectId;
  fbaShipmentPlanId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  sku?: string;
  fnsku?: string;

  // ラベル / 标签
  labelTypes: LabelType[];
  requiredQuantity: number;
  completedQuantity: number;
  printBatch?: string;

  // ステータス / 状态
  status: LabelingStatus;

  // 担当者 / 人员
  labeledBy?: string;
  verifiedBy?: string;
  verifiedAt?: Date;

  // 品質 / 质量
  verificationResult?: 'pass' | 'fail' | 'partial';
  failedQuantity: number;
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const labelingTaskSchema = new mongoose.Schema<ILabelingTask>(
  {
    tenantId: { type: String, required: true },
    taskNumber: { type: String, required: true, unique: true, trim: true },

    inboundOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'InboundOrder' },
    fbaShipmentPlanId: { type: mongoose.Schema.Types.ObjectId },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, trim: true },
    fnsku: { type: String, trim: true },

    labelTypes: [{
      type: String,
      enum: ['fnsku', 'product_barcode', 'warning_label', 'box_label', 'shipping_label', 'compliance_label'],
    }],
    requiredQuantity: { type: Number, required: true, min: 0 },
    completedQuantity: { type: Number, default: 0, min: 0 },
    printBatch: { type: String, trim: true },

    status: {
      type: String,
      required: true,
      enum: ['pending', 'printing', 'labeling', 'verifying', 'completed', 'cancelled'],
      default: 'pending',
    },

    labeledBy: { type: String, trim: true },
    verifiedBy: { type: String, trim: true },
    verifiedAt: { type: Date },

    verificationResult: { type: String, enum: ['pass', 'fail', 'partial'] },
    failedQuantity: { type: Number, default: 0, min: 0 },
    failureReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'labeling_tasks',
  },
);

labelingTaskSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
labelingTaskSchema.index({ tenantId: 1, inboundOrderId: 1 });

export const LabelingTask = mongoose.model<ILabelingTask>('LabelingTask', labelingTaskSchema);
