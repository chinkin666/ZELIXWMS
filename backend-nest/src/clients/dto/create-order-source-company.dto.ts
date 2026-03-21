// 依頼元会社作成・更新DTO / 委托方公司创建・更新DTO
import { z } from 'zod';

export const createOrderSourceCompanySchema = z.object({
  senderName: z.string().trim().min(1, 'Sender name is required / 送り主名は必須です / 发件人名称为必填项'),
  senderPostalCode: z.string().trim().optional(),
  senderAddressPrefecture: z.string().trim().optional(),
  senderAddressCity: z.string().trim().optional(),
  senderAddressStreet: z.string().trim().optional(),
  senderAddressBuilding: z.string().trim().optional(),
  senderPhone: z.string().trim().optional(),
  hatsuBaseNo1: z.string().trim().optional(),
  hatsuBaseNo2: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateOrderSourceCompanySchema = createOrderSourceCompanySchema.partial();

export type CreateOrderSourceCompanyDto = z.infer<typeof createOrderSourceCompanySchema>;
export type UpdateOrderSourceCompanyDto = z.infer<typeof updateOrderSourceCompanySchema>;
