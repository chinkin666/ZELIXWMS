/**
 * 队列监控 API 控制器 / キュー監視 API コントローラ
 *
 * 队列状态 + 清理
 * キューステータス + クリーンアップ
 */

import type { Request, Response } from 'express';
import { queueManager, QUEUE_NAMES } from '@/core/queue';
import type { QueueName } from '@/core/queue';

/**
 * GET /api/extensions/queues/stats
 * 队列状态概览 / キューステータス概要
 */
export async function getQueueStats(_req: Request, res: Response) {
  try {
    if (!queueManager.isReady()) {
      res.json({
        available: false,
        message: 'Redis not connected, queue features disabled / Redis 未接続、キュー機能無効',
        queues: [],
      });
      return;
    }

    const stats = await queueManager.getStats();
    res.json({
      available: true,
      queues: stats,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/queues/:name/clean
 * 清理队列 / キュークリーンアップ
 */
export async function cleanQueue(req: Request, res: Response) {
  try {
    const queueName = req.params.name as QueueName;
    const validNames = Object.values(QUEUE_NAMES);
    if (!validNames.includes(queueName)) {
      res.status(400).json({
        error: `Invalid queue name. Valid: ${validNames.join(', ')}`,
      });
      return;
    }

    if (!queueManager.isReady()) {
      res.status(503).json({ error: 'Queue not available / キュー利用不可' });
      return;
    }

    const grace = Number(req.query.grace) || 60_000;
    const result = await queueManager.cleanQueue(queueName, grace);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
