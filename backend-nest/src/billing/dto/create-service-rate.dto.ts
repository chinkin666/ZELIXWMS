// サービス料金DTO（Zodバリデーション）/ 服务费率DTO（Zod验证）
import { z } from 'zod';
import { CHARGE_TYPES, CHARGE_UNITS } from '../../database/schema/billing.js';

// サービス料金作成スキーマ / 创建服务费率Schema
export const createServiceRateSchema = z.object({
  // 料金名称（必須）/ 费率名称（必填）
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  // チャージ種別（必須）/ 费用类型（必填）
  chargeType: z.enum(CHARGE_TYPES, {
    message: 'Invalid charge type / 無効なチャージ種別 / 无效的费用类型',
  }),
  // チャージ単位（デフォルト: per_item）/ 费用单位（默认: per_item）
  unit: z.enum(CHARGE_UNITS).optional().default('per_item'),
  // 単価（必須、文字列）/ 单价（必填、字符串）
  unitPrice: z.string().trim().min(1, 'Unit price is required / 単価は必須です / 单价为必填项'),
  // 荷主ID（任意）/ 货主ID（可选）
  clientId: z.string().uuid('Invalid client ID / 無効な荷主ID / 无效的货主ID').optional(),
  // 荷主名（任意）/ 货主名（可选）
  clientName: z.string().trim().optional(),
  // 条件（任意）/ 条件（可选）
  conditions: z.record(z.string(), z.unknown()).optional(),
  // 有効開始日（任意）/ 有效开始日（可选）
  validFrom: z.string().trim().optional(),
  // 有効終了日（任意）/ 有效结束日（可选）
  validTo: z.string().trim().optional(),
  // 有効フラグ / 有效标志
  isActive: z.boolean().optional().default(true),
  // 備考 / 备注
  memo: z.string().trim().optional(),
});

// サービス料金更新スキーマ（全フィールド任意）/ 更新服务费率Schema（全字段可选）
export const updateServiceRateSchema = createServiceRateSchema.partial();

export type CreateServiceRateDto = z.infer<typeof createServiceRateSchema>;
export type UpdateServiceRateDto = z.infer<typeof updateServiceRateSchema>;
