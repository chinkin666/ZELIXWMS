// ユーザー登録DTO（Zodバリデーション）/ 用户注册DTO（Zod验证）
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Valid email is required / 有効なメールアドレスが必要です / 需要有效的邮箱地址'),
  password: z.string().min(8, 'Password must be at least 8 characters / パスワードは8文字以上必要です / 密码至少8个字符'),
  displayName: z.string().trim().min(1, 'Display name is required / 表示名は必須です / 显示名称必填'),
  tenantId: z.string().uuid('Invalid tenant ID format / テナントIDの形式が不正です / 租户ID格式无效').optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer', 'client']).optional().default('viewer'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
