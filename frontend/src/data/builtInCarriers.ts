import type { Carrier } from '@/types/carrier'

/**
 * Yamato B2 Cloud 内置配送業者
 * 这个配送業者不存在于数据库，只在前端定义
 */
export const YAMATO_B2_CARRIER: Carrier = {
  _id: '__builtin_yamato_b2__',
  code: 'yamato_b2',
  name: 'ヤマト運輸 B2 Cloud',
  description: 'ヤマト運輸 B2 Cloud 自動連携',
  enabled: true,
  isBuiltIn: true,
  automationType: 'yamato-b2',
  trackingIdColumnName: '伝票番号',
  formatDefinition: {
    columns: [
      // ── 基本情報 (1~7) ──
      { name: 'お客様管理番号', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '半角英数字50文字' },
      { name: '送り状種類', type: 'string', maxWidth: 1, required: true, userUploadable: true, description: '半角英数字1文字（0:発払い,1:EAZY,2:コレクト,3:クロネコゆうメール,4:タイム,5:着払い,6:発払い（複数口）,7:クロネコゆうパケット,8:宅急便コンパクト,9:宅急便コンパクトコレクト,A:ネコポス）' },
      { name: 'クール区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0/空白:通常,1:冷凍,2:冷蔵）' },
      { name: '伝票番号', type: 'string', maxWidth: 12, required: false, userUploadable: false, description: '半角数字12文字（B2クラウド付与）' },
      { name: '出荷予定日', type: 'string', maxWidth: 10, required: true, userUploadable: true, description: '半角10文字（YYYY/MM/DD）' },
      { name: 'お届け予定日', type: 'string', maxWidth: 10, required: false, userUploadable: true, description: '半角10文字（YYYY/MM/DD、未指定可、「最短日」可）' },
      { name: '配達時間帯', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: '半角4文字（0812午前/1416 14-16/1618 16-18/1820 18-20/1921 19-21, タイム:0010/0017）' },
      // ── お届け先情報 (8~18) ──
      { name: 'お届け先コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: 'お届け先電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字15文字（ハイフン可）' },
      { name: 'お届け先電話番号枝番', type: 'string', maxWidth: 2, required: false, userUploadable: true, description: '半角数字2文字' },
      { name: 'お届け先郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字8文字（7文字ハイフン無も可）' },
      { name: 'お届け先住所', type: 'string', maxWidth: 64, required: true, userUploadable: true, description: '全角/半角 都道府県4＋市区郡町村12＋町・番地16（合計最大64半角幅）' },
      { name: 'お届け先アパートマンション名', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: 'お届け先会社・部門１', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: 'お届け先会社・部門２', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: 'お届け先名', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: 'お届け先名(ｶﾅ)', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '半角カタカナ50文字' },
      { name: '敬称', type: 'string', maxWidth: 4, required: false, userUploadable: true, description: '全角/半角 2文字/4文字（様/御中/殿/行/係/宛/先生/なし）' },
      // ── ご依頼主情報 (19~26) ──
      { name: 'ご依頼主コード', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: 'ご依頼主電話番号', type: 'string', maxWidth: 15, required: true, userUploadable: true, description: '半角数字15文字（ハイフン可）' },
      { name: 'ご依頼主電話番号枝番', type: 'string', maxWidth: 2, required: false, userUploadable: true, description: '半角数字2文字' },
      { name: 'ご依頼主郵便番号', type: 'string', maxWidth: 8, required: true, userUploadable: true, description: '半角数字8文字（7文字ハイフン無も可）' },
      { name: 'ご依頼主住所', type: 'string', maxWidth: 64, required: true, userUploadable: true, description: '全角/半角 32文字/64文字（都道府県4＋市区郡町村12＋町・番地16）' },
      { name: 'ご依頼主アパートマンション', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: 'ご依頼主名', type: 'string', maxWidth: 32, required: true, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: 'ご依頼主名(ｶﾅ)', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '半角カタカナ50文字' },
      // ── 品名・荷扱い (27~33) ──
      { name: '品名コード１', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '半角英数字30文字' },
      { name: '品名１', type: 'string', maxWidth: 50, required: true, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: '品名コード２', type: 'string', maxWidth: 30, required: false, userUploadable: true, description: '半角英数字30文字' },
      { name: '品名２', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: '荷扱い１', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '荷扱い２', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '記事', type: 'string', maxWidth: 44, required: false, userUploadable: true, description: '全角/半角 22文字/44文字' },
      // ── コレクト・止置き・請求 (34~42) ──
      { name: 'ｺﾚｸﾄ代金引換額（税込)', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字7文字（コレクト時必須）' },
      { name: '内消費税額等', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字7文字（コレクト時必須）' },
      { name: '止置き', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0:利用しない,1:利用する）' },
      { name: '営業所コード', type: 'string', maxWidth: 6, required: false, userUploadable: true, description: '半角数字6文字（止置き時必須）' },
      { name: '発行枚数', type: 'string', maxWidth: 2, required: false, userUploadable: true, description: '半角数字2文字（発払い/EAZY/タイム/着払い/ゆうパケット/複数口/ネコポスのみ）' },
      { name: '個数口表示フラグ', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（1印字/2印字しない/3枠と口数を印字）' },
      { name: '請求先顧客コード', type: 'string', maxWidth: 12, required: true, userUploadable: true, description: '半角数字10～12文字' },
      { name: '請求先分類コード', type: 'string', maxWidth: 3, required: false, userUploadable: true, description: '空白または半角数字3文字' },
      { name: '運賃管理番号', type: 'string', maxWidth: 2, required: true, userUploadable: true, description: '半角数字2文字' },
      // ── クロネコwebコレクト (43~47) ──
      { name: 'クロネコwebコレクトデータ登録', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0無し/1有り）' },
      { name: 'クロネコwebコレクト加盟店番号', type: 'string', maxWidth: 9, required: false, userUploadable: true, description: '半角英数字9文字（データ有り時必須）' },
      { name: 'クロネコwebコレクト申込受付番号１', type: 'string', maxWidth: 23, required: false, userUploadable: true, description: '半角英数字23文字（データ有り時必須）' },
      { name: 'クロネコwebコレクト申込受付番号２', type: 'string', maxWidth: 23, required: false, userUploadable: true, description: '半角英数字23文字（複数口では不可）' },
      { name: 'クロネコwebコレクト申込受付番号３', type: 'string', maxWidth: 23, required: false, userUploadable: true, description: '半角英数字23文字（複数口では不可）' },
      // ── お届け予定eメール (48~51) ──
      { name: 'お届け予定ｅメール利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1利用する）' },
      { name: 'お届け予定ｅメールe-mailアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '半角英数字＆記号60文字（利用時必須）' },
      { name: '入力機種', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（1:PC,2:携帯、利用時必須）' },
      { name: 'お届け予定ｅメールメッセージ', type: 'string', maxWidth: 148, required: false, userUploadable: true, description: '全角74文字（利用時必須）' },
      // ── お届け完了eメール (52~54) ──
      { name: 'お届け完了ｅメール利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1利用する）' },
      { name: 'お届け完了ｅメールe-mailアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '半角英数字60文字（利用時必須）' },
      { name: 'お届け完了ｅメールメッセージ', type: 'string', maxWidth: 318, required: false, userUploadable: true, description: '全角159文字（利用時必須）' },
      // ── クロネコ収納代行 (55~73) ──
      { name: 'クロネコ収納代行利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1利用する）' },
      { name: '予備', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字' },
      { name: '収納代行請求金額(税込)', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字7文字' },
      { name: '収納代行内消費税額等', type: 'string', maxWidth: 7, required: false, userUploadable: true, description: '半角数字7文字' },
      { name: '収納代行請求先郵便番号', type: 'string', maxWidth: 8, required: false, userUploadable: true, description: '半角数字＆ハイフン8文字（7文字ハイフン無も可）' },
      { name: '収納代行請求先住所', type: 'string', maxWidth: 64, required: false, userUploadable: true, description: '全角/半角 32文字/64文字（都道府県4＋市区郡町村12＋町・番地16）' },
      { name: '収納代行請求先住所（アパートマンション名）', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: '収納代行請求先会社・部門名１', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: '収納代行請求先会社・部門名２', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: '収納代行請求先名(漢字)', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: '収納代行請求先名(カナ)', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '半角カタカナ50文字' },
      { name: '収納代行問合せ先名(漢字)', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: '収納代行問合せ先郵便番号', type: 'string', maxWidth: 8, required: false, userUploadable: true, description: '半角数字＆ハイフン8文字（7文字ハイフン無も可）' },
      { name: '収納代行問合せ先住所', type: 'string', maxWidth: 64, required: false, userUploadable: true, description: '全角/半角 32文字/64文字（都道府県4＋市区郡町村12＋町・番地16）' },
      { name: '収納代行問合せ先住所（アパートマンション名）', type: 'string', maxWidth: 32, required: false, userUploadable: true, description: '全角/半角 16文字/32文字' },
      { name: '収納代行問合せ先電話番号', type: 'string', maxWidth: 15, required: false, userUploadable: true, description: '半角数字＆ハイフン15文字' },
      { name: '収納代行管理番号', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '収納代行品名', type: 'string', maxWidth: 50, required: false, userUploadable: true, description: '全角/半角 25文字/50文字' },
      { name: '収納代行備考', type: 'string', maxWidth: 28, required: false, userUploadable: true, description: '全角/半角 14文字/28文字' },
      // ── 複数口・検索キー (74~85) ──
      { name: '複数口くくりキー', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字（複数口時のキー、自動補完あり）' },
      { name: '検索キータイトル1', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '検索キー1', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '検索キータイトル2', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '検索キー2', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '検索キータイトル3', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '検索キー3', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '検索キータイトル4', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '全角/半角 10文字/20文字' },
      { name: '検索キー4', type: 'string', maxWidth: 20, required: false, userUploadable: true, description: '半角英数字20文字' },
      { name: '検索キータイトル5', type: 'string', required: false, userUploadable: false, description: '入力不要（出力時にユーザーIDを自動補完）' },
      { name: '検索キー5', type: 'string', required: false, userUploadable: false, description: '入力不要（出力時にユーザーIDを自動補完）' },
      { name: '予備(検索系)', type: 'string', required: false, userUploadable: true, description: '予備' },
      // ── 投函予定・完了メール (86~94) ──
      { name: '投函予定メール利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1PC宛て/2モバイル宛て）' },
      { name: '投函予定メールe-mailアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '半角英数字＆記号60文字' },
      { name: '投函予定メールメッセージ', type: 'string', maxWidth: 148, required: false, userUploadable: true, description: '全角/半角 74文字/148文字（半角カナ・半角スペース不可）' },
      { name: '投函完了メール（お届け先宛）利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1PC宛て/2モバイル宛て）' },
      { name: '投函完了メール（お届け先宛）e-mailアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '半角英数字＆記号60文字' },
      { name: '投函完了メール（お届け先宛）メールメッセージ', type: 'string', maxWidth: 318, required: false, userUploadable: true, description: '全角/半角 159文字/318文字（半角カナ・半角スペース不可）' },
      { name: '投函完了メール（ご依頼主宛）利用区分', type: 'string', maxWidth: 1, required: false, userUploadable: true, description: '半角数字1文字（0利用しない/1PC宛て/2モバイル宛て）' },
      { name: '投函完了メール（ご依頼主宛）e-mailアドレス', type: 'string', maxWidth: 60, required: false, userUploadable: true, description: '半角英数字＆記号60文字' },
      { name: '投函完了メール（ご依頼主宛）メールメッセージ', type: 'string', maxWidth: 318, required: false, userUploadable: true, description: '全角/半角 159文字/318文字（半角カナ・半角スペース不可）' },
      // ── EAZY置き場所 (95) ──
      { name: '置き場所コード', type: 'string', maxWidth: 2, required: false, userUploadable: true, description: '半角数字2文字（00対面/01玄関/02宅配BOX/03ガスメーターBOX/04物置/05車庫/06自転車かご/07受付・管理人預け、EAZYのみ）' },
    ],
  },
}

/**
 * 所有内置配送業者列表
 */
export const BUILT_IN_CARRIERS: Carrier[] = [
  YAMATO_B2_CARRIER,
]

/**
 * 检查是否为内置配送業者
 */
export function isBuiltInCarrier(carrierId: string): boolean {
  return BUILT_IN_CARRIERS.some((c) => c._id === carrierId)
}

/**
 * 获取内置配送業者
 */
export function getBuiltInCarrier(carrierId: string): Carrier | undefined {
  return BUILT_IN_CARRIERS.find((c) => c._id === carrierId)
}
