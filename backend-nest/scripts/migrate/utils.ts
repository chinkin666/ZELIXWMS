/**
 * 移行ユーティリティ / 迁移工具函数
 *
 * MongoDB → PostgreSQL 移行で共通利用する関数群。
 * MongoDB → PostgreSQL 迁移中通用的工具函数集。
 */

import { v5 as uuidv5 } from 'uuid';

// ============================================
// ID変換 / ID转换
// ============================================

/**
 * UUID v5 名前空間（DNS）/ UUID v5 命名空间（DNS）
 * 決定論的変換: 同じ ObjectId → 常に同じ UUID
 * 确定性转换: 相同 ObjectId → 始终相同 UUID
 */
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * MongoDB ObjectId → UUID v5 変換（決定論的）
 * MongoDB ObjectId → UUID v5 转换（确定性）
 *
 * @param objectId - MongoDB ObjectId 文字列 / ObjectId 字符串
 * @returns UUID v5 文字列 / UUID v5 字符串
 */
export function objectIdToUuid(objectId: string): string {
  return uuidv5(objectId, NAMESPACE);
}

/**
 * MongoDB ObjectId → UUID v5 変換（null 安全）
 * MongoDB ObjectId → UUID v5 转换（null 安全）
 *
 * @param objectId - MongoDB ObjectId 文字列（null許容）/ ObjectId 字符串（可null）
 * @returns UUID v5 文字列 or null / UUID v5 字符串 或 null
 */
export function objectIdToUuidOrNull(objectId: string | null | undefined): string | null {
  if (!objectId) return null;
  return objectIdToUuid(objectId.toString());
}

// ============================================
// 日付変換 / 日期转换
// ============================================

/**
 * 任意の日付値を Date オブジェクトに変換
 * 将任意日期值转换为 Date 对象
 *
 * @param date - 変換元の値 / 源值
 * @returns Date or null（無効な場合）/ Date 或 null（无效时）
 */
export function toTimestamp(date: any): Date | null {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 日付を 'YYYY-MM-DD' 形式の文字列に変換
 * 将日期转换为 'YYYY-MM-DD' 格式字符串
 */
export function toDateString(date: any): string | null {
  const d = toTimestamp(date);
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

// ============================================
// バッチ処理 / 批量处理
// ============================================

/** バッチ処理結果 / 批量处理结果 */
export interface BatchResult {
  total: number;
  processed: number;
  errors: number;
}

/**
 * 配列をバッチに分割して処理する
 * 将数组分批处理
 *
 * @param items - 処理対象の配列 / 待处理数组
 * @param batchSize - 1バッチのサイズ / 每批大小
 * @param processor - バッチ処理関数 / 批量处理函数
 * @returns 処理結果のサマリー / 处理结果汇总
 */
export async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
): Promise<BatchResult> {
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await processor(batch);
      processed += batch.length;
      // 進捗ログ / 进度日志
      console.log(`  Progress: ${processed}/${items.length}`);
    } catch (err) {
      errors += batch.length;
      console.error(`  Batch error at offset ${i}:`, err);
    }
  }

  return { total: items.length, processed, errors };
}

// ============================================
// ログ / 日志
// ============================================

/**
 * 移行ステップの開始ログ / 迁移步骤开始日志
 */
export function logStart(name: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[START] ${name}`);
  console.log(`${'='.repeat(60)}`);
}

/**
 * 移行ステップの完了ログ / 迁移步骤完成日志
 */
export function logComplete(name: string, result: BatchResult): void {
  console.log(`[DONE]  ${name}: total=${result.total}, ok=${result.processed}, errors=${result.errors}`);
}

// ============================================
// 設定 / 配置
// ============================================

/** デフォルトバッチサイズ / 默认批量大小 */
export const DEFAULT_BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
