import { z } from 'zod';

/**
 * 格式化日期时间为字符串（不进行时区转换，直接使用日期数值）
 * 用于系统生成的时间戳（如 createdAt, updatedAt）
 */
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * ISO 8601 日期时间字符串验证和转换（不进行时区转换，直接使用日期数值）
 * 将各种日期格式转换为 YYYY-MM-DDTHH:mm:ss 格式（不带时区信息）
 */
const iso8601String = z
  .union([
    z.string().datetime(), // 标准 ISO 8601 格式
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD 格式
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/), // 带时区的格式
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/), // YYYY-MM-DDTHH:mm:ss 格式
    z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // YYYY-MM-DD HH:mm:ss 格式
    z.coerce.date(), // 可以解析的日期字符串
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      // 如果已经是 YYYY-MM-DDTHH:mm:ss 格式（不带时区），直接返回
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) {
        return val;
      }
      // 如果是 YYYY-MM-DD 格式，添加时间部分
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return `${val}T00:00:00`;
      }
      // 如果是 YYYY-MM-DD HH:mm:ss 格式，转换为 YYYY-MM-DDTHH:mm:ss
      const spaceMatch = val.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
      if (spaceMatch) {
        return `${spaceMatch[1]}T${spaceMatch[2]}`;
      }
      // 如果是带时区的格式（如 2025-11-30T00:53:36Z 或 2025-11-30T00:53:36+09:00），提取日期时间部分，不进行时区转换
      const tzMatch = val.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/);
      if (tzMatch) {
        return tzMatch[1]; // 只返回日期时间部分，去掉时区信息
      }
      // 其他格式，尝试解析但不进行时区转换（使用字符串提取，避免 Date 对象的时区转换）
      // 如果无法匹配，抛出错误
      throw new Error('Invalid date format');
    }
    if (val instanceof Date) {
      // Date 对象转换为字符串时，使用本地时间的数值，不进行时区转换
      return formatDateTimeLocal(val);
    }
    return val;
  });

/**
 * YYYY-MM-DD 日付文字列（時刻なし）
 * - YYYY-MM-DD はそのまま
 * - datetime / Date は YYYY-MM-DD に丸める（互換目的）
 */
const dateOnlyString = z
  .union([
    z.string().regex(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/), // YYYY-MM-DD or YYYY/MM/DD
    z.string().datetime(), // ISO datetime -> truncate
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/), // tolerant
    z.coerce.date(),
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      // already date-only
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(val)) return val;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val.replace(/-/g, '/');
      // 直接从字符串中提取日期部分，不进行时区转换
      const m = val.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
      if (m?.[1] && m?.[2] && m?.[3]) {
        return `${m[1]}/${m[2]}/${m[3]}`;
      }
      // 如果无法提取，抛出错误（不使用 new Date() 避免时区转换）
      throw new Error('Invalid date format');
    }
    if (val instanceof Date) {
      // 使用本地时间，不进行时区转换
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
    return val;
  });

// 共通パターン
const digitsOnly = /^\d+$/;
const postalCode7 = /^\d{7}$/;
const deliveryTimeSlot4 = /^\d{4}$/;

// ハイフン・スペースを除去して数字のみにする transform
const stripNonDigits = (v: string) => v.replace(/[-\s\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\u30FC\uFF70]/g, '');

// ============================================
// 住所スキーマ（共通）
// ============================================
const addressSchema = z.object({
  postalCode: z
    .string()
    .min(1, '郵便番号は必須です')
    .transform(stripNonDigits)
    .pipe(z.string().regex(postalCode7, '郵便番号は7桁の数字で入力してください')),
  prefecture: z.string().min(1, '都道府県は必須です'),
  city: z.string().min(1, '郡市区は必須です'),
  street: z.string().min(1, '住所は必須です'),
  name: z.string().min(1, '名前は必須です'),
  phone: z
    .string()
    .min(1, '電話番号は必須です')
    .transform(stripNonDigits)
    .pipe(z.string().regex(digitsOnly, '電話番号は数字のみで入力してください')),
});

