-- システムデフォルトテンプレート シード / 系统默认模板种子数据
-- 開発用テナントID: 00000000-0000-0000-0000-000000000001
-- 全18帳票タイプのシステムデフォルトを挿入 / 插入全部18种帳票类型的系统默认模板

-- ============================================================
-- フォームテンプレート（帳票）/ 表单模板
-- ============================================================

-- 1. ピッキングリスト / 拣货清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】ピッキングリスト',
  'shipment-list-picking',
  'system', true, true, 1,
  'システムデフォルト: 出荷商品の集計リスト / 系统默认: 出库商品汇总清单',
  '[{"id":"sys_col_1","type":"single","label":"SKU管理番号","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"印刷用商品名","width":"auto","order":1,"field":"name","renderType":"text"},{"id":"sys_col_3","type":"single","label":"数量","width":"auto","order":2,"field":"totalQuantity","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 2. 出荷明細リスト / 出库明细清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】出荷明細リスト',
  'shipment-detail-list',
  'system', true, true, 1,
  'システムデフォルト: 出荷指示の詳細一覧 / 系统默认: 出库指示详细列表',
  '[{"id":"sys_col_1","type":"single","label":"出荷管理No","width":"auto","order":0,"field":"shipmentNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"お客様管理番号","width":"auto","order":1,"field":"customerOrderNo","renderType":"text"},{"id":"sys_col_3","type":"single","label":"配送業者","width":"auto","order":2,"field":"carrierName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"出荷予定日","width":"auto","order":3,"field":"shipDate","renderType":"date","dateFormat":"YYYY/MM/DD"},{"id":"sys_col_5","type":"single","label":"商品","width":"auto","order":4,"field":"productSummary","renderType":"text"},{"id":"sys_col_6","type":"single","label":"商品総数","width":"auto","order":5,"field":"totalItems","renderType":"text"},{"id":"sys_col_7","type":"single","label":"お届け先名","width":"auto","order":6,"field":"consigneeName","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 3. 入庫リスト / 入库清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】入庫リスト',
  'inbound-detail-list',
  'system', true, true, 1,
  'システムデフォルト: 入庫指示のライン明細 / 系统默认: 入库指示行明细',
  '[{"id":"sys_col_1","type":"single","label":"入庫指示No","width":"auto","order":0,"field":"inboundNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"ステータス","width":"auto","order":1,"field":"status","renderType":"text"},{"id":"sys_col_3","type":"single","label":"仕入先","width":"auto","order":2,"field":"supplierName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"入荷予定日","width":"auto","order":3,"field":"expectedDate","renderType":"date","dateFormat":"YYYY/MM/DD"},{"id":"sys_col_5","type":"single","label":"SKU","width":"auto","order":4,"field":"sku","renderType":"text"},{"id":"sys_col_6","type":"single","label":"商品名","width":"auto","order":5,"field":"productName","renderType":"text"},{"id":"sys_col_7","type":"single","label":"入荷予定数","width":"auto","order":6,"field":"expectedQty","renderType":"text"},{"id":"sys_col_8","type":"single","label":"検品済数","width":"auto","order":7,"field":"inspectedQty","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 4. 入庫検品シート / 入库检品表
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】入庫検品シート',
  'inbound-inspection-sheet',
  'system', true, true, 1,
  'システムデフォルト: 入庫検品用チェックリスト / 系统默认: 入库检品检查清单',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"検品コード","width":"auto","order":2,"field":"barcode","renderType":"text"},{"id":"sys_col_4","type":"single","label":"入荷予定数","width":"auto","order":3,"field":"expectedQty","renderType":"text"},{"id":"sys_col_5","type":"single","label":"検品済数","width":"auto","order":4,"field":"inspectedQty","renderType":"text"},{"id":"sys_col_6","type":"single","label":"仕入先","width":"auto","order":5,"field":"supplierName","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 5. 納品書 / 交货单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】納品書',
  'delivery-note',
  'system', true, true, 1,
  'システムデフォルト: B2B出荷用の納品書 / 系统默认: B2B出库用交货单',
  '[{"id":"sys_col_1","type":"single","label":"出荷管理No","width":"auto","order":0,"field":"shipmentNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"お客様管理番号","width":"auto","order":1,"field":"customerOrderNo","renderType":"text"},{"id":"sys_col_3","type":"single","label":"商品","width":"auto","order":2,"field":"productSummary","renderType":"text"},{"id":"sys_col_4","type":"single","label":"商品総数","width":"auto","order":3,"field":"totalItems","renderType":"text"},{"id":"sys_col_5","type":"single","label":"お届け先名","width":"auto","order":4,"field":"consigneeName","renderType":"text"},{"id":"sys_col_6","type":"single","label":"お届け先住所","width":"auto","order":5,"field":"consigneeAddress","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 6. 商品ラベル / 商品标签
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】商品ラベル',
  'product-label',
  'system', true, true, 1,
  'システムデフォルト: 商品小標籤・外箱ラベル / 系统默认: 商品小标签・外箱标签',
  '[{"id":"sys_col_1","type":"single","label":"SKU管理番号","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"印刷用商品名","width":"auto","order":1,"field":"name","renderType":"text"},{"id":"sys_col_3","type":"single","label":"検品コード","width":"auto","order":2,"field":"barcode","renderType":"text"},{"id":"sys_col_4","type":"single","label":"ロケーション","width":"auto","order":3,"field":"location","renderType":"text"},{"id":"sys_col_5","type":"single","label":"数量","width":"auto","order":4,"field":"quantity","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 7. 入庫差異リスト / 入库差异清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】入庫差異リスト',
  'inbound-variance-list',
  'system', true, true, 1,
  'システムデフォルト: 入荷予定数と実績数の差異 / 系统默认: 预期数量与实际数量差异',
  '[{"id":"sys_col_1","type":"single","label":"入庫指示No","width":"auto","order":0,"field":"inboundNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"SKU","width":"auto","order":1,"field":"sku","renderType":"text"},{"id":"sys_col_3","type":"single","label":"商品名","width":"auto","order":2,"field":"productName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"入荷予定数","width":"auto","order":3,"field":"expectedQty","renderType":"text"},{"id":"sys_col_5","type":"single","label":"検品済数","width":"auto","order":4,"field":"inspectedQty","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 8. 入庫看板 / 入库看板
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】入庫看板',
  'inbound-kanban',
  'system', true, true, 1,
  'システムデフォルト: 入庫指示サマリ看板 / 系统默认: 入库指示汇总看板',
  '[{"id":"sys_col_1","type":"single","label":"入庫指示No","width":"auto","order":0,"field":"inboundNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"ステータス","width":"auto","order":1,"field":"status","renderType":"text"},{"id":"sys_col_3","type":"single","label":"仕入先","width":"auto","order":2,"field":"supplierName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"入荷予定日","width":"auto","order":3,"field":"expectedDate","renderType":"date","dateFormat":"YYYY/MM/DD"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 9. 入庫実績一覧表 / 入库实绩一览表
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】入庫実績一覧表',
  'inbound-actual-list',
  'system', true, true, 1,
  'システムデフォルト: 完了済み入庫の実績データ / 系统默认: 已完成入库实绩数据',
  '[{"id":"sys_col_1","type":"single","label":"入庫指示No","width":"auto","order":0,"field":"inboundNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"仕入先","width":"auto","order":1,"field":"supplierName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"SKU","width":"auto","order":2,"field":"sku","renderType":"text"},{"id":"sys_col_4","type":"single","label":"商品名","width":"auto","order":3,"field":"productName","renderType":"text"},{"id":"sys_col_5","type":"single","label":"入荷予定数","width":"auto","order":4,"field":"expectedQty","renderType":"text"},{"id":"sys_col_6","type":"single","label":"検品済数","width":"auto","order":5,"field":"inspectedQty","renderType":"text"},{"id":"sys_col_7","type":"single","label":"格納済数","width":"auto","order":6,"field":"storedQty","renderType":"text"},{"id":"sys_col_8","type":"single","label":"完了日時","width":"auto","order":7,"field":"completedAt","renderType":"date","dateFormat":"YYYY/MM/DD"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 10. 棚卸指示書 / 盘点指示书
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】棚卸指示書',
  'stocktaking-instruction',
  'system', true, true, 1,
  'システムデフォルト: 棚卸実施指示情報 / 系统默认: 盘点实施指示信息',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"ロケーション","width":"auto","order":2,"field":"location","renderType":"text"},{"id":"sys_col_4","type":"single","label":"理論在庫数","width":"auto","order":3,"field":"systemQty","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 11. 棚卸チェックリスト / 盘点检查清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】棚卸チェックリスト',
  'stocktaking-checklist',
  'system', true, true, 1,
  'システムデフォルト: 棚卸チェック用リスト / 系统默认: 盘点检查清单',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"ロケーション","width":"auto","order":2,"field":"location","renderType":"text"},{"id":"sys_col_4","type":"single","label":"理論在庫数","width":"auto","order":3,"field":"systemQty","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 12. 棚卸差異リスト / 盘点差异清单
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】棚卸差異リスト',
  'stocktaking-variance',
  'system', true, true, 1,
  'システムデフォルト: 棚卸結果の差異 / 系统默认: 盘点结果差异',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"ロケーション","width":"auto","order":2,"field":"location","renderType":"text"},{"id":"sys_col_4","type":"single","label":"理論在庫数","width":"auto","order":3,"field":"systemQty","renderType":"text"},{"id":"sys_col_5","type":"single","label":"実棚数","width":"auto","order":4,"field":"countedQty","renderType":"text"},{"id":"sys_col_6","type":"single","label":"差異数","width":"auto","order":5,"field":"variance","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 13. 棚卸報告書 / 盘点报告书
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】棚卸報告書',
  'stocktaking-report',
  'system', true, true, 1,
  'システムデフォルト: 棚卸最終報告サマリ / 系统默认: 盘点最终报告汇总',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"理論在庫数","width":"auto","order":2,"field":"systemQty","renderType":"text"},{"id":"sys_col_4","type":"single","label":"実棚数","width":"auto","order":3,"field":"countedQty","renderType":"text"},{"id":"sys_col_5","type":"single","label":"差異数","width":"auto","order":4,"field":"variance","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 14. 梱包明細 / 装箱明细
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】梱包明細',
  'packing-detail',
  'system', true, true, 1,
  'システムデフォルト: 箱単位の梱包内容 / 系统默认: 按箱装箱内容',
  '[{"id":"sys_col_1","type":"single","label":"出荷管理No","width":"auto","order":0,"field":"shipmentNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"SKU","width":"auto","order":1,"field":"sku","renderType":"text"},{"id":"sys_col_3","type":"single","label":"商品名","width":"auto","order":2,"field":"productName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"数量","width":"auto","order":3,"field":"quantity","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 15. 出荷未検品一覧 / 出库未检品一览
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】出荷未検品一覧',
  'unshipped-list',
  'system', true, true, 1,
  'システムデフォルト: 未検品の出荷注文一覧 / 系统默认: 未检品出库订单列表',
  '[{"id":"sys_col_1","type":"single","label":"出荷管理No","width":"auto","order":0,"field":"shipmentNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"お客様管理番号","width":"auto","order":1,"field":"customerOrderNo","renderType":"text"},{"id":"sys_col_3","type":"single","label":"出荷予定日","width":"auto","order":2,"field":"shipDate","renderType":"date","dateFormat":"YYYY/MM/DD"},{"id":"sys_col_4","type":"single","label":"商品総数","width":"auto","order":3,"field":"totalItems","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 16. 配送証明 POD / 配送证明 POD
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】配送証明 POD',
  'pod-delivery-proof',
  'system', true, true, 1,
  'システムデフォルト: 配達完了の証明データ / 系统默认: 配送完成证明数据',
  '[{"id":"sys_col_1","type":"single","label":"出荷管理No","width":"auto","order":0,"field":"shipmentNo","renderType":"text"},{"id":"sys_col_2","type":"single","label":"配送業者","width":"auto","order":1,"field":"carrierName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"お届け先名","width":"auto","order":2,"field":"consigneeName","renderType":"text"},{"id":"sys_col_4","type":"single","label":"お届け先住所","width":"auto","order":3,"field":"consigneeAddress","renderType":"text"},{"id":"sys_col_5","type":"single","label":"配達完了日時","width":"auto","order":4,"field":"deliveredAt","renderType":"date","dateFormat":"YYYY/MM/DD HH:mm"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 17. 在庫証明書 / 库存证明书
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】在庫証明書',
  'inventory-certificate',
  'system', true, true, 1,
  'システムデフォルト: 在庫証明データ / 系统默认: 库存证明数据',
  '[{"id":"sys_col_1","type":"single","label":"SKU管理番号","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"ロケーション","width":"auto","order":2,"field":"location","renderType":"text"},{"id":"sys_col_4","type":"single","label":"数量","width":"auto","order":3,"field":"quantity","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;

-- 18. FBA報告データ / FBA报告数据
INSERT INTO "form_templates" ("tenant_id", "name", "target_type", "scope", "is_default", "is_active", "version", "description", "columns", "styles")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '【システム】FBA報告データ',
  'fba-report',
  'system', true, true, 1,
  'システムデフォルト: Amazon FBA出荷プラン報告 / 系统默认: Amazon FBA出货计划报告',
  '[{"id":"sys_col_1","type":"single","label":"SKU","width":"auto","order":0,"field":"sku","renderType":"text"},{"id":"sys_col_2","type":"single","label":"商品名","width":"auto","order":1,"field":"productName","renderType":"text"},{"id":"sys_col_3","type":"single","label":"数量","width":"auto","order":2,"field":"quantity","renderType":"text"}]',
  '{}'
) ON CONFLICT DO NOTHING;
