import mongoose from 'mongoose';

/**
 * 異常報告 / 异常报告
 *
 * 検品・受付・出荷等で発見された異常を管理し、SLA に基づいて顧客に通知する。
 * 管理检品、受付、出货等环节发现的异常，基于 SLA 通知客户。
 */

export type ExceptionLevel = 'A' | 'B' | 'C';
export type ExceptionCategory =
  | 'quantity_variance'
  | 'label_error'
  | 'appearance_defect'
  | 'packaging_issue'
  | 'mixed_shipment'
  | 'documentation_error'
  | 'other';
export type ExceptionStatus = 'open' | 'notified' | 'acknowledged' | 'resolved' | 'closed';

// SLA 応答時限（分）/ SLA 响应时限（分钟）
export const SLA_MINUTES: Record<ExceptionLevel, number> = {
  C: 30,   // 緊急 / 紧急
  B: 120,  // 重要 / 重要
  A: 240,  // 一般 / 一般
};

export interface IExceptionReport {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  reportNumber: string;

  // 関連 / 关联
  referenceType: 'inbound_order' | 'fba_plan' | 'return_order' | 'task' | 'other';
  referenceId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  clientName?: string;

  // 異常情報 / 异常信息
  level: ExceptionLevel;
  category: ExceptionCategory;
  boxNumber?: string;
  sku?: string;
  affectedQuantity?: number;
  description: string;
  photos: string[];
  suggestedAction?: string;

  // 処理フロー / 处理流程
  status: ExceptionStatus;
  reportedBy: string;
  reportedAt: Date;
  notifiedAt?: Date;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;

  // SLA
  slaDeadline: Date;
  slaBreached: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const exceptionReportSchema = new mongoose.Schema<IExceptionReport>(
  {
    tenantId: { type: String, required: true },
    reportNumber: { type: String, required: true, unique: true, trim: true },

    referenceType: {
      type: String,
      required: true,
      enum: ['inbound_order', 'fba_plan', 'return_order', 'task', 'other'],
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, trim: true },

    level: { type: String, required: true, enum: ['A', 'B', 'C'] },
    category: {
      type: String,
      required: true,
      enum: ['quantity_variance', 'label_error', 'appearance_defect', 'packaging_issue', 'mixed_shipment', 'documentation_error', 'other'],
    },
    boxNumber: { type: String, trim: true },
    sku: { type: String, trim: true },
    affectedQuantity: { type: Number },
    description: { type: String, required: true, trim: true },
    photos: [{ type: String }],
    suggestedAction: { type: String, trim: true },

    status: {
      type: String,
      required: true,
      enum: ['open', 'notified', 'acknowledged', 'resolved', 'closed'],
      default: 'open',
    },
    reportedBy: { type: String, required: true, trim: true },
    reportedAt: { type: Date, required: true, default: Date.now },
    notifiedAt: { type: Date },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolution: { type: String, trim: true },

    slaDeadline: { type: Date, required: true },
    slaBreached: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'exception_reports',
  },
);

exceptionReportSchema.index({ tenantId: 1, reportNumber: 1 }, { unique: true });
exceptionReportSchema.index({ tenantId: 1, status: 1, level: 1 });
exceptionReportSchema.index({ tenantId: 1, clientId: 1, createdAt: -1 });
exceptionReportSchema.index({ tenantId: 1, slaDeadline: 1, status: 1 });

export const ExceptionReport = mongoose.model<IExceptionReport>('ExceptionReport', exceptionReportSchema);
