// 資材作成・更新DTO（Zodバリデーション）/ 物料创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createMaterialSchema = z.object({
  // SKU（必須）/ SKU（必填）
  sku: z.string().trim().min(1, 'SKU is required'),
  // 名前（必須）/ 名称（必填）
  name: z.string().trim().min(1, 'Name is required'),
  // 説明 / 描述
  description: z.string().trim().optional(),
  // 単価（numeric型のため文字列）/ 单价（numeric类型用字符串）
  unitCost: z.string().trim().optional(),
  // 在庫数 / 库存数
  stockQuantity: z.number().int().nonnegative().optional(),
  // カテゴリ / 分类
  category: z.string().trim().optional(),
  // 有効フラグ / 有效标志
  isActive: z.boolean().optional().default(true),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export type CreateMaterialDto = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialDto = z.infer<typeof updateMaterialSchema>;
