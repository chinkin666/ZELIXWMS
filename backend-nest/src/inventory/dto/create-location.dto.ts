// ロケーション作成・更新DTO（Zodバリデーション）/ 库位创建・更新DTO（Zod验证）
import { z } from 'zod';

// ロケーションタイプ / 库位类型
const locationTypes = ['warehouse', 'zone', 'shelf', 'bin', 'staging', 'receiving', 'virtual'] as const;

export const createLocationSchema = z.object({
  // 必須フィールド / 必填字段
  code: z.string().trim().min(1, 'Code is required / コードは必須です / 编码为必填项'),
  name: z.string().trim().min(1, 'Name is required / 名前は必須です / 名称为必填项'),
  type: z.enum(locationTypes, {
    message: `Type must be one of: ${locationTypes.join(', ')}`,
  }),

  // オプションフィールド / 可选字段
  warehouseId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  fullPath: z.string().trim().optional(),
  coolType: z.string().trim().optional(),       // 0:常温/1:冷蔵/2:冷凍
  stockType: z.string().trim().optional(),      // 01:良品/02:不良品/03:保留/04:返品/05:廃棄/06:その他
  temperatureType: z.string().trim().optional(), // 01:常温/02:冷蔵/03:冷凍/04:危険/05:その他
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  memo: z.string().trim().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateLocationDto = z.infer<typeof createLocationSchema>;
export type UpdateLocationDto = z.infer<typeof updateLocationSchema>;
