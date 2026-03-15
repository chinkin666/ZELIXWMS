import { z } from 'zod'

// 返品指示作成スキーマ / 退货指示创建schema
export const createReturnOrderSchema = z.object({
  shipmentOrderId: z.string().optional(),
  returnReason: z.enum(['customer_request', 'defective', 'wrong_item', 'damaged', 'other']),
  reasonDetail: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    productSku: z.string().optional(),
    quantity: z.number().int().min(1),
    locationId: z.string().optional(),
    lotId: z.string().optional(),
    lotNumber: z.string().optional(),
  })).min(1),
})

// 検品結果登録スキーマ / 检品结果登录schema
export const inspectLinesSchema = z.object({
  lines: z.array(z.object({
    lineIndex: z.number().int().min(0),
    inspectedQuantity: z.number().int().min(0),
    disposition: z.enum(['pending', 'restock', 'dispose', 'repair']),
    restockedQuantity: z.number().int().min(0).optional().default(0),
    disposedQuantity: z.number().int().min(0).optional().default(0),
    locationId: z.string().optional(),
    inspectionNotes: z.string().optional(),
  })).min(1),
})
