/**
 * 日本郵便ゆうパック 配送種類・時間帯定義 / 日本邮政Yu-Pack 配送类型和时间段定义
 */

/** 配送種類 / 配送类型 */
export const YUPACK_DELIVERY_TYPES = [
  { code: '0', name: 'ゆうパック（通常）' },
  { code: '1', name: 'セキュリティゆうパック' },
  { code: '2', name: 'ゴルフゆうパック' },
  { code: '3', name: 'スキーゆうパック' },
  { code: '4', name: '空港ゆうパック' },
  { code: '5', name: 'チルドゆうパック' },
] as const;

/** 配達時間帯 / 配送时间段 */
export const YUPACK_TIME_ZONES = [
  { code: '', name: '指定なし' },
  { code: '0812', name: '午前中（08:00-12:00）' },
  { code: '1214', name: '12:00-14:00' },
  { code: '1416', name: '14:00-16:00' },
  { code: '1618', name: '16:00-18:00' },
  { code: '1820', name: '18:00-20:00' },
  { code: '1921', name: '19:00-21:00' },
  { code: '2021', name: '20:00-21:00' },
] as const;

/** サイズ区分 / 尺寸分类 */
export const YUPACK_SIZES = [
  { code: '60', name: '60サイズ（~60cm）', maxWeight: 25 },
  { code: '80', name: '80サイズ（~80cm）', maxWeight: 25 },
  { code: '100', name: '100サイズ（~100cm）', maxWeight: 25 },
  { code: '120', name: '120サイズ（~120cm）', maxWeight: 25 },
  { code: '140', name: '140サイズ（~140cm）', maxWeight: 25 },
  { code: '160', name: '160サイズ（~160cm）', maxWeight: 25 },
  { code: '170', name: '170サイズ（~170cm）', maxWeight: 25 },
] as const;
