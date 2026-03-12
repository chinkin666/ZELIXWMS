import mongoose from 'mongoose';

export type WmsScheduleLogEvent =
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_enabled'
  | 'schedule_disabled'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'manual_run';

export interface IWmsScheduleLog {
  _id: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  taskNumber?: string;
  action: string;
  event: WmsScheduleLogEvent;
  message?: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
}

const wmsScheduleLogSchema = new mongoose.Schema<IWmsScheduleLog>(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WmsSchedule',
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WmsTask',
    },
    taskNumber: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    event: {
      type: String,
      required: true,
      enum: [
        'schedule_created',
        'schedule_updated',
        'schedule_enabled',
        'schedule_disabled',
        'task_started',
        'task_completed',
        'task_failed',
        'manual_run',
      ],
    },
    message: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    collection: 'wms_schedule_logs',
  },
);

wmsScheduleLogSchema.index({ createdAt: -1 });

export const WmsScheduleLog = mongoose.model<IWmsScheduleLog>('WmsScheduleLog', wmsScheduleLogSchema);
