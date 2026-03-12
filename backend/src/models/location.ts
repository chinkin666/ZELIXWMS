import mongoose from 'mongoose';

export type LocationType =
  | 'warehouse'
  | 'zone'
  | 'shelf'
  | 'bin'
  | 'staging'
  | 'receiving'
  | 'virtual/supplier'
  | 'virtual/customer';

export interface ILocation {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  type: LocationType;
  parentId?: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  fullPath: string;
  coolType?: '0' | '1' | '2';
  isActive: boolean;
  sortOrder: number;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new mongoose.Schema<ILocation>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['warehouse', 'zone', 'shelf', 'bin', 'staging', 'receiving', 'virtual/supplier', 'virtual/customer'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    fullPath: {
      type: String,
      default: '',
    },
    coolType: {
      type: String,
      enum: ['0', '1', '2'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'locations',
  },
);

locationSchema.index({ parentId: 1 });
locationSchema.index({ warehouseId: 1 });
locationSchema.index({ type: 1 });
locationSchema.index({ isActive: 1 });

export const Location = mongoose.model<ILocation>('Location', locationSchema);
