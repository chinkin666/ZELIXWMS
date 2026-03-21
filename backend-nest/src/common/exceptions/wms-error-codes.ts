// WMS エラーコード定義 / WMS错误代码定义
export const WMS_ERROR_CODES = {
  // Auth 認証 / 认证
  AUTH_INVALID_TOKEN: { code: 'AUTH-001', status: 401, message: 'Invalid token' },
  AUTH_EXPIRED_TOKEN: { code: 'AUTH-002', status: 401, message: 'Token expired' },
  AUTH_FORBIDDEN: { code: 'AUTH-003', status: 403, message: 'Insufficient permissions' },
  AUTH_RATE_LIMITED: { code: 'AUTH-004', status: 429, message: 'Too many login attempts' },

  // Product 商品 / 商品
  PROD_NOT_FOUND: { code: 'PROD-001', status: 404, message: 'Product not found' },
  PROD_DUPLICATE_SKU: { code: 'PROD-002', status: 409, message: 'Duplicate SKU' },
  PROD_INVALID_BARCODE: { code: 'PROD-003', status: 422, message: 'Invalid barcode format' },

  // Inventory 在庫 / 库存
  INV_INSUFFICIENT_STOCK: { code: 'INV-001', status: 409, message: 'Insufficient stock' },
  INV_NEGATIVE_QUANTITY: { code: 'INV-002', status: 422, message: 'Quantity cannot be negative' },
  INV_RESERVATION_EXPIRED: { code: 'INV-003', status: 410, message: 'Reservation expired' },
  INV_LOCATION_NOT_FOUND: { code: 'INV-004', status: 404, message: 'Location not found' },

  // Shipment 出荷 / 出货
  SHIP_NOT_FOUND: { code: 'SHIP-001', status: 404, message: 'Shipment order not found' },
  SHIP_INVALID_STATUS: { code: 'SHIP-002', status: 422, message: 'Invalid status transition' },
  SHIP_ALREADY_SHIPPED: { code: 'SHIP-003', status: 409, message: 'Order already shipped' },

  // Inbound 入庫 / 入库
  INBOUND_NOT_FOUND: { code: 'INB-001', status: 404, message: 'Inbound order not found' },
  INBOUND_INVALID_STATUS: { code: 'INB-002', status: 422, message: 'Invalid status transition' },
  INBOUND_QUANTITY_MISMATCH: { code: 'INB-003', status: 422, message: 'Received quantity exceeds expected' },

  // Billing 請求 / 请求
  BILL_NOT_FOUND: { code: 'BILL-001', status: 404, message: 'Billing record not found' },
  BILL_ALREADY_INVOICED: { code: 'BILL-002', status: 409, message: 'Already invoiced' },
  BILL_INVALID_STATUS: { code: 'BILL-003', status: 422, message: 'Invalid billing status transition' },

  // Carrier 配送 / 配送
  CARRIER_NOT_FOUND: { code: 'CARR-001', status: 404, message: 'Carrier not found' },
  CARRIER_BUILT_IN: { code: 'CARR-002', status: 403, message: 'Cannot modify built-in carrier' },
  CARRIER_SESSION_EXPIRED: { code: 'CARR-003', status: 401, message: 'Carrier session expired' },

  // Tenant テナント / 租户
  TENANT_MISMATCH: { code: 'TENANT-001', status: 403, message: 'Tenant mismatch' },
  TENANT_NOT_FOUND: { code: 'TENANT-002', status: 404, message: 'Tenant not found' },

  // FBA Amazon FBA / Amazon FBA
  FBA_PLAN_NOT_FOUND: { code: 'FBA-001', status: 404, message: 'FBA shipment plan not found' },
  FBA_BOX_NOT_FOUND: { code: 'FBA-002', status: 404, message: 'FBA box not found' },

  // RSL 楽天RSL / 乐天RSL
  RSL_PLAN_NOT_FOUND: { code: 'RSL-001', status: 404, message: 'RSL shipment plan not found' },
  RSL_ITEM_NOT_FOUND: { code: 'RSL-002', status: 404, message: 'RSL item not found' },

  // Passthrough パススルー / 直通
  PASSTHROUGH_NOT_FOUND: { code: 'PASS-001', status: 404, message: 'Passthrough order not found' },
  PASSTHROUGH_INVALID_STATUS: { code: 'PASS-002', status: 422, message: 'Invalid passthrough status transition' },

  // Import インポート / 导入
  IMPORT_FILE_TOO_LARGE: { code: 'IMP-001', status: 413, message: 'Import file exceeds 10MB limit' },
  IMPORT_INVALID_HEADERS: { code: 'IMP-002', status: 422, message: 'Invalid CSV headers' },
  IMPORT_VALIDATION_FAILED: { code: 'IMP-003', status: 422, message: 'CSV validation failed' },

  // Photo 写真 / 照片
  PHOTO_NOT_FOUND: { code: 'PHO-001', status: 404, message: 'Photo not found' },
  PHOTO_TOO_LARGE: { code: 'PHO-002', status: 413, message: 'Photo exceeds 5MB limit' },
  PHOTO_INVALID_TYPE: { code: 'PHO-003', status: 422, message: 'Invalid file type — only images allowed' },
  PHOTO_STORAGE_FULL: { code: 'PHO-004', status: 507, message: 'Storage capacity exceeded' },

  // Workflow ワークフロー / 工作流
  WORKFLOW_NOT_FOUND: { code: 'WF-001', status: 404, message: 'Workflow not found' },
  WORKFLOW_DISABLED: { code: 'WF-002', status: 422, message: 'Workflow is disabled' },
  SLOTTING_RULE_NOT_FOUND: { code: 'WF-003', status: 404, message: 'Slotting rule not found' },

  // Auth 認証追加 / 认证追加
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH-005', status: 401, message: 'Invalid credentials' },
  AUTH_DUPLICATE_EMAIL: { code: 'AUTH-006', status: 409, message: 'Email already exists' },

  // User ユーザー / 用户
  USER_NOT_FOUND: { code: 'USER-001', status: 404, message: 'User not found' },

  // Warehouse 倉庫 / 仓库
  WAREHOUSE_NOT_FOUND: { code: 'WH-001', status: 404, message: 'Warehouse not found' },

  // Wave ウェーブ / 波次
  WAVE_NOT_FOUND: { code: 'WAVE-001', status: 404, message: 'Wave not found' },
  WAVE_INVALID_STATUS: { code: 'WAVE-002', status: 422, message: 'Invalid wave status transition' },

  // Warehouse Task 倉庫タスク / 仓库任务
  TASK_NOT_FOUND: { code: 'TASK-001', status: 404, message: 'Warehouse task not found' },
  TASK_INVALID_STATUS: { code: 'TASK-002', status: 422, message: 'Invalid task status transition' },

  // Stocktaking 棚卸 / 盘点
  STOCKTAKING_NOT_FOUND: { code: 'STK-001', status: 404, message: 'Stocktaking order not found' },
  STOCKTAKING_INVALID_STATUS: { code: 'STK-002', status: 422, message: 'Invalid stocktaking status transition' },

  // Return 返品 / 退货
  RETURN_NOT_FOUND: { code: 'RET-001', status: 404, message: 'Return order not found' },
  RETURN_INVALID_STATUS: { code: 'RET-002', status: 422, message: 'Invalid return status transition' },

  // Material 資材 / 物料
  MATERIAL_NOT_FOUND: { code: 'MAT-001', status: 404, message: 'Material not found' },

  // Client 顧客 / 客户
  CLIENT_NOT_FOUND: { code: 'CLI-001', status: 404, message: 'Client not found' },
  CUSTOMER_NOT_FOUND: { code: 'CLI-002', status: 404, message: 'Customer not found' },
  SUPPLIER_NOT_FOUND: { code: 'CLI-003', status: 404, message: 'Supplier not found' },
  SUBCLIENT_NOT_FOUND: { code: 'CLI-004', status: 404, message: 'Sub-client not found' },
  SHOP_NOT_FOUND: { code: 'CLI-005', status: 404, message: 'Shop not found' },
  ORDER_SOURCE_NOT_FOUND: { code: 'CLI-006', status: 404, message: 'Order source company not found' },

  // Extensions 拡張 / 扩展
  EXT_WEBHOOK_NOT_FOUND: { code: 'EXT-001', status: 404, message: 'Webhook not found' },
  EXT_FLAG_NOT_FOUND: { code: 'EXT-002', status: 404, message: 'Feature flag not found' },
  EXT_PLUGIN_NOT_FOUND: { code: 'EXT-003', status: 404, message: 'Plugin not found' },
  EXT_SCRIPT_NOT_FOUND: { code: 'EXT-004', status: 404, message: 'Script not found' },
  EXT_CUSTOM_FIELD_NOT_FOUND: { code: 'EXT-005', status: 404, message: 'Custom field not found' },
  EXT_AUTO_RULE_NOT_FOUND: { code: 'EXT-006', status: 404, message: 'Auto-processing rule not found' },
  EXT_SCRIPT_DISABLED: { code: 'EXT-007', status: 422, message: 'Script is disabled' },

  // Template テンプレート / 模板
  TEMPLATE_NOT_FOUND: { code: 'TMPL-001', status: 404, message: 'Template not found' },

  // Notification 通知 / 通知
  NOTIFICATION_NOT_FOUND: { code: 'NOTIF-001', status: 404, message: 'Notification not found' },

  // Daily Report 日次レポート / 日报
  DAILY_REPORT_NOT_FOUND: { code: 'RPT-001', status: 404, message: 'Daily report not found' },

  // Lot ロット / 批次
  LOT_NOT_FOUND: { code: 'LOT-001', status: 404, message: 'Lot not found' },

  // Inventory Category 在庫区分 / 库存分类
  INV_CATEGORY_NOT_FOUND: { code: 'INV-005', status: 404, message: 'Inventory category not found' },

  // Labeling Task ラベリングタスク / 贴标任务
  LABELING_TASK_NOT_FOUND: { code: 'LBL-001', status: 404, message: 'Labeling task not found' },

  // Outbound Request 出庫依頼 / 出库请求
  OUTBOUND_NOT_FOUND: { code: 'OUT-001', status: 404, message: 'Outbound request not found' },

  // Inspection 検品 / 检验
  INSPECTION_NOT_FOUND: { code: 'INSP-001', status: 404, message: 'Inspection not found' },

  // Cycle Count 循環棚卸 / 循环盘点
  CYCLE_COUNT_NOT_FOUND: { code: 'CC-001', status: 404, message: 'Cycle count not found' },

  // Set Product セット商品 / 组合商品
  SET_PRODUCT_NOT_FOUND: { code: 'SETP-001', status: 404, message: 'Set product not found' },

  // Serial Number シリアル番号 / 序列号
  SERIAL_NOT_FOUND: { code: 'SER-001', status: 404, message: 'Serial number not found' },

  // Operation Log 操作ログ / 操作日志
  OPERATION_LOG_NOT_FOUND: { code: 'OPLOG-001', status: 404, message: 'Operation log not found' },

  // API Log APIログ / API日志
  API_LOG_NOT_FOUND: { code: 'APILOG-001', status: 404, message: 'API log not found' },

  // Exception Report 異常報告 / 异常报告
  EXCEPTION_REPORT_NOT_FOUND: { code: 'EXCPT-001', status: 404, message: 'Exception report not found' },
  EXCEPTION_INVALID_STATUS: { code: 'EXCPT-002', status: 422, message: 'Invalid exception report status' },

  // Carrier Automation 配送業者自動化 / 配送业者自动化
  CARRIER_AUTO_NOT_FOUND: { code: 'CARR-004', status: 404, message: 'Carrier automation config not found' },
  CARRIER_PROXY_ERROR: { code: 'CARR-005', status: 502, message: 'Express proxy request failed' },

  // Set Order セットオーダー / 套装订单
  SET_ORDER_NOT_FOUND: { code: 'SETO-001', status: 404, message: 'Set order not found' },
  SET_ORDER_INVALID_STATUS: { code: 'SETO-002', status: 422, message: 'Invalid set order status transition' },

  // Order Group オーダーグループ / 订单分组
  ORDER_GROUP_NOT_FOUND: { code: 'OG-001', status: 404, message: 'Order group not found' },

  // Rule ルール / 规则
  RULE_NOT_FOUND: { code: 'RULE-001', status: 404, message: 'Rule definition not found' },

  // Packing Rule 梱包ルール / 包装规则
  PACKING_RULE_NOT_FOUND: { code: 'PKRL-001', status: 404, message: 'Packing rule not found' },

  // WMS Schedule WMSスケジュール / WMS排程
  WMS_SCHEDULE_NOT_FOUND: { code: 'SCHED-001', status: 404, message: 'WMS schedule not found' },

  // Notification Preference 通知設定 / 通知偏好
  NOTIF_PREF_NOT_FOUND: { code: 'NOTIF-002', status: 404, message: 'Notification preferences not found' },

  // Price Catalog 価格カタログ / 价格目录
  PRICE_CATALOG_NOT_FOUND: { code: 'PCAT-001', status: 404, message: 'Price catalog entry not found' },

  // Integration 連携 / 集成
  INTEGRATION_NOT_CONFIGURED: { code: 'INTG-001', status: 422, message: 'Integration not configured or disabled' },

  // General 一般 / 通用
  DUPLICATE_RESOURCE: { code: 'GEN-001', status: 409, message: 'Resource already exists' },
  VALIDATION_ERROR: { code: 'GEN-002', status: 422, message: 'Validation failed' },
  INTERNAL_ERROR: { code: 'GEN-003', status: 500, message: 'Internal server error' },
} as const;

export type WmsErrorCode = keyof typeof WMS_ERROR_CODES;
