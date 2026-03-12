import mongoose from 'mongoose';

export interface ISystemSettings {
  _id: mongoose.Types.ObjectId;
  settingsKey: string;

  // 入荷設定
  inboundRequireInspection: boolean;
  inboundAutoCreateLot: boolean;
  inboundDefaultLocationCode: string;

  // 在庫設定
  inventoryAllowNegativeStock: boolean;
  inventoryDefaultSafetyStock: number;
  inventoryLotTrackingEnabled: boolean;
  inventoryExpiryAlertDays: number;

  // 出荷設定
  outboundAutoAllocate: boolean;
  outboundAllocationRule: 'FIFO' | 'FEFO' | 'LIFO';
  outboundRequireInspection: boolean;

  // バーコード設定
  barcodeDefaultFormat: 'code128' | 'ean13' | 'code39' | 'qrcode';
  barcodeScanMode: 'single' | 'continuous';

  // 一般設定
  systemLanguage: string;
  timezone: string;
  dateFormat: string;
  pageSize: number;

  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new mongoose.Schema<ISystemSettings>(
  {
    settingsKey: {
      type: String,
      default: 'global',
      unique: true,
    },

    // 入荷設定
    inboundRequireInspection: {
      type: Boolean,
      default: true,
    },
    inboundAutoCreateLot: {
      type: Boolean,
      default: false,
    },
    inboundDefaultLocationCode: {
      type: String,
      default: '',
      trim: true,
    },

    // 在庫設定
    inventoryAllowNegativeStock: {
      type: Boolean,
      default: false,
    },
    inventoryDefaultSafetyStock: {
      type: Number,
      default: 0,
    },
    inventoryLotTrackingEnabled: {
      type: Boolean,
      default: true,
    },
    inventoryExpiryAlertDays: {
      type: Number,
      default: 30,
    },

    // 出荷設定
    outboundAutoAllocate: {
      type: Boolean,
      default: false,
    },
    outboundAllocationRule: {
      type: String,
      enum: ['FIFO', 'FEFO', 'LIFO'],
      default: 'FIFO',
    },
    outboundRequireInspection: {
      type: Boolean,
      default: true,
    },

    // バーコード設定
    barcodeDefaultFormat: {
      type: String,
      enum: ['code128', 'ean13', 'code39', 'qrcode'],
      default: 'code128',
    },
    barcodeScanMode: {
      type: String,
      enum: ['single', 'continuous'],
      default: 'single',
    },

    // 一般設定
    systemLanguage: {
      type: String,
      default: 'ja',
    },
    timezone: {
      type: String,
      default: 'Asia/Tokyo',
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    pageSize: {
      type: Number,
      default: 50,
    },
  },
  {
    timestamps: true,
    collection: 'system_settings',
  },
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);
