// 通知作成・更新DTO（Zodバリデーション）/ 通知创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createNotificationSchema = z.object({
  // 通知内容 / 通知内容
  title: z.string().trim().min(1, 'Title is required / タイトルは必須です / 标题为必填项'),
  body: z.string().trim().optional(),
  type: z.enum(['info', 'warning', 'error', 'success'], {
    message: 'Type is required / タイプは必須です / 类型为必填项',
  }),

  // 関連リソース / 关联资源
  referenceType: z.string().trim().optional(),
  referenceId: z.string().uuid().optional(),

  // 対象ユーザー / 目标用户
  userId: z.string().uuid('Invalid userId / ユーザーIDが無効です / 用户ID无效'),
});

export const updateNotificationSchema = createNotificationSchema.partial();

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationDto = z.infer<typeof updateNotificationSchema>;
