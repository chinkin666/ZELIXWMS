// 入庫オーダー作成・更新DTO（Zodバリデーション）/ 入库订单创建・更新DTO（Zod验证）
import { z } from 'zod';

/**
 * 入庫オーダーステータス / 入库订单状态
 * draft/confirmed/arrived/processing/awaiting_label/ready_to_ship/shipped/receiving/received/done/cancelled
 */
const inboundStatusEnum = z.enum([
  'draft', 'confirmed', 'arrived', 'processing',
  'awaiting_label', 'ready_to_ship', 'shipped',
  'receiving', 'received', 'done', 'cancelled',
]);

/**
 * フロータイプ / 流程类型
 * standard/crossdock/passthrough
 */
const flowTypeEnum = z.enum(['standard', 'crossdock', 'passthrough']);

export const createInboundOrderSchema = z.object({
  // 注文番号（必須）/ 订单号（必填）
  orderNumber: z.string().trim().min(1, 'Order number is required'),

  // ステータス / 状态
  status: inboundStatusEnum.optional().default('draft'),

  // フロータイプ / 流程类型
  flowType: flowTypeEnum.optional().default('standard'),

  // 関連先 / 关联方
  clientId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),

  // 予定日（文字列→Date変換）/ 预计到货日（字符串→Date转换）
  expectedDate: z.string().datetime({ offset: true }).optional()
    .transform((val) => val ? new Date(val) : undefined),

  // 備考 / 备注
  notes: z.string().trim().optional(),

  // 関連オーダーID / 关联订单ID
  linkedOrderIds: z.array(z.string().uuid()).optional().default([]),

  // 作業オプション / 作业选项
  serviceOptions: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export const updateInboundOrderSchema = createInboundOrderSchema.partial();

export type CreateInboundOrderDto = z.infer<typeof createInboundOrderSchema>;
export type UpdateInboundOrderDto = z.infer<typeof updateInboundOrderSchema>;
