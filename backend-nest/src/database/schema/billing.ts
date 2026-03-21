// 請求・料金スキーマ / 请求・费率Schema
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, integer, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// チャージ種別・単位の定数 / 费用类型・单位常量
// ============================================

/** チャージ種別（23種）/ 费用类型（23种） */
export const CHARGE_TYPES = [
  'inbound_handling',    // 入庫作業料 / 入库作业费
  'storage',             // 保管料 / 保管费
  'outbound_handling',   // 出荷作業料 / 出货作业费
  'picking',             // ピッキング料 / 拣货费
  'packing',             // 梱包料 / 包装费
  'inspection',          // 検品料 / 检品费
  'shipping',            // 配送料 / 配送费
  'material',            // 梱包材料費 / 包装材料费
  'return_handling',     // 返品処理料 / 退货处理费
  'labeling',            // ラベル貼付料 / 贴标费
  'opp_bagging',         // OPP袋入れ料 / 套OPP袋费
  'suffocation_label',   // 窒息防止ラベル料 / 防窒息标签费
  'fragile_label',       // 壊れ物ラベル料 / 易碎标签费
  'bubble_wrap',         // 緩衝梱包料 / 气泡膜包装费
  'set_assembly',        // セット組み料 / 组合套装费
  'box_splitting',       // 分箱料 / 分箱费
  'box_merging',         // 合箱料 / 合箱费
  'box_replacement',     // 箱替え料 / 换箱费
  'photo_documentation', // 撮影記録料 / 拍照留档费
  'rush_processing',     // 特急対応料 / 加急处理费
  'multi_fc_surcharge',  // 複数FC追加料 / 多仓纳品附加费
  'overdue_storage',     // 長期保管料 / 超期仓储费
  'fba_delivery',        // FBA配送料 / FBA出库配送费
  'other',               // その他 / 其他
] as const;

/** チャージ単位 / 费用单位 */
export const CHARGE_UNITS = [
  'per_order',         // 注文あたり / 每订单
  'per_item',          // 個あたり / 每件
  'per_case',          // ケースあたり / 每箱
  'per_line',          // 行あたり / 每行
  'per_pallet',        // パレットあたり / 每托盘
  'per_location_day',  // ロケーション・日あたり / 每库位・天
  'per_sheet',         // 枚あたり / 每张
  'per_set',           // セットあたり / 每套
  'flat',              // 一律 / 统一
] as const;

/** 参照種別 / 引用类型 */
export const REFERENCE_TYPES = [
  'shipmentOrder',  // 出荷指示 / 出货指令
  'inboundOrder',   // 入庫指示 / 入库指令
  'returnOrder',    // 返品 / 退货
  'stocktaking',    // 棚卸 / 盘点
  'manual',         // 手動 / 手动
] as const;

/** 請求明細ステータス / 请求明细状态 */
export const BILLING_RECORD_STATUSES = ['draft', 'confirmed', 'invoiced', 'paid'] as const;

/** 請求書ステータス / 发票状态 */
export const INVOICE_STATUSES = ['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled'] as const;

/** サイズ種別 / 尺寸类型 */
export const SIZE_TYPES = ['weight', 'dimension', 'flat'] as const;

// ============================================
// 1. サービス料金マスタ / 服务费率主数据
// ============================================

export const serviceRates = pgTable('service_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 料金名称 / 费率名称
  name: text('name').notNull(),
  // チャージ種別（23種）/ 费用类型（23种）
  chargeType: text('charge_type').notNull(),
  // チャージ単位 / 费用单位
  unit: text('unit').notNull().default('per_item'),
  // 単価 / 单价
  unitPrice: numeric('unit_price').notNull().default('0'),
  // 荷主ID（null=デフォルト料金）/ 货主ID（null=默认费率）
  clientId: uuid('client_id'),
  // 荷主名（表示用キャッシュ）/ 货主名（显示用缓存）
  clientName: text('client_name'),
  // 条件（minQuantity, maxQuantity, coolType 等）/ 条件
  conditions: jsonb('conditions'),

  // 有効期間 / 有效期间
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  isActive: boolean('is_active').default(true).notNull(),

  // 備考 / 备注
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('service_rates_tenant_client_type_idx').on(table.tenantId, table.clientId, table.chargeType),
  index('service_rates_tenant_active_idx').on(table.tenantId, table.isActive),
]);

// ============================================
// 2. 運費率表 / 运费率表
// ============================================

export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 配送業者 / 配送业者
  carrierId: uuid('carrier_id').notNull(),
  carrierName: text('carrier_name'),
  // 料金プラン名 / 费率方案名
  name: text('name').notNull(),

  // サイズ条件 / 尺寸条件
  sizeType: text('size_type').notNull().default('flat'),  // weight | dimension | flat
  sizeMin: numeric('size_min'),
  sizeMax: numeric('size_max'),

  // 地区条件（都道府県リスト）/ 地区条件（都道府县列表）
  fromPrefectures: jsonb('from_prefectures'),  // string[]
  toPrefectures: jsonb('to_prefectures'),      // string[]

  // 料金 / 费用
  basePrice: numeric('base_price').notNull().default('0'),
  coolSurcharge: numeric('cool_surcharge').notNull().default('0'),   // クール便追加 / 冷藏附加
  codSurcharge: numeric('cod_surcharge').notNull().default('0'),     // 代金引換手数料 / 货到付款手续费
  fuelSurcharge: numeric('fuel_surcharge').notNull().default('0'),   // 燃油サーチャージ / 燃油附加费

  // 有効期間 / 有效期间
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  isActive: boolean('is_active').default(true).notNull(),

  // 備考 / 备注
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('shipping_rates_tenant_carrier_idx').on(table.tenantId, table.carrierId),
  index('shipping_rates_tenant_active_idx').on(table.tenantId, table.isActive),
  index('shipping_rates_tenant_carrier_active_idx').on(table.tenantId, table.carrierId, table.isActive),
]);

