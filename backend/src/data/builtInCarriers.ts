import type { ICarrier } from '../models/carrier';

/**
 * 内置配送会社的创建时间（固定值）
 */
const BUILT_IN_CREATED_AT = new Date('2024-01-01T00:00:00Z');

/**
 * Yamato B2 送り状種類定義
 */
export const YAMATO_B2_INVOICE_TYPES = [
  { invoiceType: '0', name: '発払い' },
  { invoiceType: '1', name: 'EAZY' },
  { invoiceType: '2', name: 'コレクト' },
  { invoiceType: '3', name: 'クロネコゆうメール（DM便）' },
  { invoiceType: '4', name: 'タイム' },
  { invoiceType: '5', name: '着払い' },
  { invoiceType: '6', name: '発払い複数口' },
  { invoiceType: '7', name: 'クロネコゆうパケット' },
  { invoiceType: '8', name: '宅急便コンパクト' },
  { invoiceType: '9', name: 'コンパクトコレクト' },
  { invoiceType: 'A', name: 'ネコポス' },
] as const;

/**
 * Yamato B2 Cloud 内置配送会社
 * 不存在于数据库，在代码中固定定义
 */
export const YAMATO_B2_CARRIER: ICarrier = {
  _id: '__builtin_yamato_b2__' as any,
  code: 'yamato_b2',
  name: 'ヤマト運輸 B2 Cloud',
  description: 'ヤマト運輸 B2 Cloud 自動連携',
  enabled: true,
  isBuiltIn: true,
  automationType: 'yamato-b2',
  trackingIdColumnName: '伝票番号',
  createdAt: BUILT_IN_CREATED_AT,
  updatedAt: BUILT_IN_CREATED_AT,
  formatDefinition: {
    columns: [
      { name: 'お客様管理番号', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '半角英数字50文字' },
      { name: '送り状種類', type: 'string', maxWidth: 1, required: true, userUploadable: true, description: '0:発払い 1:EAZY 2:コレクト 3:クロネコゆうメール 4:タイム 5:着払い 6:発払い（複数口） 7:クロネコゆうパケット 8:宅急便コンパクト 9:宅急便コンパクトコレクト A:ネコポス' },
      { name: 'クール区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:通常 1:冷凍 2:冷蔵' },
      { name: '伝票番号', type: 'string', maxWidth: 12, required: false, userUploadable: false, description: 'B2クラウドにて付与' },
      { name: '出荷予定日', type: 'string', maxWidth: 10, required: true, userUploadable: true, description: 'YYYY/MM/DD' },
      { name: 'お届け予定日', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: 'YYYY/MM/DD または 最短日' },
      { name: '配達時間帯', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: '0812:午前中 1416:14-16時 1618:16-18時 1820:18-20時 1921:19-21時' },
      { name: 'お届け先コード', type: 'string', maxWidth: 20, required: false, userUploadable: true },
      { name: 'お届け先電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true },
      { name: 'お届け先電話番号枝番', type: 'string', maxWidth: 2, required: false, userUploadable: true },
      { name: 'お届け先郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: 'ハイフンなし7文字も可' },
      { name: 'お届け先住所', type: 'string', maxWidth: 64, required: true, userUploadable: true, description: '都道府県+市区郡町村+町・番地' },
      { name: 'お届け先アパートマンション名', type: 'string', maxWidth: 32, required: false, userUploadable: true },
      { name: 'お届け先会社・部門１', type: 'string', maxWidth: 50, required: false, userUploadable: true },
      { name: 'お届け先会社・部門２', type: 'string', maxWidth: 50, required: false, userUploadable: true },
      { name: 'お届け先名', type: 'string', maxWidth: 32, required: true, userUploadable: true },
      { name: 'お届け先名(ｶﾅ)', type: 'string', maxWidth: 50, required: false, userUploadable: true },
      { name: '敬称', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: '様・御中・殿・行・係・宛・先生・なし' },
      { name: 'ご依頼主コード', type: 'string', maxWidth: 20, required: false, userUploadable: true },
      { name: 'ご依頼主電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true },
      { name: 'ご依頼主電話番号枝番', type: 'string', maxWidth: 2, required: false, userUploadable: true },
      { name: 'ご依頼主郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true },
      { name: 'ご依頼主住所', type: 'string', maxWidth: 64, required: true, userUploadable: true },
      { name: 'ご依頼主アパートマンション', type: 'string', maxWidth: 32, required: false, userUploadable: true },
      { name: 'ご依頼主名', type: 'string', maxWidth: 32, required: true, userUploadable: true },
      { name: 'ご依頼主名(ｶﾅ)', type: 'string', maxWidth: 50, required: false, userUploadable: true },
      { name: '品名コード１', type: 'string', maxWidth: 30, required: false, userUploadable: true },
      { name: '品名１', type: 'string', maxWidth: 50, required: true, userUploadable: true },
      { name: '品名コード２', type: 'string', maxWidth: 30, required: false, userUploadable: true },
      { name: '品名２', type: 'string', maxWidth: 50, required: false, userUploadable: true },
      { name: '荷扱い１', type: 'string', maxWidth: 20, required: false, userUploadable: true },
      { name: '荷扱い２', type: 'string', maxWidth: 20, required: false, userUploadable: true },
      { name: '記事', type: 'string', maxWidth: 44, required: false, userUploadable: true },
      { name: 'ｺﾚｸﾄ代金引換額（税込)', type: 'number', maxWidth: 7, required: false, userUploadable: true, description: 'コレクトの場合は必須' },
      { name: '内消費税額等', type: 'number', maxWidth: 7, required: false, userUploadable: true },
      { name: '止置き', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '0:利用しない 1:利用する' },
      { name: '営業所コード', type: 'string', maxWidth: 6, required: false, userUploadable: true },
      { name: '発行枚数', type: 'number', maxWidth: 2, required: false, userUploadable: true },
      { name: '個数口表示フラグ', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '1:印字する 2:印字しない 3:枠と口数を印字する' },
      { name: '請求先顧客コード', type: 'string', maxWidth: 12, required: true, userUploadable: true },
      { name: '請求先分類コード', type: 'string', maxWidth: 3, required: false, userUploadable: true },
      { name: '運賃管理番号', type: 'string', maxWidth: 2, required: true, userUploadable: true },
    ],
  },
};

/**
 * 所有内置配送会社列表
 */
export const BUILT_IN_CARRIERS: ICarrier[] = [
  YAMATO_B2_CARRIER,
];

/**
 * 内置配送会社ID前缀
 */
export const BUILT_IN_CARRIER_PREFIX = '__builtin_';

/**
 * 检查是否为内置配送会社ID
 */
export function isBuiltInCarrierId(carrierId: string | undefined | null): boolean {
  if (!carrierId) return false;
  return String(carrierId).startsWith(BUILT_IN_CARRIER_PREFIX);
}

/**
 * 获取内置配送会社
 */
export function getBuiltInCarrier(carrierId: string): ICarrier | undefined {
  return BUILT_IN_CARRIERS.find((c) => String(c._id) === carrierId);
}

/**
 * 根据配送会社代码获取内置配送会社
 */
export function getBuiltInCarrierByCode(code: string): ICarrier | undefined {
  return BUILT_IN_CARRIERS.find((c) => c.code === code);
}
