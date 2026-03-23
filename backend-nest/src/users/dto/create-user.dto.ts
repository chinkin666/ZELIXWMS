// ユーザーCRUD DTOスキーマ / 用户CRUD DTO模式
import { z } from 'zod';

// ユーザー作成スキーマ / 用户创建模式
export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer', 'client']).default('viewer'),
  warehouseIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

// ユーザー更新スキーマ / 用户更新模式
export const updateUserSchema = createUserSchema.partial();

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
