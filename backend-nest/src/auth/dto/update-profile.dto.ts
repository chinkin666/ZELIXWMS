// プロフィール更新DTO（Zodバリデーション）/ 个人资料更新DTO（Zod验证）
import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required / 表示名は必須です / 显示名称必填').optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
