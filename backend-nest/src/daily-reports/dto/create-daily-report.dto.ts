// 日次レポート作成・更新DTO（Zodバリデーション）/ 日报创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createDailyReportSchema = z.object({
  // 対象日（ISO日付文字列）/ 对象日期（ISO日期字符串）
  date: z.string().trim().min(1, 'Date is required / 日付は必須です / 日期为必填项')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO date format (YYYY-MM-DD) / 日付はISO形式（YYYY-MM-DD）で入力してください / 日期须为ISO格式（YYYY-MM-DD）'),

  // 集計データ / 汇总数据
  summary: z.record(z.string(), z.unknown()).optional(),
});

export const updateDailyReportSchema = createDailyReportSchema.partial();

export type CreateDailyReportDto = z.infer<typeof createDailyReportSchema>;
export type UpdateDailyReportDto = z.infer<typeof updateDailyReportSchema>;
