// 返品オーダー作成・更新DTO（Zodバリデーション）/ 退货订单创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createReturnOrderSchema = z.object({
  // 注文番号（必須）/ 订单号（必填）
  orderNumber: z.string().trim().min(1, 'Order number is required'),

  // ステータス（デフォルト: draft）/ 状态（默认: draft）
  status: z
    .enum(['draft', 'inspecting', 'completed', 'cancelled'])
    .optional()
    .default('draft'),

  // 返品理由（必須）/ 退货原因（必填）
  returnReason: z
    .enum(['customer_request', 'defective', 'wrong_item', 'damaged', 'other'])
    .refine((v) => !!v, { message: 'Return reason is required' }),

  // RMA番号 / RMA号
  rmaNumber: z.string().trim().optional(),

  // 返品配送伝票番号 / 退货物流单号
  returnTrackingId: z.string().trim().optional(),

  // 元出荷オーダーID / 原出货订单ID
  shipmentOrderId: z.string().uuid().optional(),

  // 顧客ID / 客户ID
  clientId: z.string().uuid().optional(),

  // 備考 / 备注
  notes: z.string().trim().optional(),
});

// 更新スキーマ（全フィールド任意）/ 更新schema（全字段可选）
export const updateReturnOrderSchema = createReturnOrderSchema.partial();

export type CreateReturnOrderDto = z.infer<typeof createReturnOrderSchema>;
export type UpdateReturnOrderDto = z.infer<typeof updateReturnOrderSchema>;
