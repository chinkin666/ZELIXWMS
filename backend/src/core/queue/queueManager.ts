/**
 * 队列管理器 / キューマネージャー
 *
 * 基于 BullMQ + ioredis，提供统一的队列管理。
 * BullMQ + ioredis ベースの統一キュー管理を提供。
 *
 * 队列 / キュー:
 * 1. webhook — Webhook 投递 / Webhook 配信
 * 2. script — 自动化脚本执行 / 自動化スクリプト実行
 * 3. audit — 审计日志写入 / 監査ログ書き込み
 */

import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@/lib/logger';

// 队列名称常量 / キュー名定数
export const QUEUE_NAMES = {
  WEBHOOK: 'wms-webhook',
  SCRIPT: 'wms-script',
  AUDIT: 'wms-audit',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// 队列任务类型 / キュージョブ型
export interface WebhookJobData {
  event: string;
  payload: Record<string, unknown>;
  webhookId: string;
  url: string;
  secret: string;
  attempt?: number;
  [key: string]: unknown;
}

export interface ScriptJobData {
  event: string;
  payload: Record<string, unknown>;
  scriptId: string;
  scriptName: string;
  [key: string]: unknown;
}

export interface AuditJobData {
  event: string;
  source: string;
  payload: Record<string, unknown>;
  tenantId?: string;
  duration: number;
  handlerCount: number;
  error?: string;
  [key: string]: unknown;
}

class QueueManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private initialized = false;

  /**
   * 初始化 Redis 连接和队列 / Redis 接続とキューを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // BullMQ 要求 / BullMQ 要件
        enableReadyCheck: false,
        retryStrategy(times: number) {
          // 重试3次后放弃，避免无限刷日志 / 3回リトライ後に諦め、ログ無限出力を防止
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        },
        lazyConnect: true,
      });

      let redisErrorLogged = false;
      this.connection.on('error', (err: Error) => {
        if (!redisErrorLogged) {
          logger.warn({ err: err.message }, 'Redis unavailable, queue features disabled / Redis 利用不可、キュー機能を無効化');
          redisErrorLogged = true;
        }
      });

      this.connection.on('connect', () => {
        redisErrorLogged = false;
        logger.info('Redis connected / Redis 接続完了');
      });

      await this.connection.connect();

      // 创建队列 / キューを作成
      for (const name of Object.values(QUEUE_NAMES)) {
        const queue = new Queue(name, {
          connection: this.connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
          },
        });
        this.queues.set(name, queue);
      }

      this.initialized = true;
      logger.info('QueueManager initialized / キューマネージャー初期化完了');
    } catch (err) {
      logger.error({ err }, 'QueueManager initialization failed / キューマネージャー初期化失敗');
      // Redis 不可用时不阻塞服务启动 / Redis 利用不可時はサービス起動をブロックしない
    }
  }

  /**
   * 添加任务到队列 / キューにジョブを追加
   */
  async addJob<T extends Record<string, unknown>>(
    queueName: QueueName,
    data: T,
    options?: { priority?: number; delay?: number },
  ): Promise<string | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      logger.warn({ queueName }, 'Queue not available, skipping job / キュー利用不可、ジョブをスキップ');
      return null;
    }

    try {
      const job = await queue.add(queueName, data, {
        priority: options?.priority,
        delay: options?.delay,
      });
      return job.id ?? null;
    } catch (err) {
      logger.error({ queueName, err }, 'Failed to add job / ジョブ追加失敗');
      return null;
    }
  }

  /**
   * 注册 Worker 处理函数 / Worker 処理関数を登録
   */
  registerWorker(
    queueName: QueueName,
    processor: (job: Job) => Promise<void>,
    concurrency = 5,
  ): void {
    if (!this.connection) {
      logger.warn({ queueName }, 'Cannot register worker, Redis not connected / Worker 登録不可、Redis 未接続');
      return;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency,
    });

    worker.on('completed', (job) => {
      logger.debug({ queueName, jobId: job.id }, 'Job completed / ジョブ完了');
    });

    worker.on('failed', (job, err) => {
      logger.error({ queueName, jobId: job?.id, err: err.message }, 'Job failed / ジョブ失敗');
    });

    this.workers.set(queueName, worker);
    logger.info({ queueName, concurrency }, 'Worker registered / Worker 登録完了');
  }

  /**
   * 获取队列实例 / キューインスタンスを取得
   */
  getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * 是否已初始化 / 初期化済みかどうか
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取所有队列的状态概览 / すべてのキューのステータス概要を取得
   */
  async getStats(): Promise<Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>> {
    const stats: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }> = [];

    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        stats.push({
          name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        });
      } catch {
        stats.push({ name, waiting: -1, active: -1, completed: -1, failed: -1, delayed: -1 });
      }
    }
    return stats;
  }

  /**
   * 清理指定队列的已完成/失败任务 / 指定キューの完了/失敗ジョブをクリーンアップ
   */
  async cleanQueue(queueName: QueueName, grace = 60_000): Promise<{ cleaned: number }> {
    const queue = this.queues.get(queueName);
    if (!queue) return { cleaned: 0 };

    const completed = await queue.clean(grace, 1000, 'completed');
    const failed = await queue.clean(grace, 1000, 'failed');
    return { cleaned: completed.length + failed.length };
  }

  /**
   * 关闭所有连接 / すべての接続を閉じる
   */
  async shutdown(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info({ name }, 'Worker closed / Worker を閉じました');
    }
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info({ name }, 'Queue closed / キューを閉じました');
    }
    if (this.connection) {
      await this.connection.quit();
      logger.info('Redis connection closed / Redis 接続を閉じました');
    }
    this.initialized = false;
  }
}

// 单例导出 / シングルトンエクスポート
export const queueManager = new QueueManager();
