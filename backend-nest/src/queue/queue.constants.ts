// キュー名定数 / 队列名常量
export const QUEUE_NAMES = {
  WEBHOOK: 'webhook',
  AUDIT: 'audit',
  NOTIFICATION: 'notification',
  CSV_IMPORT: 'csv-import',
  BILLING: 'billing',
  REPORT: 'report',
  SCRIPT: 'script',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
