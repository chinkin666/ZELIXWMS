/**
 * 佐川急便 内置配送業者定义 / 佐川急便 組み込み配送業者定義
 *
 * 佐川急便 e飛伝II/III 格式定义。
 * 佐川急便 e飛伝II/III フォーマット定義。
 */

import type { ICarrier } from '../models/carrier';

const BUILT_IN_CREATED_AT = new Date('2024-01-01T00:00:00Z');

/**
 * 佐川急便 送り状種類定義 / 佐川急便 送り状種類定義
 */
export const SAGAWA_INVOICE_TYPES = [
  { invoiceType: '0', name: '元払い' },
  { invoiceType: '1', name: '着払い' },
  { invoiceType: '2', name: 'e-コレクト（代引き）' },
] as const;

/**
 * 佐川急便 e飛伝 内置配送業者 / 佐川急便 e飛伝 組み込み配送業者
 */
export const SAGAWA_CARRIER: ICarrier = {
  _id: '__builtin_sagawa__' as any,
  code: 'sagawa',
  name: '佐川急便 e飛伝',
  description: '佐川急便 e飛伝II/III CSV連携',
  enabled: true,
  isBuiltIn: true,
  automationType: 'sagawa',
  trackingIdColumnName: 'お問い合せ送り状No.',
  createdAt: BUILT_IN_CREATED_AT,
  updatedAt: BUILT_IN_CREATED_AT,
  formatDefinition: {
    columns: [
      // ── 基本情報 ──
      { name: 'お客様管理番号', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '送り状種類', type: 'string', maxWidth: 1, required: true, userUploadable: true, description: '0:元払い/1:着払い/2:e-コレクト' },
      { name: '出荷日', type: 'string', maxWidth: 10, required: true, userUploadable: true, description: 'YYYY/MM/DD' },
      { name: 'お届け指定日', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: 'YYYY/MM/DD' },
      { name: '配達時間帯', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: '午前中/12-14/14-16/16-18/18-21/19-21/18-20/20-21' },
      // ── お届け先情報 ──
      { name: 'お届け先電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'お届け先郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'お届け先住所1', type: 'string', maxWidth: 30, required: true, userUploadable: true, description: '都道府県+市区町村（全角15文字）' },
      { name: 'お届け先住所2', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '町・番地（全角15文字）' },
      { name: 'お届け先住所3', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: 'マンション名等（全角15文字）' },
      { name: 'お届け先名称1', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角16文字' },
      { name: 'お届け先名称2', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角16文字（部門名等）' },
      // ── ご依頼主情報 ──
      { name: 'ご依頼主電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'ご依頼主郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'ご依頼主住所1', type: 'string', maxWidth: 30, required: true, userUploadable: true, description: '都道府県+市区町村' },
      { name: 'ご依頼主住所2', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '町・番地' },
      { name: 'ご依頼主名称1', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角16文字' },
      { name: 'ご依頼主名称2', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角16文字' },
      // ── 品名・荷物情報 ──
      { name: '品名1', type: 'string', maxWidth: 50, required: true, userUploadable: true, description: '全角25文字' },
      { name: '品名2', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角25文字' },
      { name: '荷物個数', type: 'string', maxWidth: 3, required: false, userUploadable: true, description: '半角数字3文字' },
      { name: '荷物サイズ', type: 'string', maxWidth: 3, required: false, userUploadable: true, description: '60/80/100/140/160/170' },
      // ── 代引き（e-コレクト） ──
      { name: 'e-コレクト代引金額', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字（e-コレクト時必須）' },
      { name: 'e-コレクト内税額', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字（e-コレクト時必須）' },
      // ── 追跡・管理 ──
      { name: 'お問い合せ送り状No.', type: 'string', maxWidth: 12, required: false, userUploadable: false, description: '佐川付与（出力専用）' },
      { name: '出荷個口No.', type: 'string', maxWidth: 3, required: false, userUploadable: false, description: '複数口時の個口番号' },
      // ── 請求情報 ──
      { name: '請求先コード', type: 'string', maxWidth: 12, required: false, userUploadable: true, description: '半角英数字12文字' },
      { name: '元着区分コード', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '1:元払い/2:着払い' },
    ],
  },
};
