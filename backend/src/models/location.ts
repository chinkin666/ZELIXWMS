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

/** 倉庫コード（在庫種別）/ 库存类型 */
export type StockType = '01' | '02' | '03' | '04' | '05' | '06';
/** 倉庫種類（温度帯）/ 温度类型 */
export type TemperatureType = '01' | '02' | '03' | '04' | '05';

export interface ILocation {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  type: LocationType;
  parentId?: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  fullPath: string;
  coolType?: '0' | '1' | '2';
  /** 倉庫コード(01:良品/02:不良品/03:保留/04:返品/05:廃棄/06:その他) / 库存类型 */
  stockType?: StockType;
  /** 倉庫種類(01:常温/02:冷蔵/03:冷凍/04:危険/05:その他) / 温度类型 */
  temperatureType?: TemperatureType;
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
      ref: 'Warehouse',
    },
    fullPath: {
      type: String,
      default: '',
    },
    coolType: {
      type: String,
      enum: ['0', '1', '2'],
    },
    // LOGIFAST Phase 13: 倉庫コード・倉庫種類 / 库存类型・温度类型
    stockType: {
      type: String,
      enum: ['01', '02', '03', '04', '05', '06'],
      trim: true,
    },
    temperatureType: {
      type: String,
      enum: ['01', '02', '03', '04', '05'],
      trim: true,
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
locationSchema.index({ stockType: 1 });
locationSchema.index({ temperatureType: 1 });

export const Location = mongoose.model<ILocation>('Location', locationSchema);
