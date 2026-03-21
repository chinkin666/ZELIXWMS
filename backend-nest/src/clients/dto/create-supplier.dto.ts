// 仕入先作成・更新DTO / 供应商创建・更新DTO
import { z } from 'zod';

export const createSupplierSchema = z.object({
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: z.string().trim().email('Invalid email / メール形式が不正です / 邮箱格式不正确').optional().or(z.literal('')),
  address: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
