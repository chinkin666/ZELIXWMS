// 商品作成・更新DTO（Zodバリデーション）/ 商品创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createProductSchema = z.object({
  // 基本情報 / 基本信息
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(1, 'Name is required'),
  nameFull: z.string().trim().optional(),
  nameEn: z.string().trim().optional(),
  category: z.string().trim().optional().default('0'),
  barcode: z.array(z.string()).optional().default([]),
  janCode: z.string().trim().optional(),
  imageUrl: z.string().url().optional(),
  memo: z.string().trim().optional(),

  // 顧客商品コード・ブランド / 客户商品编码・品牌
  customerProductCode: z.string().trim().optional(),
  brandCode: z.string().trim().optional(),
  brandName: z.string().trim().optional(),
  sizeName: z.string().trim().optional(),
  colorName: z.string().trim().optional(),
  unitType: z.string().trim().optional(),

  // 寸法・重量 / 尺寸重量
  width: z.number().nonnegative().optional(),
  depth: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  grossWeight: z.number().nonnegative().optional(),
  volume: z.number().nonnegative().optional(),

  // 外箱 / 外箱
  outerBoxWidth: z.number().nonnegative().optional(),
  outerBoxDepth: z.number().nonnegative().optional(),
  outerBoxHeight: z.number().nonnegative().optional(),
  caseQuantity: z.number().int().nonnegative().optional(),

  // 価格 / 价格
  price: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  taxType: z.string().trim().optional(),
  taxRate: z.number().nonnegative().optional(),
  currency: z.string().trim().optional(),

  // 配送 / 配送
  coolType: z.string().trim().optional(),
  shippingSizeCode: z.string().trim().optional(),

  // 管理区分 / 管理区分
  inventoryEnabled: z.boolean().optional().default(false),
  lotTrackingEnabled: z.boolean().optional().default(false),
  expiryTrackingEnabled: z.boolean().optional().default(false),
  serialTrackingEnabled: z.boolean().optional().default(false),
  alertDaysBeforeExpiry: z.number().int().nonnegative().optional(),
  safetyStock: z.number().int().nonnegative().optional().default(0),
  allocationRule: z.enum(['FIFO', 'FEFO', 'LIFO']).optional().default('FIFO'),

  // 仕入先 / 供货方
  supplierCode: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),

  // Amazon / 楽天 / Amazon / 乐天
  fnsku: z.string().trim().optional(),
  asin: z.string().trim().optional(),
  amazonSku: z.string().trim().optional(),
  fbaEnabled: z.boolean().optional().default(false),
  rakutenSku: z.string().trim().optional(),
  rslEnabled: z.boolean().optional().default(false),

  // 倉庫メモ / 仓库备注
  whPreferredLocation: z.string().trim().optional(),
  whHandlingNotes: z.string().trim().optional(),
  whIsFragile: z.boolean().optional().default(false),
  whIsLiquid: z.boolean().optional().default(false),
  whRequiresOppBag: z.boolean().optional().default(false),
  whStorageType: z.enum(['ambient', 'chilled', 'frozen']).optional(),

  // その他 / 其他
  countryOfOrigin: z.string().trim().optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
