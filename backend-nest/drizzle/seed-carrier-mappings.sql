-- ============================================================================
-- 配送業者CSV フィールドマッピング シードデータ
-- 配送业者CSV 字段映射 种子数据
--
-- 対象テーブル / 目标表: mapping_configs
-- テナント / 租户: 開発用テナント / 开发租户 (00000000-0000-0000-0000-000000000001)
--
-- 仕様書参照 / 规格书参考:
--   carrier-format/nexand_出荷管理仕様書.md
--   carrier-format/0420配送業者別_出荷指示仕様書一覧.xlsx
-- ============================================================================

-- ============================================================================
-- 1. 佐川急便 e飛伝3 出荷指示エクスポート（出荷→CSV）
--    佐川急便 e飞传3 出货指示导出（出货→CSV）
-- ============================================================================
-- テンプレート形式: 標準_飛脚宅配便_CSV_ヘッダ無 (74列)
-- 模板格式: 标准_飞脚宅配便_CSV_无标题 (74列)
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'order-to-carrier',
  '佐川急便 e飛伝3 出荷指示エクスポート',
  '佐川急便 e飛伝3 CSV出力用マッピング（標準_飛脚宅配便_CSV_ヘッダ無形式、74列）/ 佐川急便 e飞传3 CSV输出映射（标准_飞脚宅配便_CSV_无标题格式，74列）',
  'sagawa',
  '[
    {"columnIndex": 0,  "targetField": "お届け先コード取得区分", "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 1,  "targetField": "お届け先コード",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 2,  "targetField": "お届け先電話番号",       "sourceField": "recipientPhone",            "required": true,  "note": "配送先電話番号 / 收件人电话"},
    {"columnIndex": 3,  "targetField": "お届け先郵便番号",       "sourceField": "recipientPostalCode",       "required": true,  "note": "配送先郵便番号 / 收件人邮编"},
    {"columnIndex": 4,  "targetField": "お届け先住所１",         "sourceField": "recipientAddress1",         "required": true,  "note": "最大32バイト / 最大32字节"},
    {"columnIndex": 5,  "targetField": "お届け先住所２",         "sourceField": "recipientAddress2",         "required": false, "note": "33バイト目～64バイト / 第33~64字节"},
    {"columnIndex": 6,  "targetField": "お届け先住所３",         "sourceField": "recipientAddress3",         "required": false, "note": "65バイト目以降 / 第65字节以后"},
    {"columnIndex": 7,  "targetField": "お届け先名称１",         "sourceField": "recipientName",             "required": true,  "note": "配送先名 / 收件人名"},
    {"columnIndex": 8,  "targetField": "お届け先名称２",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 9,  "targetField": "お客様管理ナンバー",     "sourceField": "orderNumber_deliveryNumber","required": true,  "note": "受注番号_配送番号 / 订单号_配送号 (orderNumber + ''_'' + deliveryNumber)"},
    {"columnIndex": 10, "targetField": "お客様コード",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 11, "targetField": "部署ご担当者コード取得区分","sourceField": null,                     "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 12, "targetField": "部署ご担当者コード",     "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 13, "targetField": "部署ご担当者名称",       "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 14, "targetField": "荷送人電話番号",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 15, "targetField": "ご依頼主コード取得区分", "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 16, "targetField": "ご依頼主コード",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 17, "targetField": "ご依頼主電話番号",       "sourceField": "senderPhone",               "required": true,  "note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话"},
    {"columnIndex": 18, "targetField": "ご依頼主郵便番号",       "sourceField": "senderPostalCode",          "required": true,  "note": "ギフト：注文者郵便番号 / 否则：店舗郵便番号 / 礼品:下单人邮编 / 否则:店铺邮编"},
    {"columnIndex": 19, "targetField": "ご依頼主住所１",         "sourceField": "senderAddress1",            "required": true,  "note": "最大32バイト / 最大32字节"},
    {"columnIndex": 20, "targetField": "ご依頼主住所２",         "sourceField": "senderAddress2",            "required": false, "note": "33バイト目以降 / 第33字节以后"},
    {"columnIndex": 21, "targetField": "ご依頼主名称１",         "sourceField": "senderName",                "required": true,  "note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名"},
    {"columnIndex": 22, "targetField": "ご依頼主名称２",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 23, "targetField": "荷姿",                   "sourceField": "packageTypeCode",           "required": false, "note": "001:箱類 002:バッグ 003:スーツケース 004:封筒 005:ゴルフ 006:スキー 007:スノボ 008:その他"},
    {"columnIndex": 24, "targetField": "品名１",                 "sourceField": "productName1",              "required": true,  "note": "品名（最大32バイト）/ 品名（最大32字节）"},
    {"columnIndex": 25, "targetField": "品名２",                 "sourceField": "productName2",              "required": false, "note": "品名オーバーフロー / 品名溢出（33~64バイト）"},
    {"columnIndex": 26, "targetField": "品名３",                 "sourceField": "productName3",              "required": false, "note": "品名オーバーフロー / 品名溢出（65バイト以降）"},
    {"columnIndex": 27, "targetField": "品名４",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 28, "targetField": "品名５",                 "sourceField": "eazyDeliveryLocation",      "required": false, "note": "EAZY配達場所（クール便001＋代引以外時）/ EAZY配送地点（冷藏001+非代引时）"},
    {"columnIndex": 29, "targetField": "荷札荷姿",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 30, "targetField": "荷札品名１",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 31, "targetField": "荷札品名２",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 32, "targetField": "荷札品名３",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 33, "targetField": "荷札品名４",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 34, "targetField": "荷札品名５",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 35, "targetField": "荷札品名６",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 36, "targetField": "荷札品名７",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 37, "targetField": "荷札品名８",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 38, "targetField": "荷札品名９",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 39, "targetField": "荷札品名１０",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 40, "targetField": "荷札品名１１",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 41, "targetField": "出荷個数",               "sourceField": null,                        "required": true,  "note": "固定値「1」/ 固定值「1」", "fixedValue": "1"},
    {"columnIndex": 42, "targetField": "スピード指定",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 43, "targetField": "クール便指定",           "sourceField": "coolType",                  "required": true,  "note": "001:通常 002:冷蔵 003:冷凍 / 001:常温 002:冷藏 003:冷冻"},
    {"columnIndex": 44, "targetField": "配達日",                 "sourceField": "deliveryDate",              "required": false, "note": "配送日 / 配送日期"},
    {"columnIndex": 45, "targetField": "配達指定時間帯",         "sourceField": "deliveryTimeSlot",          "required": false, "note": "01:午前中 12:12-14 14:14-16 16:16-18 18:18-20 04:18-21 19:19-21"},
    {"columnIndex": 46, "targetField": "配達指定時間（時分）",   "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 47, "targetField": "代引金額",               "sourceField": "codAmount",                 "required": false, "note": "代金引換額 / 货到付款金额"},
    {"columnIndex": 48, "targetField": "消費税",                 "sourceField": "codTax",                    "required": false, "note": "代引時のみ出力 / 仅代引时输出"},
    {"columnIndex": 49, "targetField": "決済種別",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 50, "targetField": "保険金額",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 51, "targetField": "指定シール１",           "sourceField": "stickerCode1",              "required": false, "note": "シール1 / 贴纸1"},
    {"columnIndex": 52, "targetField": "指定シール２",           "sourceField": "stickerCode2",              "required": false, "note": "シール2 / 贴纸2"},
    {"columnIndex": 53, "targetField": "指定シール３",           "sourceField": "stickerCode3",              "required": false, "note": "シール3 / 贴纸3"},
    {"columnIndex": 54, "targetField": "営業所受取",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 55, "targetField": "SRC区分",                "sourceField": null,                        "required": false, "note": "固定値「0」/ 固定值「0」", "fixedValue": "0"},
    {"columnIndex": 56, "targetField": "営業所受取営業所コード", "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 57, "targetField": "元着区分",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 58, "targetField": "メールアドレス",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 59, "targetField": "ご不在時連絡先",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 60, "targetField": "出荷日",                 "sourceField": "shipDate",                  "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 61, "targetField": "お問い合せ送り状No.",    "sourceField": null,                        "required": false, "note": "未使用（確定後に付与）/ 未使用（确认后赋值）"},
    {"columnIndex": 62, "targetField": "出荷場印字区分",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 63, "targetField": "集約解除指定",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 64, "targetField": "編集０１",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 65, "targetField": "編集０２",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 66, "targetField": "編集０３",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 67, "targetField": "編集０４",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 68, "targetField": "編集０５",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 69, "targetField": "編集０６",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 70, "targetField": "編集０７",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 71, "targetField": "編集０８",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 72, "targetField": "編集０９",               "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 73, "targetField": "編集１０",               "sourceField": null,                        "required": false, "note": "予備 / 预留"}
  ]'::jsonb,
  true,
  now(), now()
);


-- ============================================================================
-- 2. ヤマト運輸 B2 出荷指示エクスポート（出荷→CSV）
--    雅玛多运输 B2 出货指示导出（出货→CSV）
-- ============================================================================
-- テンプレート形式: 基本レイアウトテンプレート (76列)
-- 模板格式: 基本布局模板 (76列)
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'order-to-carrier',
  'ヤマト運輸 B2 出荷指示エクスポート',
  'ヤマト運輸 B2クラウド CSV出力用マッピング（基本レイアウトテンプレート形式、76列）/ 雅玛多运输 B2 Cloud CSV输出映射（基本布局模板格式，76列）',
  'yamato',
  '[
    {"columnIndex": 0,  "targetField": "お客様管理番号",                     "sourceField": "orderNumber_deliveryNumber","required": true,  "note": "受注番号_配送番号 / 订单号_配送号"},
    {"columnIndex": 1,  "targetField": "送り状種別",                         "sourceField": "invoiceType",              "required": true,  "note": "0:発払 2:コレクト 3:DM 4:タイム 7:ネコポス 8:宅急便コンパクト 9:EAZY"},
    {"columnIndex": 2,  "targetField": "クール区分",                         "sourceField": "coolType",                 "required": false, "note": "空白:通常 2:冷蔵 3:冷凍 / 空:常温 2:冷藏 3:冷冻"},
    {"columnIndex": 3,  "targetField": "伝票番号",                           "sourceField": null,                       "required": false, "note": "空白（確定後に付与）/ 空白（确认后赋值）"},
    {"columnIndex": 4,  "targetField": "出荷予定日",                         "sourceField": "shipDate",                 "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 5,  "targetField": "お届け予定（指定）日",               "sourceField": "deliveryDate",             "required": false, "note": "配送日 / 配送日期"},
    {"columnIndex": 6,  "targetField": "配達時間帯",                         "sourceField": "deliveryTimeSlot",         "required": false, "note": "01:午前中 12:12-14 14:14-16 16:16-18 18:18-20 20:20-21"},
    {"columnIndex": 7,  "targetField": "お届け先コード",                     "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 8,  "targetField": "お届け先電話番号",                   "sourceField": "recipientPhone",           "required": true,  "note": "配送先電話番号 / 收件人电话"},
    {"columnIndex": 9,  "targetField": "お届け先電話番号枝番",               "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 10, "targetField": "お届け先郵便番号",                   "sourceField": "recipientPostalCode",      "required": true,  "note": "配送先郵便番号 / 收件人邮编"},
    {"columnIndex": 11, "targetField": "お届け先住所",                       "sourceField": "recipientAddress1",        "required": true,  "note": "最大32バイト / 最大32字节"},
    {"columnIndex": 12, "targetField": "お届け先住所（アパートマンション名）","sourceField": "recipientAddress2",        "required": false, "note": "33バイト目以降 / 第33字节以后"},
    {"columnIndex": 13, "targetField": "お届け先会社・部門名１",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 14, "targetField": "お届け先会社・部門名２",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 15, "targetField": "お届け先名",                         "sourceField": "recipientName",            "required": true,  "note": "配送先名 / 收件人名"},
    {"columnIndex": 16, "targetField": "お届け先名略称カナ",                 "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 17, "targetField": "敬称",                               "sourceField": null,                       "required": true,  "note": "固定値「様」/ 固定值「様」", "fixedValue": "様"},
    {"columnIndex": 18, "targetField": "ご依頼主コード",                     "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 19, "targetField": "ご依頼主電話番号",                   "sourceField": "senderPhone",              "required": true,  "note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话"},
    {"columnIndex": 20, "targetField": "ご依頼主電話番号枝番",               "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 21, "targetField": "ご依頼主郵便番号",                   "sourceField": "senderPostalCode",         "required": true,  "note": "ギフト：注文者郵便番号 / 否则：店舗郵便番号 / 礼品:下单人邮编 / 否则:店铺邮编"},
    {"columnIndex": 22, "targetField": "ご依頼主住所",                       "sourceField": "senderAddress1",           "required": true,  "note": "最大32バイト / 最大32字节"},
    {"columnIndex": 23, "targetField": "ご依頼主住所（アパートマンション名）","sourceField": "senderAddress2",           "required": false, "note": "33バイト目以降 / 第33字节以后"},
    {"columnIndex": 24, "targetField": "ご依頼主名",                         "sourceField": "senderName",               "required": true,  "note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名"},
    {"columnIndex": 25, "targetField": "ご依頼主略称カナ",                   "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 26, "targetField": "品名コード１",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 27, "targetField": "品名１",                             "sourceField": "productName1",             "required": true,  "note": "品名（最大50バイト）/ 品名（最大50字节）"},
    {"columnIndex": 28, "targetField": "品名コード２",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 29, "targetField": "品名２",                             "sourceField": "productName2",             "required": false, "note": "品名オーバーフロー / 品名溢出（50バイト超過分）"},
    {"columnIndex": 30, "targetField": "荷扱い１",                           "sourceField": "handlingNote1",            "required": false, "note": "連絡事項1 / 联络事项1"},
    {"columnIndex": 31, "targetField": "荷扱い２",                           "sourceField": "handlingNote2",            "required": false, "note": "連絡事項2 / 联络事项2"},
    {"columnIndex": 32, "targetField": "記事",                               "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 33, "targetField": "コレクト代金引換額（税込）",         "sourceField": "codAmount",                "required": false, "note": "代金引換額 / 货到付款金额"},
    {"columnIndex": 34, "targetField": "コレクト内消費税額等",               "sourceField": "codTax",                   "required": false, "note": "代引時のみ出力 / 仅代引时输出"},
    {"columnIndex": 35, "targetField": "営業所止置き",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 36, "targetField": "営業所コード",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 37, "targetField": "発行枚数",                           "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 38, "targetField": "個数口枠の印字",                     "sourceField": "packageCountPrint",        "required": false, "note": "個数口数の印字 / 件数框印刷"},
    {"columnIndex": 39, "targetField": "ご請求先顧客コード",                 "sourceField": "billingCustomerCode",      "required": false, "note": "請求先顧客コード（12桁）/ 账单客户代码（12位）"},
    {"columnIndex": 40, "targetField": "ご請求先分類コード",                 "sourceField": "billingClassCode",         "required": false, "note": "請求先分類コード（3桁）/ 账单分类代码（3位）"},
    {"columnIndex": 41, "targetField": "運賃管理番号",                       "sourceField": "freightManagementCode",    "required": false, "note": "運賃管理コード（2桁）/ 运费管理代码（2位）"},
    {"columnIndex": 42, "targetField": "注文時カード払いデータ登録",         "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 43, "targetField": "注文時カード払い加盟店番号",         "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 44, "targetField": "注文時カード払い申込受付番号１",     "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 45, "targetField": "注文時カード払い申込受付番号２",     "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 46, "targetField": "注文時カード払い申込受付番号３",     "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 47, "targetField": "お届け予定ｅメール利用区分",         "sourceField": "emailNotificationType",    "required": false, "note": "送り状種別1の場合のみ / 仅送状类型1时输出"},
    {"columnIndex": 48, "targetField": "お届け予定ｅメールe-mailアドレス",   "sourceField": "recipientEmail",           "required": false, "note": "注文者メール（種別1のみ）/ 下单人邮箱（仅类型1）"},
    {"columnIndex": 49, "targetField": "入力機種",                           "sourceField": "inputDeviceType",          "required": false, "note": "送り状種別1の場合のみ / 仅送状类型1时输出"},
    {"columnIndex": 50, "targetField": "お届け予定eメールメッセージ",        "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 51, "targetField": "お届け完了ｅメール利用区分",         "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 52, "targetField": "お届け完了ｅメールe-mailアドレス",   "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 53, "targetField": "お届け完了eメールメッセージ",        "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 54, "targetField": "クロネコ収納代行利用区分",           "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 55, "targetField": "収納代行決済ＱＲコード印刷",         "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 56, "targetField": "収納代行請求金額(税込)",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 57, "targetField": "収納代行内消費税額等",               "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 58, "targetField": "収納代行請求先郵便番号",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 59, "targetField": "収納代行請求先住所",                 "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 60, "targetField": "収納代行請求先住所（アパートマンション名）","sourceField": null,                "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 61, "targetField": "収納代行請求先会社・部門名１",       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 62, "targetField": "収納代行請求先会社・部門名２",       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 63, "targetField": "収納代行請求先名(漢字)",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 64, "targetField": "収納代行請求先名(カナ)",             "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 65, "targetField": "収納代行問合せ先名(漢字)",           "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 66, "targetField": "収納代行問合せ先郵便番号",           "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 67, "targetField": "収納代行問合せ先住所",               "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 68, "targetField": "収納代行問合せ先住所（アパートマンション名）","sourceField": null,              "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 69, "targetField": "収納代行問合せ先電話番号",           "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 70, "targetField": "収納代行管理番号",                   "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 71, "targetField": "収納代行品名",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 72, "targetField": "収納代行備考",                       "sourceField": null,                       "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 73, "targetField": "連携管理番号",                       "sourceField": "convenienceStoreNumber",   "required": false, "note": "コンビニ受取時のみ / 仅便利店取货时"},
    {"columnIndex": 74, "targetField": "通知メールアドレス",                 "sourceField": "notificationEmail",        "required": false, "note": "コンビニ受取時のみ / 仅便利店取货时"},
    {"columnIndex": 75, "targetField": "置き場所コード",                     "sourceField": "eazyDeliveryLocation",     "required": false, "note": "EAZY配達場所（種別1のみ）/ EAZY配送地点（仅类型1）"}
  ]'::jsonb,
  true,
  now(), now()
);


-- ============================================================================
-- 3. 西濃運輸 カンガルーマジック2 出荷指示エクスポート（出荷→CSV）
--    西浓运输 袋鼠魔术2 出货指示导出（出货→CSV）
-- ============================================================================
-- テンプレート形式: カンガルーマジック2標準 (44列)
-- 模板格式: 袋鼠魔术2标准 (44列)
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'order-to-carrier',
  '西濃運輸 カンガルーマジック2 出荷指示エクスポート',
  '西濃運輸 カンガルーマジック2 CSV出力用マッピング（44列）/ 西浓运输 袋鼠魔术2 CSV输出映射（44列）',
  'seino',
  '[
    {"columnIndex": 0,  "targetField": "荷送人コード",           "sourceField": "senderCode",                "required": true,  "note": "荷主人コード（11桁）/ 发货人代码（11位）"},
    {"columnIndex": 1,  "targetField": "西濃発店コード",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 2,  "targetField": "出荷予定日",             "sourceField": "shipDate",                  "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 3,  "targetField": "お問合せ番号",           "sourceField": null,                        "required": false, "note": "空白（確定後に付与）/ 空白（确认后赋值）"},
    {"columnIndex": 4,  "targetField": "管理番号",               "sourceField": "orderNumber_deliveryNumber","required": true,  "note": "受注番号_配送番号 / 订单号_配送号"},
    {"columnIndex": 5,  "targetField": "元着区分",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 6,  "targetField": "原票区分",               "sourceField": "slipType",                  "required": false, "note": "通販便は固定値「8」/ 通贩便固定值「8」", "fixedValue": "8"},
    {"columnIndex": 7,  "targetField": "個数",                   "sourceField": null,                        "required": true,  "note": "固定値「1」/ 固定值「1」", "fixedValue": "1"},
    {"columnIndex": 8,  "targetField": "重量区分",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 9,  "targetField": "重量（Ｋ)",              "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 10, "targetField": "重量（才）",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 11, "targetField": "荷送人名称",             "sourceField": "senderName",                "required": true,  "note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名"},
    {"columnIndex": 12, "targetField": "荷送人住所１",           "sourceField": "senderAddress1",            "required": true,  "note": "最大40バイト / 最大40字节"},
    {"columnIndex": 13, "targetField": "荷送人住所２",           "sourceField": "senderAddress2",            "required": false, "note": "41バイト目以降 / 第41字节以后"},
    {"columnIndex": 14, "targetField": "荷送人電話番号",         "sourceField": "senderPhone",               "required": true,  "note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话"},
    {"columnIndex": 15, "targetField": "部署コード",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 16, "targetField": "部署名",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 17, "targetField": "重量契約区分",           "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 18, "targetField": "お届け先郵便番号",       "sourceField": "recipientPostalCode",       "required": true,  "note": "配送先郵便番号 / 收件人邮编"},
    {"columnIndex": 19, "targetField": "お届け先名称１",         "sourceField": "recipientName",             "required": true,  "note": "配送先名 / 收件人名"},
    {"columnIndex": 20, "targetField": "お届け先名称２",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 21, "targetField": "お届け先住所１",         "sourceField": "recipientAddress1",         "required": true,  "note": "最大40バイト / 最大40字节"},
    {"columnIndex": 22, "targetField": "お届け先住所２",         "sourceField": "recipientAddress2",         "required": false, "note": "41バイト目以降 / 第41字节以后"},
    {"columnIndex": 23, "targetField": "お届け先電話番号",       "sourceField": "recipientPhone",            "required": true,  "note": "配送先電話番号 / 收件人电话"},
    {"columnIndex": 24, "targetField": "お届け先コード",         "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 25, "targetField": "お届け先JIS市町村コード","sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 26, "targetField": "着店コード付け区分",     "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 27, "targetField": "着地コード",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 28, "targetField": "着店コード",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 29, "targetField": "保険金額",               "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 30, "targetField": "輸送指示１",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 31, "targetField": "輸送指示２",             "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 32, "targetField": "記事１",                 "sourceField": "handlingNote1",             "required": false, "note": "連絡事項 / 联络事项"},
    {"columnIndex": 33, "targetField": "記事２",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 34, "targetField": "記事３",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 35, "targetField": "記事４",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 36, "targetField": "記事５",                 "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 37, "targetField": "輸送指示（配達指定日付）","sourceField": "deliveryDateTime",          "required": false, "note": "配送日＋時間指定コード / 配送日期+时间指定代码"},
    {"columnIndex": 38, "targetField": "輸送指示コード１",       "sourceField": "transportCode1",            "required": false, "note": "配達日指定時のみ / 仅指定配达日时输出"},
    {"columnIndex": 39, "targetField": "輸送指示コード２",       "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 40, "targetField": "輸送指示（止め店所名）", "sourceField": null,                        "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 41, "targetField": "予備",                   "sourceField": null,                        "required": false, "note": "予備 / 预留"},
    {"columnIndex": 42, "targetField": "品代金",                 "sourceField": "codAmount",                 "required": false, "note": "代金引換額 / 货到付款金额"},
    {"columnIndex": 43, "targetField": "消費税",                 "sourceField": "codTax",                    "required": false, "note": "代引時のみ出力 / 仅代引时输出"}
  ]'::jsonb,
  true,
  now(), now()
);


-- ============================================================================
-- 4. 佐川急便 e飛伝3 出荷確定インポート（CSV→出荷実績）
--    佐川急便 e飞传3 出货确认导入（CSV→出货实绩）
-- ============================================================================
-- テンプレート形式: 標準_飛脚宅配便_CSV_ヘッダ有 (91列)
-- 模板格式: 标准_飞脚宅配便_CSV_有标题 (91列)
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'carrier-receipt-to-order',
  '佐川急便 e飛伝3 出荷確定インポート',
  '佐川急便 e飛伝3 出荷確定CSVインポート用マッピング（回執取込）/ 佐川急便 e飞传3 出货确认CSV导入映射（回执导入）',
  'sagawa',
  '[
    {"columnIndex": 0,  "targetField": "お問い合せ送り状No.", "sourceField": "trackingNumber",  "required": true,  "note": "荷物追跡番号 / 包裹追踪号"},
    {"columnIndex": 1,  "targetField": "サービス種別",       "sourceField": null,              "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 2,  "targetField": "出荷日",             "sourceField": "shipDate",        "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 3,  "targetField": "お届け先コード",     "sourceField": null,              "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 4,  "targetField": "お届け先電話番号",   "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 5,  "targetField": "お届け先郵便番号",   "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 6,  "targetField": "お届け先住所１",     "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 7,  "targetField": "お届け先住所2",      "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 8,  "targetField": "お届け先住所3",      "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 18, "targetField": "お客様管理番号",     "sourceField": "orderReference",  "required": false, "note": "受注番号照合用 / 订单号匹配用"}
  ]'::jsonb,
  true,
  now(), now()
);


-- ============================================================================
-- 5. ヤマト運輸 B2 出荷確定インポート（CSV→出荷実績）
--    雅玛多运输 B2 出货确认导入（CSV→出货实绩）
-- ============================================================================
-- テンプレート形式: 出荷データ検索出力 (73列)
-- 模板格式: 出货数据检索输出 (73列)
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'carrier-receipt-to-order',
  'ヤマト運輸 B2 出荷確定インポート',
  'ヤマト運輸 B2クラウド 出荷確定CSVインポート用マッピング（回執取込）/ 雅玛多运输 B2 Cloud 出货确认CSV导入映射（回执导入）',
  'yamato',
  '[
    {"columnIndex": 0,  "targetField": "お客様管理番号",     "sourceField": "orderReference",  "required": false, "note": "受注番号照合用 / 订单号匹配用"},
    {"columnIndex": 1,  "targetField": "送り状種別",         "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 2,  "targetField": "クール区分",         "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 3,  "targetField": "送り状番号",         "sourceField": "trackingNumber",  "required": true,  "note": "荷物追跡番号 / 包裹追踪号"},
    {"columnIndex": 4,  "targetField": "出荷日",             "sourceField": "shipDate",        "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 5,  "targetField": "到着予定日",         "sourceField": "deliveryDate",    "required": false, "note": "配送予定日 / 预计配送日"},
    {"columnIndex": 6,  "targetField": "到着予定時間",       "sourceField": null,              "required": false, "note": "参照用 / 参考用"}
  ]'::jsonb,
  true,
  now(), now()
);


-- ============================================================================
-- 6. 西濃運輸 カンガルーマジック2 出荷確定インポート（CSV→出荷実績）
--    西浓运输 袋鼠魔术2 出货确认导入（CSV→出货实绩）
-- ============================================================================
-- テンプレート形式: カンガルーマジック2 出荷確定出力
-- 模板格式: 袋鼠魔术2 出货确认输出
INSERT INTO mapping_configs (
  id, tenant_id, config_type, name, description,
  order_source_company_name, mappings, is_default,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'carrier-receipt-to-order',
  '西濃運輸 カンガルーマジック2 出荷確定インポート',
  '西濃運輸 カンガルーマジック2 出荷確定CSVインポート用マッピング（回執取込）/ 西浓运输 袋鼠魔术2 出货确认CSV导入映射（回执导入）',
  'seino',
  '[
    {"columnIndex": 0,  "targetField": "出荷日",             "sourceField": "shipDate",        "required": true,  "note": "出荷日 / 出货日"},
    {"columnIndex": 1,  "targetField": "取込番号",           "sourceField": null,              "required": false, "note": "未使用 / 未使用"},
    {"columnIndex": 2,  "targetField": "送り状番号",         "sourceField": "trackingNumber",  "required": true,  "note": "荷物追跡番号 / 包裹追踪号"},
    {"columnIndex": 3,  "targetField": "元着区分",           "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 4,  "targetField": "原票区分",           "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 5,  "targetField": "個数",               "sourceField": null,              "required": false, "note": "参照用 / 参考用"},
    {"columnIndex": 9,  "targetField": "荷送人コード",       "sourceField": null,              "required": false, "note": "参照用（荷主照合可能）/ 参考用（可匹配发货人）"},
    {"columnIndex": 16, "targetField": "お届け先コード",     "sourceField": null,              "required": false, "note": "参照用 / 参考用"}
  ]'::jsonb,
  true,
  now(), now()
);
