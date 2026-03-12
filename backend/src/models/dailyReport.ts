import mongoose from 'mongoose';

export type DailyReportStatus = 'open' | 'closed' | 'locked';

export interface IDailyReportSummary {
  shipments: {
    totalOrders: number;
    shippedOrders: number;
    totalItems: number;
    shippedItems: number;
  };
  inbound: {
    totalOrders: number;
    receivedOrders: number;
    totalItems: number;
    receivedItems: number;
  };
  returns: {
    totalOrders: number;
    completedOrders: number;
    restockedItems: number;
    disposedItems: number;
  };
  inventory: {
    totalSkus: number;
    totalQuantity: number;
    reservedQuantity: number;
    adjustmentCount: number;
  };
  stocktaking: {
    totalSessions: number;
    varianceCount: number;
  };
}

export interface IDailyReport {
  _id: mongoose.Types.ObjectId;
  date: string;
  status: DailyReportStatus;
  closedAt?: Date;
  closedBy?: string;
  summary: IDailyReportSummary;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shipmentsSummarySchema = new mongoose.Schema(
  {
    totalOrders: { type: Number, default: 0 },
    shippedOrders: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    shippedItems: { type: Number, default: 0 },
  },
  { _id: false },
);

const inboundSummarySchema = new mongoose.Schema(
  {
    totalOrders: { type: Number, default: 0 },
    receivedOrders: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    receivedItems: { type: Number, default: 0 },
  },
  { _id: false },
);

const returnsSummarySchema = new mongoose.Schema(
  {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    restockedItems: { type: Number, default: 0 },
    disposedItems: { type: Number, default: 0 },
  },
  { _id: false },
);

const inventorySummarySchema = new mongoose.Schema(
  {
    totalSkus: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    adjustmentCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const stocktakingSummarySchema = new mongoose.Schema(
  {
    totalSessions: { type: Number, default: 0 },
    varianceCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const dailyReportSummarySchema = new mongoose.Schema(
  {
    shipments: { type: shipmentsSummarySchema, default: () => ({}) },
    inbound: { type: inboundSummarySchema, default: () => ({}) },
    returns: { type: returnsSummarySchema, default: () => ({}) },
    inventory: { type: inventorySummarySchema, default: () => ({}) },
    stocktaking: { type: stocktakingSummarySchema, default: () => ({}) },
  },
  { _id: false },
);

const dailyReportSchema = new mongoose.Schema<IDailyReport>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: '日付はYYYY-MM-DD形式である必要があります',
      },
    },
    status: {
      type: String,
      required: true,
      enum: ['open', 'closed', 'locked'],
      default: 'open',
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: String,
      trim: true,
    },
    summary: {
      type: dailyReportSummarySchema,
      default: () => ({}),
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'daily_reports',
  },
);

dailyReportSchema.index({ status: 1 });

export const DailyReport = mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);
