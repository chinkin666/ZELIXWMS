import mongoose from 'mongoose';

export type WmsTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface IWmsTask {
  _id: mongoose.Types.ObjectId;
  taskNumber: string;
  scheduleId?: mongoose.Types.ObjectId;
  scheduleName?: string;
  action: string;
  status: WmsTaskStatus;
  processedCount: number;
  successCount: number;
  errorCount: number;
  message?: string;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  triggeredBy: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
}

const wmsTaskSchema = new mongoose.Schema<IWmsTask>(
  {
    taskNumber: {
      type: String,
      unique: true,
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WmsSchedule',
    },
    scheduleName: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
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
    errors: {
      type: [String],
      default: [],
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
    triggeredBy: {
      type: String,
      default: 'manual',
    },
    userName: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    collection: 'wms_tasks',
  },
);

wmsTaskSchema.index({ createdAt: -1 });
wmsTaskSchema.index({ status: 1 });
wmsTaskSchema.index({ scheduleId: 1 });

export const WmsTask = mongoose.model<IWmsTask>('WmsTask', wmsTaskSchema);
