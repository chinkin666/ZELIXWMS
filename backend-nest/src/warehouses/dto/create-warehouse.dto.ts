// 倉庫作成・更新DTO（Zodバリデーション）/ 仓库创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createWarehouseSchema = z.object({
  // 倉庫コード（必須）/ 仓库编码（必填）
  code: z.string().trim().min(1, 'Code is required'),
  // 倉庫名（必須）/ 仓库名称（必填）
  name: z.string().trim().min(1, 'Name is required'),
  // 倉庫名2（副名称）/ 仓库名2（副名称）
  name2: z.string().trim().optional(),
  // 郵便番号 / 邮政编码
  postalCode: z.string().trim().optional(),
  // 都道府県 / 都道府县
  prefecture: z.string().trim().optional(),
  // 市区町村 / 市区町村
  city: z.string().trim().optional(),
  // 住所 / 地址
  address: z.string().trim().optional(),
  // 住所2 / 地址2
  address2: z.string().trim().optional(),
  // 電話番号 / 电话号码
  phone: z.string().trim().optional(),
  // 対応温度帯 / 支持的温度类型 e.g. ["ambient","chilled","frozen"]
  coolTypes: z.array(z.string()).optional().default([]),
  // 収容可能数量 / 容纳数量
  capacity: z.number().int().nonnegative().optional(),
  // 営業時間 / 营业时间
  operatingHours: z.string().trim().optional(),
  // 有効フラグ / 启用标志
  isActive: z.boolean().optional().default(true),
  // 並び順 / 排序
  sortOrder: z.number().int().nonnegative().optional().default(0),
  // メモ / 备注
  memo: z.string().trim().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;
