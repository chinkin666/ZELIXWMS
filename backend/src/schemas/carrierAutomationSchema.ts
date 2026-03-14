import { z } from 'zod';

/**
 * 送り状種類ごとの設定スキーマ
 */
export const serviceTypeConfigSchema = z.object({
  b2ServiceType: z.string().min(1),
  printTemplateId: z.string().optional(),
  pdfSource: z.enum(['local', 'b2-webapi']).optional().default('local'),
  // 有効/無効フラグ / 有效/无效标志
  enabled: z.boolean().optional().default(true),
});

/**
 * Yamato B2 設定スキーマ
 */
export const yamatoB2ConfigSchema = z.object({
  apiEndpoint: z.string().url().default('https://yamato-b2-webapi.nexand.org'),
  apiKey: z.string().min(1, 'API Keyは必須です'),
  customerCode: z.string().min(1, 'お客様コードは必須です'),
  customerPassword: z.string().min(1, 'パスワードは必須です'),
  customerClsCode: z.string().optional(),
  loginUserId: z.string().optional(),
  // 送り状種類ごとの設定マッピング
  serviceTypeMapping: z.record(z.string(), serviceTypeConfigSchema).optional(),
  invoiceCode: z.string().optional(),
  invoiceFreightNo: z.string().optional(),
});

/**
 * 自動検証設定スキーマ
 */
export const autoValidationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  intervalMinutes: z.number().refine(v => [1, 5, 10, 30, 60].includes(v), {
    message: '検証間隔は1, 5, 10, 30, 60分のいずれかです',
  }).default(5),
  maxRetries: z.number().int().min(1).max(20).default(5),
});

/**
 * CarrierAutomationConfig 作成/更新スキーマ
 */
export const upsertCarrierAutomationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  yamatoB2: yamatoB2ConfigSchema.optional(),
  autoValidation: autoValidationConfigSchema.optional(),
});

/**
 * エクスポートリクエストスキーマ
 */
export const exportRequestSchema = z.object({
  orderIds: z.array(z.string()).min(1, '最低1つの注文を選択してください'),
});

/**
 * 印刷リクエストスキーマ
 */
export const printRequestSchema = z.object({
  trackingNumbers: z.array(z.string()).min(1, '最低1つの伝票番号を指定してください'),
});

/**
 * 履歴取得リクエストスキーマ
 */
export const historyRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

/**
 * インポートリクエストスキーマ
 */
export const importRequestSchema = z.object({
  shipmentDateFrom: z.string().optional(),  // YYYY-MM-DD format
  shipmentDateTo: z.string().optional(),    // YYYY-MM-DD format
});

/**
 * 確認取消リクエストスキーマ
 */
export const unconfirmRequestSchema = z.object({
  orderIds: z.array(z.string()).min(1, '最低1つの注文を選択してください'),
  reason: z.string().optional().default(''), // 空欄可（空の場合は内部データに記録しない）
  skipCarrierDelete: z.boolean().optional().default(false), // 運送会社API削除をスキップしてローカル操作のみ実行
});

/**
 * 送り状種類変更リクエストスキーマ
 */
export const changeInvoiceTypeRequestSchema = z.object({
  orderIds: z.array(z.string()).min(1, '最低1つの注文を選択してください'),
  newInvoiceType: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A'], {
    errorMap: () => ({ message: '無効な送り状種類です' }),
  }),
  skipCarrierDelete: z.boolean().optional().default(false), // 運送会社API削除をスキップしてローカル操作のみ実行
});

/**
 * 注文分割リクエストスキーマ
 * splitGroups: 分割グループの配列。各グループが1つの新注文になる。
 */
export const splitOrderRequestSchema = z.object({
  orderId: z.string().min(1, '注文IDは必須です'),
  splitGroups: z.array(
    z.object({
      products: z.array(
        z.object({
          productIndex: z.number().int().min(0, '商品インデックスは0以上である必要があります'),
          quantity: z.number().int().min(1, '数量は1以上である必要があります'),
        })
      ).min(1, '各グループには最低1つの商品が必要です'),
    })
  ).min(2, '分割するには最低2つのグループが必要です'),
  skipCarrierDelete: z.boolean().optional().default(false),
});
