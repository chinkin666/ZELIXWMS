// カスタマー作成・更新DTO / 顾客创建・更新DTO
import { z } from 'zod';

export const createCustomerSchema = z.object({
  clientId: z.string().uuid('Invalid clientId / clientIdが不正です / clientId格式不正确').optional(),
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  postalCode: z.string().trim().optional(),
  prefecture: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email / メール形式が不正です / 邮箱格式不正确').optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
