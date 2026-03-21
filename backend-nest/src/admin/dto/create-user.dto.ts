// ユーザー作成・更新DTO（Zodバリデーション）/ 用户创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createUserSchema = z.object({
  // メールアドレス（必須・メール形式）/ 邮箱地址（必填・邮箱格式）
  email: z.string().trim().min(1, 'Email is required').email('Invalid email format'),

  // 表示名（必須）/ 显示名称（必填）
  displayName: z.string().trim().min(1, 'Display name is required'),

  // ロール / 角色
  role: z
    .enum(['admin', 'manager', 'operator', 'viewer', 'client'])
    .optional()
    .default('viewer'),

  // アクセス可能倉庫ID / 可访问仓库ID
  warehouseIds: z.array(z.string().uuid()).optional(),

  // アクティブ状態 / 激活状态
  isActive: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
