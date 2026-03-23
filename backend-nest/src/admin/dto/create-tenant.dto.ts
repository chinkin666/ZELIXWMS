// テナント作成・更新DTO + 設定更新DTO（Zodバリデーション）
// 租户创建・更新DTO + 设置更新DTO（Zod验证）
import { z } from 'zod';

// テナント作成スキーマ / 租户创建模式
export const createTenantSchema = z.object({
  // テナント名（必須）/ 租户名称（必填）
  name: z.string().trim().min(1, 'Name is required / 名前は必須 / 名称为必填'),

  // テナントコード（必須・英数字ハイフン）/ 租户编码（必填・英数字连字符）
  code: z.string().trim().min(1, 'Code is required / コードは必須 / 编码为必填')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code must be alphanumeric / コードは英数字のみ / 编码仅限英数字'),

  // プランタイプ（任意）/ 计划类型（可选）
  plan: z.enum(['free', 'standard', 'pro', 'enterprise']).optional(),

  // 有効フラグ（任意）/ 有效标志（可选）
  isActive: z.boolean().optional(),
});

// テナント更新スキーマ（全フィールドoptional）/ 租户更新模式（全字段可选）
export const updateTenantSchema = createTenantSchema.partial();

// 設定更新スキーマ / 设置更新模式
export const upsertSettingsSchema = z.object({
  // 設定値（任意のキーバリューペア）/ 设置值（任意键值对）
  settings: z.record(z.string(), z.unknown()),
});

export type CreateTenantDto = z.infer<typeof createTenantSchema>;
export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;
export type UpsertSettingsDto = z.infer<typeof upsertSettingsSchema>;
