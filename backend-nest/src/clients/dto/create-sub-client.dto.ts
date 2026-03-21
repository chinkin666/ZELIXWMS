// サブクライアント作成・更新DTO / 子客户创建・更新DTO
import { z } from 'zod';

export const createSubClientSchema = z.object({
  clientId: z.string().uuid('Invalid clientId / clientIdが不正です / clientId格式不正确'),
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  isActive: z.boolean().optional().default(true),
});

export const updateSubClientSchema = createSubClientSchema.partial();

export type CreateSubClientDto = z.infer<typeof createSubClientSchema>;
export type UpdateSubClientDto = z.infer<typeof updateSubClientSchema>;
