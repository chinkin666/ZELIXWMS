// APIログテーブル / API日志表
import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// APIリクエストログ / API请求日志
// ============================================

export const apiLogs = pgTable('api_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // リクエスト情報 / 请求信息
  method: text('method').notNull(),                         // HTTPメソッド / HTTP方法 (GET/POST/PUT/DELETE)
  path: text('path').notNull(),                             // リクエストパス / 请求路径
  statusCode: integer('status_code'),                       // HTTPステータスコード / HTTP状态码

  // ボディ / 请求体与响应体
  requestBody: jsonb('request_body'),                       // リクエストボディ / 请求体
  responseBody: jsonb('response_body'),                     // レスポンスボディ / 响应体

  // ユーザー情報 / 用户信息
  userId: uuid('user_id'),                                  // ユーザーID / 用户ID
  ip: text('ip'),                                           // IPアドレス / IP地址
  userAgent: text('user_agent'),                            // ユーザーエージェント / 用户代理

  // パフォーマンス / 性能
  duration: integer('duration'),                            // 処理時間（ミリ秒）/ 处理时间（毫秒）

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('api_logs_tenant_idx').on(table.tenantId),
  index('api_logs_created_idx').on(table.createdAt),
  index('api_logs_method_path_idx').on(table.method, table.path),
  index('api_logs_user_idx').on(table.userId),
  index('api_logs_status_idx').on(table.statusCode),
]);
