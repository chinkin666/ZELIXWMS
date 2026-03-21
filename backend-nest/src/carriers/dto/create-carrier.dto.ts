// 配送業者作成・更新DTO（Zodバリデーション）/ 配送业者创建・更新DTO（Zod验证）
import { z } from 'zod';

// 列定義スキーマ / 列定义Schema
const columnSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
  maxWidth: z.number().optional(),
  required: z.boolean().optional(),
  userUploadable: z.boolean().optional(),
});

// フォーマット定義スキーマ / 格式定义Schema
const formatDefinitionSchema = z.object({
  columns: z.array(columnSchema).default([]),
});

// サービス定義スキーマ / 服务定义Schema
const serviceSchema = z.object({
  invoiceType: z.string(),
  printTemplateId: z.string().optional(),
});

export const createCarrierSchema = z.object({
  // 基本情報 / 基本信息
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 代码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  description: z.string().trim().optional(),

  // 有効フラグ / 有效标志
  enabled: z.boolean().optional().default(true),

  // 実績ファイル設定 / 实绩文件设置
  trackingIdColumnName: z.string().trim().optional(),

  // 格式定義 / 格式定义
  formatDefinition: formatDefinitionSchema.optional().default({ columns: [] }),

  // サービス一覧 / 服务列表
  services: z.array(serviceSchema).optional(),

  // 自動化タイプ / 自动化类型
  automationType: z.string().trim().optional(),

  // 内置フラグ / 内置标志
  isBuiltIn: z.boolean().optional().default(false),

  // 表示順序 / 显示顺序
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export const updateCarrierSchema = createCarrierSchema.partial();

export type CreateCarrierDto = z.infer<typeof createCarrierSchema>;
export type UpdateCarrierDto = z.infer<typeof updateCarrierSchema>;
