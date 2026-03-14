/**
 * 佐川急便 送り状种类定义 / 佐川急便 送り状種類定義
 */
export const SAGAWA_INVOICE_TYPES = [
  { invoiceType: '0', name: '元払い' },
  { invoiceType: '1', name: '着払い' },
  { invoiceType: '2', name: 'e-コレクト（代引き）' },
] as const;

/**
 * 配达时间带选项 / 配達時間帯オプション
 */
export const SAGAWA_TIME_ZONES = [
  { code: '', name: '指定なし' },
  { code: 'AM', name: '午前中' },
  { code: '12-14', name: '12:00-14:00' },
  { code: '14-16', name: '14:00-16:00' },
  { code: '16-18', name: '16:00-18:00' },
  { code: '18-20', name: '18:00-20:00' },
  { code: '18-21', name: '18:00-21:00' },
  { code: '19-21', name: '19:00-21:00' },
  { code: '20-21', name: '20:00-21:00' },
] as const;
