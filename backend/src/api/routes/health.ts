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

    // Redis 状态判定 / Redis ステータス判定
    // REDIS_URL 未设置时视为未配置 / REDIS_URL 未設定の場合は未構成とみなす
    const redisConfigured = !!process.env.REDIS_URL;
    const redisReady = queueManager.isReady();
    const redisStatus: 'connected' | 'disconnected' | 'not_configured' =
      !redisConfigured ? 'not_configured' :
      redisReady ? 'connected' : 'disconnected';

    // 内存使用 / メモリ使用量
    const mem = process.memoryUsage();
    const memory = {
      rss: Math.round(mem.rss / 1024 / 1024),         // MB
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
      external: Math.round(mem.external / 1024 / 1024),   // MB
    };

    // 运行时间（秒） / アップタイム（秒）
    const uptimeSeconds = Math.floor(process.uptime());

    // 队列状态摘要 / キューステータス概要
    let queueStats: Awaited<ReturnType<typeof queueManager.getStats>> | null = null;
    if (redisReady) {
      try {
        queueStats = await queueManager.getStats();
      } catch (err) {
        logger.warn({ err }, 'Failed to fetch queue stats / キュー統計取得失敗');
      }
    }

    // 总体状态判定 / 総合ステータス判定
    // error: MongoDB 断开 / MongoDB 切断
    // degraded: MongoDB 连接但 Redis 断开 / MongoDB 接続中だが Redis 切断
    // ok: 全部正常 / すべて正常
    const status: 'ok' | 'degraded' | 'error' =
      !dbConnected ? 'error' :
      (redisConfigured && !redisReady) ? 'degraded' : 'ok';

    res.status(status === 'error' ? 503 : 200).json({
      status,
      version: getVersion(),
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      // 扁平字段，便于监控系统解析 / フラットフィールド、監視システム解析用
      mongodb: dbConnected ? 'connected' : 'disconnected',
      redis: redisStatus,
      memory,
      // 详细服务信息 / 詳細サービス情報
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          latencyMs: mongoLatency,
        },
        redis: {
          status: redisStatus,
        },
      },
      queues: queueStats,
    });
  } catch (err) {
    logger.error({ err }, 'Health check failed / ヘルスチェック失敗');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      mongodb: 'disconnected',
      redis: 'disconnected',
      memory: null,
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

/**
 * GET /health/readiness
 * 就绪探针：仅当数据库已连接时返回 200（Kubernetes 用）
 * 準備完了プローブ：データベース接続済みの場合のみ 200 を返す（Kubernetes 用）
 */
healthRouter.get('/readiness', (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (dbConnected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'Database not connected / データベース未接続' });
  }
});
