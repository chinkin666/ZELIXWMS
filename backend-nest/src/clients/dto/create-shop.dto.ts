// ショップ作成・更新DTO / 店铺创建・更新DTO
import { z } from 'zod';

export const createShopSchema = z.object({
  clientId: z.string().uuid('Invalid clientId / clientIdが不正です / clientId格式不正确'),
  subClientId: z.string().uuid('Invalid subClientId / subClientIdが不正です / subClientId格式不正确').optional(),
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  platform: z.string().trim().optional(),
  platformShopId: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateShopSchema = createShopSchema.partial();

export type CreateShopDto = z.infer<typeof createShopSchema>;
export type UpdateShopDto = z.infer<typeof updateShopSchema>;
