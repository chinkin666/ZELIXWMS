import mongoose from 'mongoose';

export type ApiLogStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout';

export interface IApiLog {
  _id: mongoose.Types.ObjectId;
  // テナントID / 租户ID
  tenantId?: string;
  apiName: string;
  action: string;
  status: ApiLogStatus;
  requestUrl?: string;
  requestMethod?: string;
  statusCode?: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  message?: string;
  errorDetail?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const apiLogSchema = new mongoose.Schema<IApiLog>(
  {
    // テナントID / 租户ID
    tenantId: { type: String, trim: true, index: true },
    apiName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'error', 'timeout'],
      default: 'pending',
    },
    requestUrl: {
      type: String,
      trim: true,
    },
    requestMethod: {
      type: String,
      trim: true,
    },
    statusCode: {
      type: Number,
    },
    processedCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      trim: true,
    },
    errorDetail: {
      type: String,
      trim: true,
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'api_logs',
  },
);

apiLogSchema.index({ createdAt: -1 });
apiLogSchema.index({ apiName: 1 });
apiLogSchema.index({ status: 1 });
apiLogSchema.index({ referenceNumber: 1 });

// テナント別APIログ検索用複合インデックス / 租户级API日志查询复合索引
apiLogSchema.index({ tenantId: 1, createdAt: -1 });
// 180日TTL（自動削除） / 180天TTL（自动删除）
apiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const ApiLog = mongoose.model<IApiLog>('ApiLog', apiLogSchema);
