// 商品マスタ（LOGIFAST全フィールド含む）/ 商品主数据（含LOGIFAST全字段）
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  nameFull: text('name_full'),
  nameEn: text('name_en'),
  // 略称 / 略称
  abbreviation: text('abbreviation'),
  category: text('category').default('0'),
  barcode: jsonb('barcode').default([]),  // string[]
  janCode: text('jan_code'),
  imageUrl: text('image_url'),
  memo: text('memo'),

  // 企業コード (8桁自動採番) / 企业编码 (8位自动编号)
  enterpriseCode: text('enterprise_code'),
  // お客様商品コード/ハウスコード (20桁) / 客户商品编码/自编码 (20位)
  houseCode: text('house_code'),

  // LOGIFAST: 顧客商品コード / 客户商品编码
  customerProductCode: text('customer_product_code'),
  // LOGIFAST: ブランド / 品牌
  brandCode: text('brand_code'),
  brandName: text('brand_name'),
  // LOGIFAST: サイズ・カラー / 尺码颜色
  sizeCode: text('size_code'),
  sizeName: text('size_name'),
  colorCode: text('color_code'),
  colorName: text('color_name'),
  // LOGIFAST: 単位区分 / 单位类型
  unitType: text('unit_type'),  // 01:ﾋﾟｰｽ/02:ｹｰｽ/03:ﾕﾆｯﾄ/04:ﾎﾞｯｸｽ/05:ﾛｰﾙ

  // 寸法・重量 / 尺寸重量
  width: numeric('width'),
  depth: numeric('depth'),
  height: numeric('height'),
  weight: numeric('weight'),          // N/W 净重
  grossWeight: numeric('gross_weight'), // G/W 毛重
  volume: numeric('volume'),           // M3

  // 外箱 / 外箱
  outerBoxWidth: numeric('outer_box_width'),
  outerBoxDepth: numeric('outer_box_depth'),
  outerBoxHeight: numeric('outer_box_height'),
  outerBoxVolume: numeric('outer_box_volume'),
  outerBoxWeight: numeric('outer_box_weight'),
  caseQuantity: integer('case_quantity'),

  // 価格 / 价格
  price: numeric('price'),
  costPrice: numeric('cost_price'),
  // 仕入単価 / 采购单价
  purchasePrice: numeric('purchase_price'),
  taxType: text('tax_type'),    // 01:課税/02:非課税
  // 税区分 / 税区分 (standard/reduced/exempt)
  taxCategory: text('tax_category'),
  taxRate: numeric('tax_rate'),
  currency: text('currency'),    // 1:JPY/2:RMB/3:USD

  // 配送 / 配送
  coolType: text('cool_type'),   // 0:常温/1:冷蔵/2:冷凍
  // 商品特性 / 商品特性 (normal/refrigerated/frozen/hazardous/as-is)
  productCharacteristic: text('product_characteristic').default('normal'),
  shippingSizeCode: text('shipping_size_code'),
  // 配送サイズ区分 / 配送尺寸分类 (SS/60/80/100/120/140/160/170/180/200/210/220/240/260)
  carrierSizeClass: text('carrier_size_class'),
  mailCalcEnabled: boolean('mail_calc_enabled').default(false),
  mailCalcMaxQuantity: integer('mail_calc_max_quantity'),

  // 管理区分 / 管理区分
  inventoryEnabled: boolean('inventory_enabled').default(false),
  lotTrackingEnabled: boolean('lot_tracking_enabled').default(false),
  expiryTrackingEnabled: boolean('expiry_tracking_enabled').default(false),
  serialTrackingEnabled: boolean('serial_tracking_enabled').default(false),
  alertDaysBeforeExpiry: integer('alert_days_before_expiry').default(30),
  inboundExpiryDays: integer('inbound_expiry_days'),
  safetyStock: integer('safety_stock').default(0),
  // 適正在庫数 / 适当库存数
  appropriateStock: integer('appropriate_stock'),
  allocationRule: text('allocation_rule').default('FIFO'),  // FIFO/FEFO/LIFO

  // 仕入先 / 供货方
  supplierCode: text('supplier_code'),
  supplierName: text('supplier_name'),

  // Amazon FBA / 乐天RSL
  fnsku: text('fnsku'),
  asin: text('asin'),
  amazonSku: text('amazon_sku'),
  fbaEnabled: boolean('fba_enabled').default(false),
  rakutenSku: text('rakuten_sku'),
  rslEnabled: boolean('rsl_enabled').default(false),

  // EC販売チャネルコード / EC销售渠道编码
  // { rakuten, amazon, yahoo, wowma, superDelivery, yahooAuction, mercari,
  //   makeshop, qoo10, zozo, rakuma, temu, base, stores, shopify, ecforce,
  //   colorMe, tiktok, line, netsea, shein, ecChannel22..ecChannel30 }
  ecChannelCodes: jsonb('ec_channel_codes').default({}),

  // 販売商品コード（モール別 Map）/ 各平台销售编码
  marketplaceCodes: jsonb('marketplace_codes').default({}),

  // B2B卸先商品コード / B2B客户编码
  // Array<{ code: string, name: string, customerCode: string }>
  b2bCustomerCodes: jsonb('b2b_customer_codes').default([]),
  // 卸先商品コード（B2B Map）/ B2B客户编码 (legacy)
  wholesalePartnerCodes: jsonb('wholesale_partner_codes').default({}),

  // その他 / 其他
  hazardousType: text('hazardous_type').default('0'),
  airTransportBan: boolean('air_transport_ban').default(false),
  // 航空輸送禁止フラグ / 航空运输禁止标志
  airProhibited: boolean('air_prohibited').default(false),
  barcodeCommission: boolean('barcode_commission').default(false),
  // バーコード外注フラグ / 条形码外包标志
  barcodeOutsourced: boolean('barcode_outsourced').default(false),
  reservationTarget: boolean('reservation_target').default(false),
  paidType: text('paid_type').default('0'),
  countryOfOrigin: text('country_of_origin'),
  // 原産国コード / 原产国编码
  originCountryCode: text('origin_country_code'),
  handlingTypes: jsonb('handling_types').default([]),
  defaultHandlingTags: jsonb('default_handling_tags').default([]),
  remarks: jsonb('remarks').default([]),
  customFields: jsonb('custom_fields').default({}),

  // 検品設定 / 验货设置
  // ロット検品 / 批次验货
  inspectionLot: boolean('inspection_lot').default(false),
  // 期限検品 / 有效期验货
  inspectionExpiry: boolean('inspection_expiry').default(false),
  // 照合検品 / 参照验货
  inspectionReference: boolean('inspection_reference').default(false),

  // セット/単品区分 / 套装/单品区分 (single/set)
  setProductFlag: text('set_product_flag').default('single'),

  // 入数/ケース / 每箱数量
  innerCount: integer('inner_count'),

  // ケース寸法 / 箱尺寸 (カートン/ケース梱包用)
  caseDimensionL: numeric('case_dimension_l'),
  caseDimensionW: numeric('case_dimension_w'),
  caseDimensionH: numeric('case_dimension_h'),
  caseWeight: numeric('case_weight'),
  caseVolume: numeric('case_volume'),

  // 倉庫メモ / 仓库备注
  whPreferredLocation: text('wh_preferred_location'),
  whHandlingNotes: text('wh_handling_notes'),
  whIsFragile: boolean('wh_is_fragile').default(false),
  whIsLiquid: boolean('wh_is_liquid').default(false),
  whRequiresOppBag: boolean('wh_requires_opp_bag').default(false),
  whStorageType: text('wh_storage_type'),  // ambient/chilled/frozen

  // サイズ査定ステータス / 尺寸评估状态 (pending/measured/confirmed)
  sizeAssessmentStatus: text('size_assessment_status').default('pending'),
  // 顧客の顧客の商品コード / 客户的客户的商品编码
  customerCustomerCodes: jsonb('customer_customer_codes').default({}),

  // 子SKU は別テーブル / 子SKU在单独表
  // 所属 / 归属
  clientId: uuid('client_id'),
  subClientId: uuid('sub_client_id'),
  shopId: uuid('shop_id'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('products_tenant_sku_idx').on(table.tenantId, table.sku),
  index('products_tenant_customer_code_idx').on(table.tenantId, table.customerProductCode),
  index('products_tenant_brand_idx').on(table.tenantId, table.brandCode),
  index('products_tenant_client_idx').on(table.tenantId, table.clientId),
  index('products_tenant_enterprise_code_idx').on(table.tenantId, table.enterpriseCode),
  index('products_tenant_house_code_idx').on(table.tenantId, table.houseCode),
]);

// セットマスタ / 套装主数据
export const setMaster = pgTable('set_master', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // セット商品 / 套装商品
  setProductId: uuid('set_product_id').references(() => products.id).notNull(),
  // 構成商品 / 组成商品
  componentProductId: uuid('component_product_id').references(() => products.id).notNull(),
  // 必要数量 / 所需数量
  quantity: integer('quantity').default(1).notNull(),
  // 並び順 / 排序
  sortOrder: integer('sort_order').default(0),
  // 備考 / 备注
  notes: text('notes'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('set_master_tenant_idx').on(table.tenantId),
  index('set_master_set_product_idx').on(table.setProductId),
]);

// 子SKU / 子SKU
export const productSubSkus = pgTable('product_sub_skus', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  subSku: text('sub_sku').notNull(),
  price: numeric('price'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
}, (table) => [
  uniqueIndex('sub_skus_product_code_idx').on(table.productId, table.subSku),
]);
