// 写真管理テーブル / 照片管理表
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// 写真 / 照片
// ============================================

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // エンティティ関連 / 实体关联
  entityType: text('entity_type').notNull(),                // product/inbound/shipment/inspection/return
  entityId: uuid('entity_id').notNull(),                    // 関連エンティティID / 关联实体ID

  // ファイル情報 / 文件信息
  filename: text('filename').notNull(),                     // 保存ファイル名 / 存储文件名
  originalFilename: text('original_filename'),              // 元ファイル名 / 原始文件名
  mimeType: text('mime_type'),                              // MIMEタイプ / MIME类型
  size: integer('size'),                                    // ファイルサイズ（バイト）/ 文件大小（字节）

  // URL情報 / URL信息
  url: text('url').notNull(),                               // ファイルURL / 文件URL
  thumbnailUrl: text('thumbnail_url'),                      // サムネイルURL / 缩略图URL

  // アップロード者 / 上传者
  uploadedBy: uuid('uploaded_by'),                          // アップロードユーザーID / 上传用户ID

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('photos_tenant_idx').on(table.tenantId),
  index('photos_entity_idx').on(table.entityType, table.entityId),
  index('photos_uploaded_by_idx').on(table.uploadedBy),
]);
