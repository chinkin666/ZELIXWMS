// ギフト設定テーブル / 礼品设置表
import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ギフトオプション / 礼品选项
export const giftOptions = pgTable('gift_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 出荷オーダーID / 出货订单ID
  shipmentOrderId: uuid('shipment_order_id').notNull(),

  // ギフトタイプ / 礼品类型 (wrapping/noshi/message_card/novelty)
  giftType: text('gift_type').notNull(),
  // オプション名 / 选项名称
  optionName: text('option_name'),
  // オプション値 / 选项值（ラッピング色、のし種類等 / 包装颜色、熨斗类型等）
  optionValue: text('option_value'),
  // メッセージ / 消息（メッセージカード用 / 贺卡用）
  message: text('message'),
  // 価格 / 价格
  price: numeric('price').default('0'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('gift_options_tenant_idx').on(table.tenantId),
  index('gift_options_shipment_order_idx').on(table.shipmentOrderId),
]);