// 注文者用（全フィールド optional、空文字列は undefined 扱い）
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalAddressSchema = z.object({
  postalCode: z.preprocess(emptyToUndefined, z.string().transform(stripNonDigits).pipe(z.string().regex(postalCode7, '郵便番号は7桁の数字で入力してください')).optional()),
  prefecture: z.preprocess(emptyToUndefined, z.string().optional()),
  city: z.preprocess(emptyToUndefined, z.string().optional()),
  street: z.preprocess(emptyToUndefined, z.string().optional()),
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().transform(stripNonDigits).pipe(z.string().regex(digitsOnly, '電話番号は数字のみで入力してください')).optional()),
});

/**
 * お届け時間帯（時間帯レンジ）:
 * - 4桁数字文字列 "HHHH"（開始HH + 終了HH）
 * - HH は 00-24（終了は 01-24 を想定）
 * - 開始 < 終了
 */
const deliveryTimeSlotSchema = z
  .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string())
  .refine((v) => deliveryTimeSlot4.test(v), { message: 'お届け時間帯は4桁の数字で入力してください（例: 1012）' })
  .refine((v) => {
    const start = Number(v.slice(0, 2));
    const end = Number(v.slice(2, 4));
    if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
    if (start < 0 || start > 23) return false;
    if (end < 1 || end > 24) return false;
    return start < end;
  }, { message: 'お届け時間帯は開始時刻 < 終了時刻となるように入力してください（例: 1012）' });

/**
 * 订单文档验证 Schema
 */
