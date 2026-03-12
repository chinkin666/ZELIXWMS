import mongoose from 'mongoose';

export interface IStockQuant {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  locationId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  lastMovedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stockQuantSchema = new mongoose.Schema<IStockQuant>(
  {
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
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    lastMovedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'stock_quants',
  },
);

// 在库的唯一性：product × location × lot
stockQuantSchema.index({ productId: 1, locationId: 1, lotId: 1 }, { unique: true });
stockQuantSchema.index({ productId: 1 });
stockQuantSchema.index({ locationId: 1 });
stockQuantSchema.index({ lotId: 1 });
stockQuantSchema.index({ productSku: 1 });
stockQuantSchema.index({ quantity: 1 });

export const StockQuant = mongoose.model<IStockQuant>('StockQuant', stockQuantSchema);
