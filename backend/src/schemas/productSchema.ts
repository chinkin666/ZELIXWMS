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

const baseProductSchema = z.object({
  sku: z.string().trim().min(1, 'SKUは必須です'),
  name: z.string().trim().min(1, '商品名は必須です'),
  nameFull: z.string().trim().optional(),
  barcode: z
    .array(z.string().trim().min(1))
    .default([]),
  coolType: coolTypeEnum.optional(),
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

