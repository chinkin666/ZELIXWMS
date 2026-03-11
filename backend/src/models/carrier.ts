import mongoose from 'mongoose';

/**
 * 列数据类型
 */
export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean';

/**
 * 列配置定义
 */
export interface IColumnConfig {
  /** 列名（显示名称） */
  name: string;
  /** 列描述 */
  description?: string;
  /** 数据类型 */
  type: ColumnDataType;
  /** 最大字符数量（考虑全角/半角，全角=2，半角=1） */
  maxWidth?: number;
  /** 是否必须 */
  required: boolean;
  /** 是否由用户上传（false表示系统回传，用户不需要上传） */
  userUploadable: boolean;
}

/**
 * 格式定义
 * 定义carrier的CSV/TSV格式，包括列名和列的配置
 */
export interface IFormatDefinition {
  /** 列配置列表，按顺序定义 */
  columns: IColumnConfig[];
}

/**
 * 送り状種類ごとの印刷テンプレート設定
 */
export interface ICarrierService {
  /** 送り状種類 (0-9, A) */
  invoiceType: string;
  /** 関連する印刷テンプレートID */
  printTemplateId?: string;
}

/**
 * 快递公司模型
 * 存储快递公司信息和格式定义
 */
export interface ICarrier {
  _id: mongoose.Types.ObjectId;
  /** 快递公司代码（用于系统内部标识） */
  code: string;
  /** 快递公司名称（显示名称） */
  name: string;
  /** 说明/描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 回执/実績ファイル内で伝票番号に使う列名 */
  trackingIdColumnName?: string;
  /** 格式定义 */
  formatDefinition: IFormatDefinition;
  /** 是否为内置配送業者（不可编辑/删除） */
  isBuiltIn: boolean;
  /** 自动化类型 */
  automationType?: string;
  /** 送り状種類ごとの印刷テンプレート設定（ユーザー追加carrierのみ） */
  services?: ICarrierService[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

const columnConfigSchema = new mongoose.Schema<IColumnConfig>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean'],
      required: true,
      default: 'string',
    },
    maxWidth: {
      type: Number,
      min: 1,
    },
    required: {
      type: Boolean,
      required: true,
      default: false,
    },
    userUploadable: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false },
);

const formatDefinitionSchema = new mongoose.Schema<IFormatDefinition>(
  {
    columns: {
      type: [columnConfigSchema],
      required: true,
      default: [],
    },
  },
  { _id: false },
);

const carrierServiceSchema = new mongoose.Schema<ICarrierService>(
  {
    invoiceType: {
      type: String,
      required: true,
      trim: true,
    },
    printTemplateId: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const carrierSchema = new mongoose.Schema<ICarrier>(
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
    description: {
      type: String,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    trackingIdColumnName: {
      type: String,
      trim: true,
    },
    formatDefinition: {
      type: formatDefinitionSchema,
      required: true,
    },
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
    automationType: {
      type: String,
      enum: ['yamato-b2', 'sagawa-api', 'seino-api', null],
      trim: true,
    },
    services: {
      type: [carrierServiceSchema],
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'carriers',
  },
);

// 创建索引
// code 已经有 unique: true，会自动创建唯一索引
carrierSchema.index({ enabled: 1 });

export const Carrier = mongoose.model<ICarrier>('Carrier', carrierSchema);








