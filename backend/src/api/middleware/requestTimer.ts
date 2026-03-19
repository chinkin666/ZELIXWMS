/**
 * 请求计时中间件 / リクエストタイマーミドルウェア
 *
 * 记录每个请求的响应时间，超过阈值时输出警告日志。
 * 各リクエストのレスポンスタイムを記録し、閾値超過時に警告ログを出力。
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/lib/logger';

// 慢请求阈值（毫秒） / 遅延リクエスト閾値（ミリ秒）
const SLOW_THRESHOLD_MS = 1000;

/**
 * requestTimer — レスポンスタイム計測ミドルウェア / 响应时间计测中间件
 *
 * - 在响应头中添加 X-Response-Time / レスポンスヘッダーに X-Response-Time を追加
 * - 超过 1000ms 时输出 warn 日志 / 1000ms 超過時に warn ログを出力
 */
export function requestTimer(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1_000_000);

    // 设置响应头（如果还未发送） / レスポンスヘッダー設定（未送信の場合）
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }

    // 慢请求警告 / 遅延リクエスト警告
    if (durationMs >= SLOW_THRESHOLD_MS) {
      logger.warn(
        {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs,
        },
        `Slow request detected (${durationMs}ms) / 遅延リクエスト検出 (${durationMs}ms)`,
      );
    } else {
      logger.debug(
        {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs,
        },
        'Request completed / リクエスト完了',
      );
    }
  });

  next();
}
