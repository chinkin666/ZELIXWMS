// 顧客作成・更新DTO（Zodバリデーション）/ 客户创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createClientSchema = z.object({
  // 基本情報 / 基本信息
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  name2: z.string().trim().optional(),

  // 連絡先 / 联系方式
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email('Invalid email / メール形式が不正です / 邮箱格式不正确').optional().or(z.literal('')),
  contactPhone: z.string().trim().optional(),

  // 住所 / 地址
  postalCode: z.string().trim().optional(),
  prefecture: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  address2: z.string().trim().optional(),
  phone: z.string().trim().optional(),

  // 請求・信用 / 账单・信用
  billingCycle: z.string().trim().optional(),
  creditTier: z.string().trim().optional(),

  // ステータス / 状态
  isActive: z.boolean().optional().default(true),

  // メモ / 备注
  memo: z.string().trim().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
