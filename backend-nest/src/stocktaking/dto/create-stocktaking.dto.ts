// 棚卸作成・更新DTO（Zodバリデーション）/ 盘点创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createStocktakingSchema = z.object({
  // 棚卸番号（必須）/ 盘点单号（必填）
  orderNumber: z.string().trim().min(1, 'Order number is required / 棚卸番号は必須です / 盘点单号为必填'),

  // 棚卸タイプ（必須）/ 盘点类型（必填）
  type: z.enum(['full', 'partial', 'cycle'], {
    message: 'Type must be full, partial, or cycle / タイプは full/partial/cycle のいずれかです / 类型必须为 full/partial/cycle',
  }),

  // 倉庫ID（必須UUID）/ 仓库ID（必填UUID）
  warehouseId: z.string().uuid('Warehouse ID must be a valid UUID / 倉庫IDは有効なUUIDが必要です / 仓库ID必须为有效UUID'),

  // 対象ロケーション（任意）/ 目标库位（可选）
  locationIds: z.array(z.string()).optional().default([]),

  // 対象商品（任意）/ 目标商品（可选）
  productIds: z.array(z.string()).optional().default([]),

  // 予定日（任意）/ 计划日期（可选）
  scheduledDate: z.string().optional(),

  // メモ（任意）/ 备注（可选）
  memo: z.string().trim().optional(),
});

export const updateStocktakingSchema = createStocktakingSchema.partial();

export type CreateStocktakingDto = z.infer<typeof createStocktakingSchema>;
export type UpdateStocktakingDto = z.infer<typeof updateStocktakingSchema>;
