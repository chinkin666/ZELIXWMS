// Webhook作成・更新DTO（Zodバリデーション）/ Webhook创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createWebhookSchema = z.object({
  // 基本情報 / 基本信息
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  url: z.string().url('Invalid URL format / URL形式が無効です / URL格式无效'),
  secret: z.string().trim().optional(),

  // イベント設定 / 事件设置
  events: z.array(z.string()).optional().default([]),

  // 有効フラグ / 启用标志
  enabled: z.boolean().optional().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export type CreateWebhookDto = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookDto = z.infer<typeof updateWebhookSchema>;