// ============================================
// 3. 作業チャージ / 作业费用
// ============================================

export const workCharges = pgTable('work_charges', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // チャージ種別 / 费用类型
  chargeType: text('charge_type').notNull(),
  // チャージ発生日 / 费用发生日
  chargeDate: date('charge_date').notNull(),

  // 参照 / 引用
  referenceType: text('reference_type').notNull().default('manual'),  // shipmentOrder | inboundOrder | returnOrder | stocktaking | manual
  referenceId: uuid('reference_id'),
  referenceNumber: text('reference_number'),

  // 荷主・子顧客・店舗 / 货主・子客户・店铺
  clientId: uuid('client_id'),
  clientName: text('client_name'),
  subClientId: uuid('sub_client_id'),
  subClientName: text('sub_client_name'),
  shopId: uuid('shop_id'),
  shopName: text('shop_name'),

  // 金額 / 金额
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price').notNull().default('0'),
  amount: numeric('amount').notNull().default('0'),
  description: text('description').notNull(),

  // 請求ステータス / 请求状态
  billingPeriod: text('billing_period'),       // 'YYYY-MM' 形式 / 格式
  billingRecordId: uuid('billing_record_id'),
  isBilled: boolean('is_billed').default(false).notNull(),

  // 備考 / 备注
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('work_charges_tenant_date_idx').on(table.tenantId, table.chargeDate),
  index('work_charges_tenant_client_billed_idx').on(table.tenantId, table.clientId, table.isBilled),
  index('work_charges_tenant_period_idx').on(table.tenantId, table.billingPeriod),
  index('work_charges_reference_idx').on(table.referenceId),
  index('work_charges_tenant_subclient_idx').on(table.tenantId, table.subClientId),
  index('work_charges_tenant_shop_idx').on(table.tenantId, table.shopId),
]);

// ============================================
// 4. 請求明細 / 请求明细
// ============================================

export const billingRecords = pgTable('billing_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 対象期間（'YYYY-MM'）/ 对象期间
  period: text('period').notNull(),
  // 荷主 / 货主
  clientId: uuid('client_id'),
  clientName: text('client_name'),
  // 配送業者 / 配送业者
  carrierId: uuid('carrier_id'),
  carrierName: text('carrier_name'),

  // 集計データ / 汇总数据
  orderCount: integer('order_count').notNull().default(0),
  totalQuantity: integer('total_quantity').notNull().default(0),
  totalShippingCost: numeric('total_shipping_cost').notNull().default('0'),
  handlingFee: numeric('handling_fee').notNull().default('0'),
  storageFee: numeric('storage_fee').notNull().default('0'),
  otherFees: numeric('other_fees').notNull().default('0'),
  totalAmount: numeric('total_amount').notNull().default('0'),

  // ステータス / 状态
  status: text('status').notNull().default('draft'),  // draft | confirmed | invoiced | paid
  confirmedAt: timestamp('confirmed_at'),
  confirmedBy: uuid('confirmed_by'),
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('billing_records_tenant_period_client_carrier_idx').on(
    table.tenantId, table.period, table.clientId, table.carrierId,
  ),
  index('billing_records_tenant_period_idx').on(table.tenantId, table.period),
  index('billing_records_tenant_client_idx').on(table.tenantId, table.clientId),
  index('billing_records_tenant_carrier_idx').on(table.tenantId, table.carrierId),
  index('billing_records_status_idx').on(table.status),
]);

// ============================================
// 5. 請求書 / 发票
// ============================================

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 請求書番号（自動採番: INV-202603-001）/ 发票编号（自动编号）
  invoiceNumber: text('invoice_number').notNull().unique(),
  // 関連請求明細 / 关联请求明细
  billingRecordId: uuid('billing_record_id').references(() => billingRecords.id),
  // 請求先 / 请求对象
  clientId: uuid('client_id'),
  clientName: text('client_name'),
  // 対象期間 / 对象期间
  period: text('period').notNull(),
  // 発行日 / 发行日
  issueDate: date('issue_date').notNull(),

  // 金額 / 金额
  subtotal: numeric('subtotal').notNull().default('0'),
  taxRate: numeric('tax_rate').notNull().default('0.10'),
  taxAmount: numeric('tax_amount').notNull().default('0'),
  totalAmount: numeric('total_amount').notNull().default('0'),

  // 支払期限 / 支付期限
  dueDate: date('due_date').notNull(),
  // ステータス / 状态
  status: text('status').notNull().default('draft'),  // draft | issued | sent | paid | overdue | cancelled
  // 明細行 / 明细行
  lineItems: jsonb('line_items').notNull().default([]),  // IInvoiceLineItem[]

  paidAt: timestamp('paid_at'),
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('invoices_tenant_period_idx').on(table.tenantId, table.period),
  index('invoices_tenant_client_idx').on(table.tenantId, table.clientId),
  index('invoices_tenant_status_idx').on(table.tenantId, table.status),
  index('invoices_billing_record_idx').on(table.billingRecordId),
  index('invoices_due_status_idx').on(table.dueDate, table.status),
]);
