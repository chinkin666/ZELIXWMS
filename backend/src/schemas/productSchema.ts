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

// カテゴリ: enum制限解除（日本語カテゴリ名も許可）/ 类别: 取消enum限制
const categoryEnum = z.string().trim();
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
  // --- LOGIFAST Phase 13 ---
  customerProductCode: z.string().trim().optional(),
  brandCode: z.string().trim().optional(),
  brandName: z.string().trim().optional(),
  sizeName: z.string().trim().optional(),
  colorName: z.string().trim().optional(),
  unitType: z.enum(['01', '02', '03', '04', '05']).optional(),
  outerBoxWidth: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  outerBoxDepth: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  outerBoxHeight: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  outerBoxVolume: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  outerBoxWeight: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  grossWeight: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  volume: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  shippingSizeCode: z.string().trim().optional(),
  taxType: z.enum(['01', '02']).optional(),
  taxRate: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  hazardousType: z.enum(['0', '1']).optional(),
  airTransportBan: z.preprocess(booleanPreprocess, z.boolean().optional()),
  barcodeCommission: z.preprocess(booleanPreprocess, z.boolean().optional()),
  reservationTarget: z.preprocess(booleanPreprocess, z.boolean().optional()),
  currency: z.enum(['1', '2', '3']).optional(),
  supplierCode: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  paidType: z.enum(['0', '1']).optional(),
  costPrice: z.preprocess(optionalNumberPreprocess, z.number().nonnegative().optional()),
  janCode: z.string().trim().optional(),
  caseQuantity: z.preprocess(optionalIntPreprocess, z.number().int().positive().optional()),
  defaultHandlingTags: z.array(z.string().trim()).optional(),
  fnsku: z.string().trim().optional(),
  asin: z.string().trim().optional(),
  amazonSku: z.string().trim().optional(),
  fbaEnabled: z.preprocess(booleanPreprocess, z.boolean().optional()),
  rakutenSku: z.string().trim().optional(),
  rslEnabled: z.preprocess(booleanPreprocess, z.boolean().optional()),
  remarks: z.array(z.string().trim()).optional(),
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

