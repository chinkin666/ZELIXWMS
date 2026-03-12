import mongoose from 'mongoose';

export type WmsScheduleAction =
  | 'auto_allocate'
  | 'auto_batch'
  | 'auto_print'
  | 'auto_label'
  | 'inventory_sync'
  | 'report_generate'
  | 'cleanup';

export type WmsScheduleType = 'manual' | 'scheduled';

export interface IWmsSchedule {
  _id: mongoose.Types.ObjectId;
  name: string;
  action: WmsScheduleAction;
  description?: string;
  isEnabled: boolean;
  scheduleType: WmsScheduleType;
  cronExpression?: string;
  cronHour?: number;
  cronMinute?: number;
  cronDaysOfWeek: number[];
  skipHolidays: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const wmsScheduleSchema = new mongoose.Schema<IWmsSchedule>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'auto_allocate',
        'auto_batch',
        'auto_print',
        'auto_label',
        'inventory_sync',
        'report_generate',
        'cleanup',
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    scheduleType: {
      type: String,
      enum: ['manual', 'scheduled'],
      default: 'manual',
    },
    cronExpression: {
      type: String,
      trim: true,
    },
    cronHour: {
      type: Number,
    },
    cronMinute: {
      type: Number,
    },
    cronDaysOfWeek: {
      type: [Number],
      default: [],
    },
    skipHolidays: {
      type: Boolean,
      default: false,
    },
    lastRunAt: {
      type: Date,
    },
    nextRunAt: {
      type: Date,
    },
    runCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'wms_schedules',
  },
);

export const WmsSchedule = mongoose.model<IWmsSchedule>('WmsSchedule', wmsScheduleSchema);
