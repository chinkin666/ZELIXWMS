// 出荷注文作成・更新DTO（Zodバリデーション）/ 出货订单创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createShipmentOrderSchema = z.object({
  // 注文番号（必須）/ 订单编号（必填）
  orderNumber: z.string().trim().min(1, 'Order number is required / 注文番号は必須です / 订单编号必填'),

  // 送付先タイプ / 目的地类型
  destinationType: z.string().trim().optional(), // B2C/B2B/FBA/RSL

  // 配送業者 / 配送商
  carrierId: z.string().trim().optional(),

  // 送付先住所 / 收件人地址
  recipientPostalCode: z.string().trim().optional(),
  recipientPrefecture: z.string().trim().optional(),
  recipientCity: z.string().trim().optional(),
  recipientStreet: z.string().trim().optional(),
  recipientBuilding: z.string().trim().optional(),
  recipientName: z.string().trim().optional(),
  recipientPhone: z.string().trim().optional(),

  // 依頼主住所 / 发件人地址
  senderPostalCode: z.string().trim().optional(),
  senderPrefecture: z.string().trim().optional(),
  senderCity: z.string().trim().optional(),
  senderStreet: z.string().trim().optional(),
  senderBuilding: z.string().trim().optional(),
  senderName: z.string().trim().optional(),
  senderPhone: z.string().trim().optional(),

  // 配送希望 / 配送偏好
  shipPlanDate: z.string().trim().optional(),
  invoiceType: z.string().trim().optional(),
  coolType: z.string().trim().optional(),           // 0:常温/1:冷蔵/2:冷凍
  deliveryTimeSlot: z.string().trim().optional(),
  deliveryDatePreference: z.string().trim().optional(),

  // 荷扱いタグ / 处理标签
  handlingTags: z.array(z.string()).optional().default([]),

  // カスタムフィールド / 自定义字段
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateShipmentOrderSchema = createShipmentOrderSchema.partial();

export type CreateShipmentOrderDto = z.infer<typeof createShipmentOrderSchema>;
export type UpdateShipmentOrderDto = z.infer<typeof updateShipmentOrderSchema>;
