import mongoose from 'mongoose';

export type LotStatus = 'active' | 'expired' | 'recalled' | 'quarantine';

export interface ILot {
  _id: mongoose.Types.ObjectId;
  lotNumber: string;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  expiryDate?: Date;
  manufactureDate?: Date;
  status: LotStatus;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lotSchema = new mongoose.Schema<ILot>(
  {
    lotNumber: {
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
    expiryDate: {
      type: Date,
    },
    manufactureDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'expired', 'recalled', 'quarantine'],
      default: 'active',
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'lots',
  },
);

// 同一商品のロット番号はユニーク
lotSchema.index({ productId: 1, lotNumber: 1 }, { unique: true });
lotSchema.index({ productId: 1 });
lotSchema.index({ status: 1 });
lotSchema.index({ expiryDate: 1 });
lotSchema.index({ productSku: 1 });

export const Lot = mongoose.model<ILot>('Lot', lotSchema);