export const orderDocumentSchema = z.object({
  _id: z.string().optional(),
  tenantId: z.string().optional(),

  // 注文情報
  orderNumber: z.string().optional(), // システム自動生成のため、作成時は不要
  sourceOrderAt: iso8601String.optional(),
  carrierId: z.string().min(1, '配送業者は必須です'),
  customerManagementNumber: z
    .string()
    .min(1, 'お客様管理番号は必須です')
    .max(50, 'お客様管理番号は50文字以内で入力してください')
    .regex(/^[a-zA-Z0-9-_]*$/, 'お客様管理番号は半角英数字（ハイフン・アンダースコア可）で入力してください'),

  // 注文者（全フィールド optional）
  orderer: optionalAddressSchema.optional(),

  // 送付先
  recipient: addressSchema,
  honorific: z.string().optional().default('様'), // 敬称（デフォルト: "様"）

  // 商品（新スキーマ：OrderProduct）
  products: z
    .array(
      z.object({
        // === ユーザー入力 ===
        inputSku: z.string().min(1, 'SKU（inputSku）は必須です'),
        quantity: z.number().int().positive('数量は正の整数である必要があります'),

        // === auto-fill時に解析して設定（任意：商品マスタ未登録SKUも許可）===
        productId: z.string().optional(),
        productSku: z.string().optional(),
        productName: z.string().optional(),

        // === 子SKU情報（inputSkuが子SKUの場合）===
        matchedSubSku: z.object({
          code: z.string(),
          price: z.number().optional(),
          description: z.string().optional(),
        }).optional(),

        // === 親商品からスナップショットした表示情報（auto-fill時に設定）===
        imageUrl: z.string().optional(),
        barcode: z.array(z.string()).optional(),
        coolType: z.enum(['0', '1', '2']).optional(),
        // メール便計算設定
        mailCalcEnabled: z.boolean().optional(),
        mailCalcMaxQuantity: z.number().int().positive('メール便最大数量は正の整数である必要があります').optional(),

        // === 価格情報 ===
        unitPrice: z.number().nonnegative('単価は0以上である必要があります').optional(),
        subtotal: z.number().nonnegative('小計は0以上である必要があります').optional(),
      })
    )
    .min(1, '商品は少なくとも1つ必要です'),

  // 配送希望
  shipPlanDate: dateOnlyString,
  invoiceType: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A'], {
    errorMap: () => ({ message: '送り状種類は0(発払い)、1(EAZY)、2(コレクト)、3(クロネコゆうメール)、4(タイム)、5(着払い)、6(発払い複数口)、7(クロネコゆうパケット)、8(宅急便コンパクト)、9(コンパクトコレクト)、A(ネコポス)のいずれかである必要があります' }),
  }),
  // NOTE: Frontend/CSV import may send empty string for "optional" fields.
  // Treat blank as "not provided" so it doesn't fail enum validation.
  coolType: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .union([
        z.enum(['0', '1', '2']),
        z
          .number()
          .int()
          .min(0)
          .max(2)
          .transform((v) => v.toString() as '0' | '1' | '2'),
      ])
      .optional(),
  ),
  deliveryTimeSlot: deliveryTimeSlotSchema.optional(),
  deliveryDatePreference: dateOnlyString.optional(),

  // 依頼主
  // NOTE: UI非表示・ユーザー入力不要。/shipment-orders/create で依頼主選択時に自動設定される。
  orderSourceCompanyId: z
    .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().min(1))
    .optional(),

  // 配送業者固有データ
  carrierData: z.object({
    yamato: z.object({
      sortingCode: z
        .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().regex(/^\d{6}$/, '仕分けコードは6桁の数字で入力してください'))
        .optional(),
      hatsuBaseNo1: z
        .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().regex(/^\d{3}$/, '発店コード1は3桁の数字で入力してください'))
        .optional(),
      hatsuBaseNo2: z
        .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().regex(/^\d{3}$/, '発店コード2は3桁の数字で入力してください'))
        .optional(),
    }).optional(),
  }).optional(),

  // 依頼主住所
  sender: addressSchema,

  // 荷扱い
  handlingTags: z.array(z.string()).optional().default([]), // 任意の文字列配列
  /**
   * 配送業者から取得した伝票番号（trackingId）
   * - インポート時に carrierRawRow から設定
   * - ユーザー入力不可
   */
  trackingId: z
    .preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(1).optional()),

  // 追跡用：CSV/Excel 取込時の元行データ（ヘッダー->値）を保持
  sourceRawRows: z.array(z.record(z.any())).optional(),

  // メタ
  createdAt: iso8601String.optional(),
  updatedAt: iso8601String.optional(),
});

/**
 * クール区分の検証ロジック（共通）
 * invoiceType が 0, 2, 5 以外の場合、coolType は '0'（常温）のみ許可
 */
const coolTypeRefinement = (data: { invoiceType?: string; coolType?: string }, ctx: z.RefinementCtx) => {
  const coolSupportedInvoiceTypes = ['0', '2', '5']; // 発払い, コレクト, 着払い
  if (data.coolType && data.coolType !== '0') {
    if (data.invoiceType && !coolSupportedInvoiceTypes.includes(data.invoiceType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `送り状種類「${data.invoiceType}」はクール便（冷凍・冷蔵）に対応していません。クール区分は「常温」のみ選択可能です。`,
        path: ['coolType'],
      });
    }
  }
};

// 完全バリデーション用（superRefine 付き）
export const orderDocumentSchemaWithRefinement = orderDocumentSchema.superRefine(coolTypeRefinement);

export const createOrderSchema = orderDocumentSchema.omit({
  _id: true,
  orderNumber: true, // システム自動生成のため除外
  createdAt: true,
  updatedAt: true,
}).superRefine(coolTypeRefinement);

// 更新用 schema：所有字段都是可选的
export const updateOrderSchema = orderDocumentSchema.partial().extend({
  _id: z.string().min(1, 'IDは必須です'),
  updatedAt: iso8601String.optional(),
});

export type OrderDocumentInput = z.infer<typeof orderDocumentSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

