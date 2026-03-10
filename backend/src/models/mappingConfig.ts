/**
 * Excel/CSV 列映射配置模型（v2）
 * - 仅保留“transform pipeline”形态：多个输入 -> 逐个清洗 -> combine -> output pipeline
 */

import mongoose from 'mongoose';
import type {
  CombineConfig,
  InputSource,
  TransformMapping,
  TransformPipeline,
} from '@/transforms/types';

/**
 * 映射配置类型
 * 用于区分不同的业务场景
 */
export type ConfigType =
  | 'ec-company-to-order' // 从ECモール到order
  | 'order-to-carrier' // 从order到快递公司
  | 'order-to-sheet' // 从order到自定义表格输出（CSV/Excel导出）
  | 'customer' // 客户映射
  | 'product' // 产品映射
  | 'inventory' // 库存映射
  | string; // 允许自定义类型

export interface MappingConfigDocument {
  _id: string;
  schemaVersion: number;
  /** 租户ID（多租户支持） */
  tenantId: string;
  /** 配置类型（用于区分不同的业务场景） */
  configType: ConfigType;
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description?: string;
  /** 是否默认配置 */
  isDefault?: boolean;
  /** 依頼主ID（当configType为order-source-company时使用） */
  orderSourceCompanyId?: string;
  /** 依頼主名称（冗余字段，方便查询） */
  orderSourceCompanyName?: string;
  /** 快递公司ID（当configType为order-to-carrier时使用） */
  carrierId?: string;
  /** 快递公司代码（冗余字段，方便查询） */
  carrierCode?: string;
  /** 快递公司名称（冗余字段，方便查询） */
  carrierName?: string;
  /** 列映射规则列表 */
  mappings: TransformMapping[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 创建者ID */
  createdBy?: string;
  /** 更新者ID */
  updatedBy?: string;
}

/** 创建映射配置的请求体 */
export interface CreateMappingConfigDto {
  schemaVersion?: number;
  configType: ConfigType;
  name: string;
  description?: string;
  isDefault?: boolean;
  /** 依頼主ID（当configType为order-source-company时使用） */
  orderSourceCompanyId?: string;
  /** 依頼主名称（如果提供了名称但没有ID，会根据名称查找或创建） */
  orderSourceCompanyName?: string;
  /** 快递公司ID（当configType为order-to-carrier时使用） */
  carrierId?: string;
  mappings: TransformMapping[];
}

/** 更新映射配置的请求体 */
export interface UpdateMappingConfigDto {
  schemaVersion?: number;
  configType?: ConfigType;
  name?: string;
  description?: string;
  isDefault?: boolean;
  /** 依頼主ID（当configType为order-source-company时使用） */
  orderSourceCompanyId?: string;
  /** 依頼主名称（如果提供了名称但没有ID，会根据名称查找或创建） */
  orderSourceCompanyName?: string;
  /** 快递公司ID（当configType为order-to-carrier时使用） */
  carrierId?: string;
  mappings?: TransformMapping[];
}

/**
 * Mongoose 文档接口（数据库中的实际类型）
 */
export interface IMappingConfig {
  _id: mongoose.Types.ObjectId;
  schemaVersion: number;
  tenantId: string;
  configType: ConfigType;
  name: string;
  description?: string;
  isDefault?: boolean;
  orderSourceCompanyId?: string;
  orderSourceCompanyName?: string;
  carrierId?: string;
  carrierCode?: string;
  carrierName?: string;
  mappings: TransformMapping[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Pipeline-related sub-schemas
 */
const onErrorSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['fail', 'fallback', 'skip'], default: 'fail' },
    value: { type: mongoose.Schema.Types.Mixed },
    },
  { _id: false },
);

const transformStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    plugin: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed },
    enabled: { type: Boolean, default: true },
    onError: { type: onErrorSchema, default: undefined },
    },
  { _id: false },
);

const transformPipelineSchema = new mongoose.Schema<TransformPipeline>(
  {
    steps: { type: [transformStepSchema], default: [] },
    },
  { _id: false },
);

const inputSourceSchema = new mongoose.Schema<InputSource>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['column', 'literal', 'generated'], required: true },
    column: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    generator: { type: String },
    generatorParams: { type: mongoose.Schema.Types.Mixed },
    pipeline: { type: transformPipelineSchema },
  },
  { _id: false },
);

const combineConfigSchema = new mongoose.Schema<CombineConfig>(
  {
    plugin: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed },
    },
  { _id: false },
);

const transformMappingSchema = new mongoose.Schema<TransformMapping>(
  {
    targetField: { type: String, required: true, trim: true },
    inputs: { type: [inputSourceSchema], required: true, default: [] },
    combine: { type: combineConfigSchema, required: true },
    outputPipeline: { type: transformPipelineSchema },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const mappingConfigSchema = new mongoose.Schema<IMappingConfig>(
  {
    schemaVersion: { type: Number, default: 2 },
    tenantId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    configType: {
      type: String,
      required: true,
      index: true,
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
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    orderSourceCompanyId: {
      type: String,
      index: true,
    },
    orderSourceCompanyName: {
      type: String,
      trim: true,
    },
    carrierId: {
      type: String,
      index: true,
    },
    carrierCode: {
      type: String,
      trim: true,
    },
    carrierName: {
      type: String,
      trim: true,
    },
    mappings: {
      type: [transformMappingSchema],
      required: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'mapping_configs',
  },
);

// 创建索引
mappingConfigSchema.index({ tenantId: 1, configType: 1 });
mappingConfigSchema.index({ tenantId: 1, configType: 1, isDefault: 1 });
mappingConfigSchema.index({ tenantId: 1, name: 1 });

/**
 * Mongoose Model
 */
export const MappingConfig = mongoose.model<IMappingConfig>(
  'MappingConfig',
  mappingConfigSchema,
);
