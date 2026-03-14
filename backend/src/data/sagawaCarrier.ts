/**
 * 佐川急便 内置配送業者定义 / 佐川急便 組み込み配送業者定義
 *
 * 佐川急便 e飛伝Ⅲ 格式定义。
 * 佐川急便 e飛伝Ⅲ フォーマット定義。
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
 * 佐川急便 e飛伝Ⅲ 内置配送業者 / 佐川急便 e飛伝Ⅲ 組み込み配送業者
 */
export const SAGAWA_CARRIER: ICarrier = {
  _id: '__builtin_sagawa__' as any,
  code: 'sagawa',
  name: '佐川急便 e飛伝Ⅲ',
  description: '佐川急便 e飛伝Ⅲ CSV連携',
  enabled: true,
  isBuiltIn: true,
  automationType: 'sagawa',
  trackingIdColumnName: 'お問い合せ送り状No.',
  createdAt: BUILT_IN_CREATED_AT,
  updatedAt: BUILT_IN_CREATED_AT,
  formatDefinition: {
    columns: [
      // ── お届け先情報（1-9）──
      { name: 'お届け先コード取得区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:なし/1:コードから取得' },
      { name: 'お届け先コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: 'お届け先電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'お届け先郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'お届け先住所１', type: 'string', maxWidth: 30, required: true, userUploadable: true, description: '都道府県+市区町村' },
      { name: 'お届け先住所２', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '町・番地' },
      { name: 'お届け先住所３', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: 'マンション名等' },
      { name: 'お届け先名称１', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角16文字' },
      { name: 'お届け先名称２', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '部門名等' },
      // ── お客様管理番号（10-11）──
      { name: 'お客様管理番号', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: 'お客様コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      // ── 部署ご担当者（12-14）──
      { name: '部署ご担当者コード取得区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:なし/1:コードから取得' },
      { name: '部署ご担当者コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '' },
      { name: '部署ご担当者名称', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      // ── 荷送人・ご依頼主（15-23）──
      { name: '荷送人電話番号', type: 'string', maxWidth: 15, required: false, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'ご依頼主コード取得区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:なし/1:コードから取得' },
      { name: 'ご依頼主コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '' },
      { name: 'ご依頼主電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'ご依頼主郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字ハイフン可' },
      { name: 'ご依頼主住所１', type: 'string', maxWidth: 30, required: true, userUploadable: true, description: '都道府県+市区町村' },
      { name: 'ご依頼主住所２', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '町・番地' },
      { name: 'ご依頼主名称１', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角16文字' },
      { name: 'ご依頼主名称２', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      // ── 荷姿・品名（24-35）──
      { name: '荷姿', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '箱類/封筒等' },
      { name: '品名１', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角16文字' },
      { name: '品名２', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '品名３', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '品名４', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '品名５', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札荷姿', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '' },
      { name: '荷札品名１', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名２', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名３', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名４', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名５', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名６', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名７', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名８', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名９', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名１０', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      { name: '荷札品名１１', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '' },
      // ── 出荷・配送指定（42-47）──
      { name: '出荷個数', type: 'string', maxWidth: 3, required: false, userUploadable: true, description: '半角数字' },
      { name: 'スピード指定', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      { name: 'クール便指定', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:通常/1:冷凍/2:冷蔵' },
      { name: '配達日', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: 'YYYY/MM/DD' },
      { name: '配達指定時間帯', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '午前中/12-14/14-16/16-18/18-20/18-21/19-21/20-21' },
      { name: '配達指定時間（時分）', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: 'HHMM' },
      // ── 代引・保険（48-51）──
      { name: '代引金額', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字（e-コレクト時必須）' },
      { name: '消費税', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字' },
      { name: '決済種別', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      { name: '保険金額', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '' },
      // ── 指定シール・営業所受取（52-57）──
      { name: '指定シール１', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '' },
      { name: '指定シール２', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '' },
      { name: '指定シール３', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '' },
      { name: '営業所受取', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      { name: 'SRC区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      { name: '営業所受取営業所コード', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '' },
      // ── 元着・連絡先・出荷日（58-61）──
      { name: '元着区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '1:元払い/2:着払い' },
      { name: 'メールアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '' },
      { name: 'ご不在時連絡先', type: 'string', maxWidth: 15, required: false, userUploadable: true, description: '' },
      { name: '出荷日', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: 'YYYY/MM/DD' },
      // ── 追跡・出荷場（62-64）──
      { name: 'お問い合せ送り状No.', type: 'string', maxWidth: 12, required: false, userUploadable: false, description: '佐川付与（出力専用）' },
      { name: '出荷場印字区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      { name: '集約解除指定', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '' },
      // ── 編集フィールド（65-74）──
      { name: '編集０１', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０２', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０３', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０４', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０５', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０６', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０７', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０８', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集０９', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
      { name: '編集１０', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '自由項目' },
    ],
  },
};
