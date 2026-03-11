/**
 * ヤマト運輸B2格式定义
 * 从格式文件中提取的列定义，写死在代码中
 */

import type { IColumnConfig, ColumnDataType } from '@/models/carrier';
import { deriveYamatoSortCode } from '@/services/yamatoCalcService';

/**
 * 解析列类型
 * 根据描述文本推断数据类型
 */
function parseColumnType(description: string): ColumnDataType {
  const desc = description.toLowerCase();
  
  // 日期类型
  if (desc.includes('日付') || desc.includes('yyyy/mm/dd') || desc.includes('yyyy') || desc.includes('mm/dd')) {
    return 'date';
  }
  
  // 数字类型
  if (desc.includes('数字') && !desc.includes('英数字')) {
    return 'number';
  }
  
  // 布尔类型（区分、フラグ等）
  if (desc.includes('フラグ') || desc.includes('区分') || (desc.includes('利用') && desc.includes('しない'))) {
    return 'boolean';
  }
  
  // 默认字符串类型
  return 'string';
}

/**
 * 解析最大字符宽度
 * 从描述中提取字符数量限制
 * 全角字符算2个字符宽度，半角字符算1个字符宽度
 */
function parseMaxWidth(description: string): number | undefined {
  // 匹配模式：全角/半角 XX文字/YY文字（取YY，半角的最大值）
  const fullHalfMatch = description.match(/全角\/半角\s*(\d+)文字\/(\d+)文字/);
  if (fullHalfMatch) {
    // 返回半角字符的最大数量（因为全角算2，半角算1，所以半角的最大数量就是最大宽度）
    return parseInt(fullHalfMatch[2], 10);
  }
  
  // 匹配：全角/半角 XX文字（全角字符数，需要乘以2）
  const fullHalfSingleMatch = description.match(/全角\/半角\s*(\d+)文字/);
  if (fullHalfSingleMatch) {
    return parseInt(fullHalfSingleMatch[1], 10) * 2;
  }
  
  // 匹配：半角XX文字
  const halfMatch = description.match(/半角(\d+)文字/);
  if (halfMatch) {
    return parseInt(halfMatch[1], 10);
  }
  
  // 匹配：全角XX文字（需要乘以2）
  const fullMatch = description.match(/全角\s*(\d+)文字/);
  if (fullMatch) {
    return parseInt(fullMatch[1], 10) * 2;
  }
  
  // 匹配：XX文字（通用，假设是半角）
  const genericMatch = description.match(/(\d+)文字/);
  if (genericMatch) {
    return parseInt(genericMatch[1], 10);
  }
  
  // 匹配：XX～YY文字（取最大值）
  const rangeMatch = description.match(/(\d+)～(\d+)文字/);
  if (rangeMatch) {
    return parseInt(rangeMatch[2], 10);
  }
  
  return undefined;
}

/**
 * 创建列配置
 */
function createColumn(
  name: string,
  description: string,
  required: boolean = false,
  userUploadable: boolean = true,
): IColumnConfig {
  return {
    name,
    description,
    type: parseColumnType(description),
    maxWidth: parseMaxWidth(description),
    required,
    userUploadable,
  };
}

/**
 * ヤマト運輸B2格式定义 - 所有列配置
 */
