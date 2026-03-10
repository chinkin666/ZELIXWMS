import { z } from 'zod';

// 列定义
const carrierColumnSchema = z.object({
  name: z.string().trim().min(1, '列名は必須です'),
  description: z.string().trim().optional(),
  type: z.enum(['string', 'number', 'date', 'boolean']),
  maxWidth: z.number().int().positive().optional(),
  required: z.boolean(),
  userUploadable: z.boolean(),
});

const formatDefinitionSchema = z.object({
  columns: z.array(carrierColumnSchema).min(1, '列は1件以上必要です'),
});

// 送り状種類ごとの印刷テンプレート設定
const carrierServiceSchema = z.object({
  invoiceType: z.string().trim().min(1, '送り状種類は必須です'),
  printTemplateId: z.string().trim().optional(),
});

export const createCarrierSchema = z.object({
  code: z.string().trim().min(1, 'コードは必須です'),
  name: z.string().trim().min(1, '名称は必須です'),
  description: z.string().trim().optional(),
  enabled: z.boolean().optional().default(true),
  trackingIdColumnName: z.string().trim().optional(),
  formatDefinition: formatDefinitionSchema,
  services: z.array(carrierServiceSchema).optional(),
});

export const updateCarrierSchema = createCarrierSchema.partial().extend({
  // formatDefinition だけは全体指定にする（部分更新時は省略可だが、入ってきたら全体で検証する）
  formatDefinition: formatDefinitionSchema.optional(),
});

export type CreateCarrierDto = z.infer<typeof createCarrierSchema>;
export type UpdateCarrierDto = z.infer<typeof updateCarrierSchema>;



