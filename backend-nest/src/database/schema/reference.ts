// 参照テーブル / 参考表（グローバル・テナント非依存）
import { pgTable, uuid, text, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

// 国コード / 国家代码
export const countryCodes = pgTable('country_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  numericCode: integer('numeric_code').notNull(),      // ISO 3166-1 数値コード / 数字代码
  alpha2: text('alpha2').notNull(),                    // ISO 3166-1 alpha-2 / 二字母代码
  alpha3: text('alpha3').notNull(),                    // ISO 3166-1 alpha-3 / 三字母代码
  nameJa: text('name_ja').notNull(),                   // 日本語名 / 日语名称
  nameEn: text('name_en').notNull(),                   // 英語名 / 英语名称
  region: text('region'),                              // 地域 / 地区
}, (table) => [
  uniqueIndex('country_codes_alpha2_idx').on(table.alpha2),
  uniqueIndex('country_codes_alpha3_idx').on(table.alpha3),
  index('country_codes_region_idx').on(table.region),
]);

// 取扱注意ラベルタイプ / 处理注意标签类型
export const handlingLabelTypes = pgTable('handling_label_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),               // ラベルコード / 标签代码
  nameJa: text('name_ja').notNull(),                   // 日本語名 / 日语名称
  nameEn: text('name_en').notNull(),                   // 英語名 / 英语名称
  nameZh: text('name_zh').notNull(),                   // 中国語名 / 中文名称
  icon: text('icon'),                                  // アイコン / 图标
  sortOrder: integer('sort_order').default(0).notNull(), // 表示順 / 排序
  isActive: boolean('is_active').default(true).notNull(), // 有効フラグ / 有效标志
}, (table) => [
  index('handling_label_types_sort_idx').on(table.sortOrder),
]);
