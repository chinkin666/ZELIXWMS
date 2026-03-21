// ログインDTO（Zodバリデーション）/ 登录DTO（Zod验证）
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required / 有効なメールアドレスが必要です / 需要有效的邮箱地址'),
  password: z.string().min(8, 'Password must be at least 8 characters / パスワードは8文字以上必要です / 密码至少8个字符'),
});

export type LoginDto = z.infer<typeof loginSchema>;
