import { z } from 'zod';

const coolTypeEnum = z.enum(['0', '1', '2']);

const subSkuSchema = z.object({
  subSku: z.string().trim().min(1, '子SKUコードは必須です'),
  price: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'string') {
        const s = val.trim();
        if (s === '') return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : val;
      }
      return val;
    },
    z.number().nonnegative('価格は0以上である必要があります').optional(),
  ),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

// Helper preprocessor for optional integers (CSV import compatible)
const optionalIntPreprocess = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    const s = val.trim();
    if (s === '') return undefined;
    if (!/^[+-]?\d+$/.test(s)) return val;
    const n = Number(s);
    return Number.isFinite(n) ? n : val;
  }
  return val;
};

// Helper preprocessor for optional numbers (CSV import compatible)
const optionalNumberPreprocess = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    const s = val.trim();
    if (s === '') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : val;
  }
  return val;
};

const categoryEnum = z.enum(['0', '1', '2', '3', '4']);
const allocationRuleEnum = z.enum(['FIFO', 'FEFO', 'LIFO']);

const booleanPreprocess = (val: unknown) => {
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'する') return true;
    if (s === 'false' || s === '0' || s === 'しない' || s === '') return false;
  }
  return val;
};

const baseProductSchema = z.object({
  sku: z.string().trim().min(1, 'SKUは必須です'),
  name: z.string().trim().min(1, '商品名は必須です'),
  nameFull: z.string().trim().optional(),
  barcode: z
    .array(z.string().trim().min(1))
    .default([]),
  coolType: coolTypeEnum.optional(),
  category: categoryEnum.optional().default('0'),
  // メール便計算設定
  mailCalcEnabled: z.preprocess(
    (val) => {
      // Accept string "true"/"false" from CSV import
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === '可') return true;
        if (s === 'false' || s === '0' || s === '不可' || s === '') return false;
      }
      return val;
    },
    z.boolean().default(false),
  ),
  mailCalcMaxQuantity: z.preprocess(
    optionalIntPreprocess,
    z.number().int('メール便最大数量は整数である必要があります').positive('メール便最大数量は正の整数である必要があります').optional(),
  ),
  memo: z.string().trim().optional(),
  price: z.preprocess(
    optionalNumberPreprocess,
    z.number().nonnegative('商品金額は0以上である必要があります').optional(),
  ),
  handlingTypes: z.array(z.string().trim().min(1)).default([]),
  imageUrl: z.string().trim().optional(),
  subSkus: z.array(subSkuSchema).default([]),
  // 在庫管理設定
  inventoryEnabled: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === 'する') return true;
        if (s === 'false' || s === '0' || s === 'しない' || s === '') return false;
      }
      return val;
    },
    z.boolean().default(false),
  ),
  lotTrackingEnabled: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (s === 'true' || s === '1') return true;
        if (s === 'false' || s === '0' || s === '') return false;
      }
      return val;
    },
    z.boolean().default(false),
  ),
  expiryTrackingEnabled: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (s === 'true' || s === '1') return true;
        if (s === 'false' || s === '0' || s === '') return false;
      }
      return val;
    },
    z.boolean().default(false),
  ),
  alertDaysBeforeExpiry: z.preprocess(
    optionalIntPreprocess,
    z.number().int().nonnegative().default(30),
  ),
  safetyStock: z.preprocess(
    optionalIntPreprocess,
    z.number().int().nonnegative().default(0),
  ),
  // P1: カスタムフィールド
  customField1: z.string().trim().optional(),
  customField2: z.string().trim().optional(),
  customField3: z.string().trim().optional(),
  customField4: z.string().trim().optional(),
  // P2: 寸法・重量
  width: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  depth: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  height: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  weight: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  // P3: 国際・追加情報
  nameEn: z.string().trim().optional(),
  countryOfOrigin: z.string().trim().optional(),
  // P3: 引当規則
  allocationRule: allocationRuleEnum.optional().default('FIFO'),
  // P3: シリアルNo管理
  serialTrackingEnabled: z.preprocess(booleanPreprocess, z.boolean().default(false)),
  // P3: 入庫期限日数
  inboundExpiryDays: z.preprocess(
    optionalIntPreprocess,
    z.number().int().positive('入庫期限日数は正の整数である必要があります').optional(),
  ),
});

// Refinement functions for subSku validation
const subSkuDuplicateCheck = (data: { subSkus?: { subSku: string }[] }) => {
  const subSkuCodes = data.subSkus?.map((s) => s.subSku) || [];
  const uniqueCodes = new Set(subSkuCodes);
  return uniqueCodes.size === subSkuCodes.length;
};

const subSkuParentCheck = (data: { sku?: string; subSkus?: { subSku: string }[] }) => {
  const parentSku = data.sku;
  if (!parentSku) return true; // If no parent SKU provided, skip check (for partial updates)
  const subSkuCodes = data.subSkus?.map((s) => s.subSku) || [];
  return !subSkuCodes.includes(parentSku);
};

// Create schema with refinements
export const createProductSchema = baseProductSchema
  .refine(subSkuDuplicateCheck, {
    message: '子SKUコードが重複しています',
    path: ['subSkus'],
  })
  .refine(subSkuParentCheck, {
    message: '子SKUコードは親SKUと同じにできません',
    path: ['subSkus'],
  });

// Update schema: partial base object with same refinements
export const updateProductSchema = baseProductSchema.partial()
  .refine(subSkuDuplicateCheck, {
    message: '子SKUコードが重複しています',
    path: ['subSkus'],
  })
  .refine(subSkuParentCheck, {
    message: '子SKUコードは親SKUと同じにできません',
    path: ['subSkus'],
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

