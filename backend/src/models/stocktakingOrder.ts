import mongoose from 'mongoose';

export type StocktakingType = 'full' | 'cycle' | 'spot';
export type StocktakingStatus = 'draft' | 'in_progress' | 'completed' | 'adjusted' | 'cancelled';
export type StocktakingLineStatus = 'pending' | 'counted' | 'verified';

export interface IStocktakingLine {
  locationId: mongoose.Types.ObjectId;
  locationName: string;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  status: StocktakingLineStatus;
  memo?: string;
}

export interface IStocktakingOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  type: StocktakingType;
  status: StocktakingStatus;
  targetLocations: mongoose.Types.ObjectId[];
  targetProducts: mongoose.Types.ObjectId[];
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  adjustedAt?: Date;
  lines: IStocktakingLine[];
  memo?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stocktakingLineSchema = new mongoose.Schema<IStocktakingLine>(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    systemQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    countedQuantity: {
      type: Number,
      min: 0,
    },
    variance: {
      type: Number,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'counted', 'verified'],
      default: 'pending',
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const stocktakingOrderSchema = new mongoose.Schema<IStocktakingOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['full', 'cycle', 'spot'],
      default: 'spot',
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'in_progress', 'completed', 'adjusted', 'cancelled'],
      default: 'draft',
    },
    targetLocations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
      },
    ],
    targetProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    scheduledDate: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    adjustedAt: {
      type: Date,
    },
    lines: {
      type: [stocktakingLineSchema],
      default: [],
    },
    memo: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'stocktaking_orders',
  },
);

stocktakingOrderSchema.index({ status: 1, scheduledDate: -1 });
stocktakingOrderSchema.index({ type: 1 });
stocktakingOrderSchema.index({ 'lines.productId': 1 });
stocktakingOrderSchema.index({ 'lines.locationId': 1 });

export const StocktakingOrder = mongoose.model<IStocktakingOrder>(
  'StocktakingOrder',
  stocktakingOrderSchema,
);
