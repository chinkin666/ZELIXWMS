/**
 * 健康检查路由 / ヘルスチェックルート
 *
 * 提供详细的系统状态信息，包括数据库、Redis、内存、队列等。
 * データベース、Redis、メモリ、キューなどの詳細なシステムステータスを提供。
 */

import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { queueManager } from '@/core/queue';
import { logger } from '@/lib/logger';

// 服务器启动时间 / サーバー起動時刻
const startTime = Date.now();

// package.json のバージョンをキャッシュ / package.json 版本缓存
let cachedVersion: string | null = null;
function getVersion(): string {
  if (!cachedVersion) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('../../../package.json');
      cachedVersion = pkg.version || 'unknown';
    } catch {
      cachedVersion = 'unknown';
    }
  }
  return cachedVersion!;
}

/**
 * MongoDB ping 延迟测量 / MongoDB ping レイテンシ測定
 */
async function measureMongoLatency(): Promise<number | null> {
  try {
    const start = Date.now();
    await mongoose.connection.db?.admin().ping();
    return Date.now() - start;
  } catch {
    return null;
  }
}

export const healthRouter = Router();

/**
 * GET /health
 * 详细健康检查 / 詳細ヘルスチェック
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // MongoDB 状态 / MongoDB ステータス
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1;
    const mongoLatency = dbConnected ? await measureMongoLatency() : null;

    // Redis 状态 / Redis ステータス
    const redisReady = queueManager.isReady();

    // 内存使用 / メモリ使用量
    const mem = process.memoryUsage();
    const memory = {
      rss: Math.round(mem.rss / 1024 / 1024),         // MB
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
      external: Math.round(mem.external / 1024 / 1024),   // MB
    };

    // 运行时间 / アップタイム
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // 队列状态摘要 / キューステータス概要
    let queueStats: Awaited<ReturnType<typeof queueManager.getStats>> | null = null;
    if (redisReady) {
      try {
        queueStats = await queueManager.getStats();
      } catch (err) {
        logger.warn({ err }, 'Failed to fetch queue stats / キュー統計取得失敗');
      }
    }

    // 总体判定 / 総合判定：MongoDB 必须连接 / MongoDB は必須
    const allOk = dbConnected;

    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      version: getVersion(),
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          latencyMs: mongoLatency,
        },
        redis: {
          status: redisReady ? 'connected' : 'unavailable',
        },
      },
      memory,
      queues: queueStats,
    });
  } catch (err) {
    logger.error({ err }, 'Health check failed / ヘルスチェック失敗');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed / ヘルスチェック失敗',
    });
  }
});

/**
 * GET /health/liveness
 * 简单存活探针（Kubernetes 用） / シンプル存活プローブ（Kubernetes 用）
 */
healthRouter.get('/liveness', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});