export const yamatoB2Columns: IColumnConfig[] = [
  // 第2行
  createColumn('お客様管理番号', '半角英数字50文字'),
  
  // 第3行
  createColumn(
    '送り状種類',
    '半角英数字1文字\n 0 : 発払い\n 1 : ＥＡＺＹ\n 2 : コレクト\n 3 : クロネコゆうメール\n 4 : タイム\n 5 : 着払い\n 6 : 発払い（複数口）\n 7 : クロネコゆうパケット\n 8 : 宅急便コンパクト\n 9 : 宅急便コンパクトコレクト\n A : ネコポス\n\n(※宅急便_必須項目)\n(※クロネコゆうメール_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第4行
  createColumn(
    'クール区分',
    '半角数字1文字\n 0または空白 : 通常\n 1 : クール冷凍\n 2 : クール冷蔵\n\n※「0:発払い」、「2:コレクト」、「5:着払い」のみ、ご利用頂けます。上記以外の送り状の場合、空白扱いで取り込みます。',
  ),
  
  // 第5行
  createColumn(
    '伝票番号',
    '半角数字12文字\n\n※B2クラウドにて付与',
    false,
    false, // 上传后系统回传
  ),
  
  // 第6行
  createColumn(
    '出荷予定日',
    '半角10文字\n｢YYYY/MM/DD｣で入力してください。\n\n(※宅急便_必須項目)\n(※クロネコゆうメール_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第7行
  createColumn(
    'お届け予定日',
    '半角10文字\n｢YYYY/MM/DD｣で入力してください。\n\n※入力なしの場合、印字されません。\n※「最短日」と入力可',
  ),
  
  // 第8行
  createColumn(
    '配達時間帯',
    '半角4文字\n発払・コレクト・着払・宅急便コンパクト・宅急便コンパクトコレクト・発払（複数口）　の場合\n 空白 : 指定なし\n 0812 : 午前中\n 1416 : 14～16時\n 1618 : 16～18時\n 1820 : 18～20時\n 1921 : 19～21時\n\nタイム\n 0010 : 午前10時まで\n 0017 : 午後5時まで',
  ),
  
  // 第9行
  createColumn('お届け先コード', '半角英数字20文字'),
  
  // 第10行
  createColumn(
    'お届け先電話番号',
    '半角数字15文字ハイフン含む\n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第11行
  createColumn('お届け先電話番号枝番', '半角数字2文字'),
  
  // 第12行
  createColumn(
    'お届け先郵便番号',
    '半角数字8文字\nハイフンなし7文字も可\n\n(※宅急便_必須項目)\n(※クロネコゆうメール_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第13行
  createColumn(
    'お届け先住所',
    '全角/半角\n都道府県（４文字）\n市区郡町村（１２文字）\n町・番地（１６文字）\n\n(※宅急便_必須項目)\n(※クロネコゆうメール_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第14行
  createColumn('お届け先アパートマンション名', '全角/半角 \n16文字/32文字'),
  
  // 第15行
  createColumn('お届け先会社・部門１', '全角/半角\n25文字/50文字'),
  
  // 第16行
  createColumn('お届け先会社・部門２', '全角/半角 \n25文字/50文字'),
  
  // 第17行
  createColumn(
    'お届け先名',
    '全角/半角\n16文字/32文字 \n\n(※宅急便_必須項目)\n(※クロネコゆうメール_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第18行
  createColumn('お届け先名(ｶﾅ)', '半角カタカナ 50文字'),
  
  // 第19行
  createColumn(
    '敬称',
    '全角/半角 2文字/4文字\nクロネコゆうメールの場合に指定可能\n【入力例】\n様・御中・殿・行・係・宛・先生・なし',
  ),
  
  // 第20行
  createColumn('ご依頼主コード', '半角英数字 20文字'),
  
  // 第21行
  createColumn(
    'ご依頼主電話番号',
    '半角数字15文字ハイフン含む\n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第22行
  createColumn('ご依頼主電話番号枝番', '半角数字 2文字'),
  
  // 第23行
  createColumn(
    'ご依頼主郵便番号',
    '半角数字8文字\nハイフンなし半角7文字も可 \n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第24行
  createColumn(
    'ご依頼主住所',
    '全角/半角32文字/64文字\n都道府県（４文字）\n市区郡町村（１２文字）\n町・番地（１６文字）\n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第25行
  createColumn('ご依頼主アパートマンション', '全角/半角 16文字/32文字'),
  
  // 第26行
  createColumn(
    'ご依頼主名',
    '全角/半角 16文字/32文字 \n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第27行
  createColumn('ご依頼主名(ｶﾅ)', '半角カタカナ50文字'),
  
  // 第28行
  createColumn('品名コード１', '半角英数字 30文字'),
  
  // 第29行
  createColumn(
    '品名１',
    '全角/半角 25文字/50文字 \n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第30行
  createColumn('品名コード２', '半角英数字 30文字'),
  
  // 第31行
  createColumn('品名２', '全角/半角 25文字/50文字'),
  
  // 第32行
  createColumn('荷扱い１', '全角/半角 10文字/20文字'),
  
  // 第33行
  createColumn('荷扱い２', '全角/半角 10文字/20文字'),
  
  // 第34行
  createColumn('記事', '全角/半角 22文字/44文字'),
  
  // 第35行
  createColumn(
    'ｺﾚｸﾄ代金引換額（税込)',
    '半角数字 7文字\n\n※コレクトの場合は必須\n300,000円以下　1円以上\n※但し、宅急便コンパクトコレクトの場合は\n30,000円以下　　1円以上',
  ),
  
  // 第36行
  createColumn(
    '内消費税額等',
    '半角数字 7文字\n\n※コレクトの場合は必須 \n※コレクト代金引換額（税込)以下',
  ),
  
  // 第37行
  createColumn('止置き', '半角数字 1文字\n 0 : 利用しない\n 1 : 利用する'),
  
  // 第38行
  createColumn('営業所コード', '半角数字 6文字\n\n※止置きを利用する場合は必須'),
  
  // 第39行
  createColumn(
    '発行枚数',
    '半角数字 2文字\n\n※発払い、ＥＡＺＹ、タイム、着払い、クロネコゆうパケット、発払い（複数口）、ネコポスのみ指定可能',
  ),
  
  // 第40行
  createColumn(
    '個数口表示フラグ',
    '半角数字 1文字\n 1 : 印字する\n 2 : 印字しない \n 3 : 枠と口数を印字する\n\n※宅急便コンパクト、宅急便コンパクトコレクトは対象外\n※複数口の場合、本項目の指定に関係なく、3 : 枠と口数を印字する扱いとする',
  ),
  
  // 第41行
  createColumn(
    '請求先顧客コード',
    '半角数字10～12文字\n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第42行
  createColumn('請求先分類コード', '空白または半角数字3文字'),
  
  // 第43行
  createColumn(
    '運賃管理番号',
    '半角数字2文字\n\n(※宅急便_必須項目)\n(※クロネコゆうパケット_必須項目)\n(※ネコポス_必須項目)',
    true,
  ),
  
  // 第44行
  createColumn('クロネコwebコレクトデータ登録', '半角数字 1文字\n 0 : 無し\n 1 : 有り'),
  
  // 第45行
  createColumn(
    'クロネコwebコレクト加盟店番号',
    '半角英数字 9文字 \n\n※クロネコwebコレクトデータ有りの場合は必須',
  ),
  
  // 第46行
  createColumn(
    'クロネコwebコレクト申込受付番号１',
    '半角英数字 23文字\n\n※クロネコwebコレクトデータ有りの場合は必須',
  ),
  
  // 第47行
  createColumn(
    'クロネコwebコレクト申込受付番号２',
    '半角英数字 23文字\n\n※発払い（複数口）の場合は、設定不可',
  ),
  
  // 第48行
  createColumn(
    'クロネコwebコレクト申込受付番号３',
    '半角英数字 23文字\n\n※発払い（複数口）の場合は、設定不可',
  ),
  
  // 第49行
  createColumn('お届け予定ｅメール利用区分', '半角数字 1文字\n 0 : 利用しない\n 1 : 利用する'),
  
  // 第50行
  createColumn(
    'お届け予定ｅメールe-mailアドレス',
    '半角英数字＆記号 60文字\n\n※お届け予定eメールを利用する場合は必須',
  ),
  
  // 第51行
  createColumn(
    '入力機種',
    '半角数字 1文字\n 1 : ＰＣ\n 2 : 携帯電話\n\n※お届け予定eメールを利用する場合は必須',
  ),
  
  // 第52行
  createColumn(
    'お届け予定ｅメールメッセージ',
    '全角 74文字\n\n\n※お届け予定eメールを利用する場合は必須',
  ),
  
  // 第53行
  createColumn('お届け完了ｅメール利用区分', '半角数字1文字\n 0 : 利用しない\n 1 : 利用する'),
  
  // 第54行
  createColumn(
    'お届け完了ｅメールe-mailアドレス',
    '半角英数字 60文字\n\n※お届け完了eメールを利用する場合は必須',
  ),
  
  // 第55行
  createColumn(
    'お届け完了ｅメールメッセージ',
    '全角 159文字 \n\n※お届け完了eメールを利用する場合は必須',
  ),
  
  // 第56行
  createColumn('クロネコ収納代行利用区分', '半角数字１文字\n 0 : 利用しない\n 1 : 利用する'),
  
  // 第57行
  createColumn('予備', '半角数字１文字'),
  
  // 第58行
  createColumn('収納代行請求金額(税込)', '半角数字７文字'),
  
  // 第59行
  createColumn('収納代行内消費税額等', '半角数字７文字'),
  
  // 第60行
  createColumn('収納代行請求先郵便番号', '半角数字＆ハイフン8文字\nハイフンなし半角7文字も可'),
  
  // 第61行
  createColumn(
    '収納代行請求先住所',
    '全角/半角　32文字/64文字\n都道府県（４文字）\n市区郡町村（１２文字）\n町・番地（１６文字）',
  ),
  
  // 第62行
  createColumn('収納代行請求先住所（アパートマンション名）', '全角/半角　16文字/32文字'),
  
  // 第63行
  createColumn('収納代行請求先会社・部門名１', '全角/半角　25文字/50文字'),
  
  // 第64行
  createColumn('収納代行請求先会社・部門名２', '全角/半角　25文字/50文字'),
  
  // 第65行
  createColumn('収納代行請求先名(漢字)', '全角/半角　16文字/32文字'),
  
  // 第66行
  createColumn('収納代行請求先名(カナ)', '半角カタカナ50文字'),
  
  // 第67行
  createColumn('収納代行問合せ先名(漢字)', '全角/半角　16文字/32文字'),
  
  // 第68行
  createColumn('収納代行問合せ先郵便番号', '半角数字＆ハイフン8文字\nハイフンなし半角7文字も可'),
  
  // 第69行
  createColumn(
    '収納代行問合せ先住所',
    '全角/半角　32文字/64文字\n都道府県（４文字）\n市区郡町村（１２文字）\n町・番地（１６文字）',
  ),
  
  // 第70行
  createColumn('収納代行問合せ先住所（アパートマンション名）', '全角/半角　16文字/32文字'),
  
  // 第71行
  createColumn('収納代行問合せ先電話番号', '半角数字＆ハイフン15文字'),
  
  // 第72行
  createColumn('収納代行管理番号', '半角英数字20文字'),
  
  // 第73行
  createColumn('収納代行品名', '全角/半角　25文字/50文字'),
  
  // 第74行
  createColumn('収納代行備考', '全角/半角　14文字/28文字'),
  
  // 第75行
  createColumn(
    '複数口くくりキー',
    '半角英数字20文字\n\n※「出荷予定個数」が2以上で「個数口枠の印字」で 「3 : 枠と口数を印字する」を選択し、且つ「複数口くくりキー」が空白の場合は、送り状発行時に「B2」という文言を自動補完する。\n※送り状種類6：発払い（複数口）を選択時、お届け日時とお届け先が同じ荷物に対し、同一の複数口くくりキーを設定してください。1度のデータ取込で、異なるお届け日時・お届け先に対して同一の複数口くくりキーは使用できません。なお、発払い（複数口）に限り、データ取込後に複数口くくりキーは親伝票番号（数字12桁）に置き換わります。',
  ),
  
  // 第76行
  createColumn('検索キータイトル1', '全角/半角 \n10文字/20文字'),
  
  // 第77行
  createColumn('検索キー1', '半角英数字\n20文字'),
  
  // 第78行
  createColumn('検索キータイトル2', '全角/半角 \n10文字/20文字'),
  
  // 第79行
  createColumn('検索キー2', '半角英数字\n20文字'),
  
  // 第80行
  createColumn('検索キータイトル3', '全角/半角 \n10文字/20文字'),
  
  // 第81行
  createColumn('検索キー3', '半角英数字\n20文字'),
  
  // 第82行
  createColumn('検索キータイトル4', '全角/半角 \n10文字/20文字'),
  
  // 第83行
  createColumn('検索キー4', '半角英数字\n20文字'),
  
  // 第84行
  createColumn(
    '検索キータイトル5',
    '\n※入力時は不要。出力時に自動反映。\n※「ユーザーID」という文言を送り状発行時に固定で自動補完する。',
    false,
    false, // 系统自动补完，用户不需要上传
  ),
  
  // 第85行
  createColumn(
    '検索キー5',
    '\n※入力時は不要。出力時に自動反映。\n※送り状発行時のユーザーIDを固定で自動補完する。',
    false,
    false, // 系统自动补完，用户不需要上传
  ),
  
  // 第86行
  createColumn('予備', ''),
  
  // 第87行
  createColumn(
    '投函予定メール利用区分',
    '半角数字\n1文字\n 0 : 利用しない\n 1 : 利用する PC宛て\n 2 : 利用する モバイル宛て',
  ),
  
  // 第88行
  createColumn('投函予定メールe-mailアドレス', '半角英数字＆記号\n60文字'),
  
  // 第89行
  createColumn(
    '投函予定メールメッセージ',
    '全角/半角\n74文字/148文字\n\n※半角カタカナ及び半角スペースは使えません。',
  ),
  
  // 第90行
  createColumn(
    '投函完了メール（お届け先宛）利用区分',
    '半角数字\n1文字\n 0 : 利用しない\n 1 : 利用する PC宛て\n 2 : 利用する モバイル宛て',
  ),
  
  // 第91行
  createColumn('投函完了メール（お届け先宛）e-mailアドレス', '半角英数字＆記号\n60文字'),
  
  // 第92行
  createColumn(
    '投函完了メール（お届け先宛）メールメッセージ',
    '全角/半角\n159文字/318文字\n\n※半角カタカナ及び半角スペースは使えません。',
  ),
  
  // 第93行
  createColumn(
    '投函完了メール（ご依頼主宛）利用区分',
    '半角数字\n1文字\n 0 : 利用しない\n 1 : 利用する PC宛て\n 2 : 利用する モバイル宛て',
  ),
  
  // 第94行
  createColumn('投函完了メール（ご依頼主宛）e-mailアドレス', '半角英数字＆記号\n60文字'),
  
  // 第95行
  createColumn(
    '投函完了メール（ご依頼主宛）メールメッセージ',
    '全角/半角\n159文字/318文字\n\n※半角カタカナ及び半角スペースは使えません。',
  ),
  
  // 第96行
  createColumn(
    '置き場所コード',
    '半角数字 2文字\n\n 空白：対面での配達を希望\n 00　：対面での配達を希望\n 01　：玄関ドア前\n 02　：自宅宅配BOX\n 03　：ガスメーターBOX\n 04　：物置\n 05　：車庫\n 06　：自転車かご\n 07　：建物内受付／管理人預け\n※ＥＡＺＹのみ指定可能',
  ),
];

/**
 * B2 API レスポンスのキーを日本語のカラム名にマッピングする定義
 * carriers.json の formatDefinition.columns と互換性を持つ
 */
export const b2ApiToJapaneseKeyMapping: Record<string, string> = {
  // 基本情報
  shipment_number: 'お客様管理番号',
  service_type: '送り状種類',
  is_cool: 'クール区分',
  tracking_number: '伝票番号',
  shipment_date: '出荷予定日',
  delivery_date: 'お届け予定日',
  delivery_time_zone: '配達時間帯',

  // お届け先情報
  consignee_code: 'お届け先コード',
  consignee_telephone: 'お届け先電話番号',
  consignee_telephone_ext: 'お届け先電話番号枝番',
  consignee_zip_code: 'お届け先郵便番号',
  // consignee_address は address1-4 を結合して生成
  consignee_name: 'お届け先名',
  consignee_name_kana: 'お届け先名(ｶﾅ)',
  consignee_title: '敬称',
  consignee_department1: 'お届け先会社・部門１',
  consignee_department2: 'お届け先会社・部門２',

  // ご依頼主情報
  shipper_code: 'ご依頼主コード',
  shipper_telephone: 'ご依頼主電話番号',
  shipper_telephone_ext: 'ご依頼主電話番号枝番',
  shipper_zip_code: 'ご依頼主郵便番号',
  // shipper_address は address1-4 を結合して生成
  shipper_name: 'ご依頼主名',
  shipper_name_kana: 'ご依頼主名(ｶﾅ)',

  // 品名情報
  item_code1: '品名コード１',
  item_name1: '品名１',
  item_code2: '品名コード２',
  item_name2: '品名２',

  // 荷扱い・記事
  handling_information1: '荷扱い１',
  handling_information2: '荷扱い２',
  note: '記事',

  // 請求・運賃情報
  customer_code: '請求先顧客コード',
  customer_code_ext: '請求先分類コード',
  invoice_freight_no: '運賃管理番号',

  // 検索キー
  search_key_title1: '検索キータイトル1',
  search_key1: '検索キー1',
  search_key_title2: '検索キータイトル2',
  search_key2: '検索キー2',
  search_key_title3: '検索キータイトル3',
  search_key3: '検索キー3',
  search_key_title4: '検索キータイトル4',
  search_key4: '検索キー4',
  search_key_title5: '検索キータイトル5',
  search_key5: '検索キー5',

  // 複数口
  closure_key: '複数口くくりキー',
  package_qty: '発行枚数',
  is_printing_lot: '個数口表示フラグ',

  // 営業所止め
  is_using_center_service: '止置き',
  consignee_center_code: '営業所コード',

  // EAZY
  // place_code は置き場所コードに対応
};

/**
 * 日付フォーマットを変換する (YYYYMMDD → YYYY/MM/DD)
 */
function formatDate(value: string): string {
  if (!value || value.trim() === '' || /^\s+$/.test(value)) {
    return '';
  }
  // YYYYMMDD 形式 (8桁の数字)
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)}`;
  }
  // 既に YYYY/MM/DD または YYYY-MM-DD 形式の場合はそのまま（スラッシュに統一）
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(value)) {
    return value.slice(0, 10).replace(/-/g, '/');
  }
  return value;
}

/**
 * B2 API レスポンスを日本語キーの carrierRawRow 形式に変換する
 *
 * @param apiResponse - B2 API からの shipment オブジェクト
 * @returns 日本語キーに変換された Record<string, string>
 */
export function convertB2ApiToCarrierRawRow(apiResponse: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};

  // 基本マッピング
  for (const [apiKey, japaneseKey] of Object.entries(b2ApiToJapaneseKeyMapping)) {
    const value = apiResponse[apiKey];
    if (value !== undefined && value !== null) {
      let strValue = String(value).trim();

      // 日付フィールドの変換
      if (apiKey === 'shipment_date' || apiKey === 'delivery_date') {
        strValue = formatDate(strValue);
      }

      // 空文字でない場合のみ設定
      if (strValue !== '') {
        result[japaneseKey] = strValue;
      }
    }
  }

  // お届け先住所: address1-4 を結合
  const consigneeAddress = [
    apiResponse.consignee_address1,
    apiResponse.consignee_address2,
    apiResponse.consignee_address3,
  ].filter(Boolean).map(s => String(s).trim()).join('');

  if (consigneeAddress) {
    result['お届け先住所'] = consigneeAddress;
  }

  // お届け先アパートマンション名 (address4)
  if (apiResponse.consignee_address4 && String(apiResponse.consignee_address4).trim()) {
    result['お届け先アパートマンション名'] = String(apiResponse.consignee_address4).trim();
  }

  // ご依頼主住所: address1-4 を結合
  const shipperAddress = [
    apiResponse.shipper_address1,
    apiResponse.shipper_address2,
    apiResponse.shipper_address3,
  ].filter(Boolean).map(s => String(s).trim()).join('');

  if (shipperAddress) {
    result['ご依頼主住所'] = shipperAddress;
  }

  // ご依頼主アパートマンション (address4)
  if (apiResponse.shipper_address4 && String(apiResponse.shipper_address4).trim()) {
    result['ご依頼主アパートマンション'] = String(apiResponse.shipper_address4).trim();
  }

  // 仕分けコード: sorting_code を 6桁に変換（7桁の先頭を除去）
  if (apiResponse.sorting_code) {
    const sortingCode = deriveYamatoSortCode(apiResponse.sorting_code);
    if (sortingCode) {
      result['仕分けコード'] = sortingCode;
    }
  }

  return result;
}

