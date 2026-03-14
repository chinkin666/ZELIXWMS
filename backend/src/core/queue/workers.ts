/**
 * 队列 Worker 注册 / キュー Worker 登録
 *
 * 各队列的具体处理逻辑。
 * 各キューの具体的な処理ロジック。
 */

import type { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { queueManager, QUEUE_NAMES } from './queueManager';
import type { WebhookJobData, ScriptJobData, AuditJobData } from './queueManager';
import { EventLog } from '@/models/eventLog';

/**
 * 注册所有 Worker / すべての Worker を登録
 */
export function registerWorkers(): void {
  if (!queueManager.isReady()) {
    logger.warn('QueueManager not ready, skipping worker registration / キューマネージャー未準備、Worker 登録をスキップ');
    return;
  }

  // Webhook Worker — 异步投递 / 非同期配信
  queueManager.registerWorker(
    QUEUE_NAMES.WEBHOOK,
    async (job: Job<WebhookJobData>) => {
      const { event, payload } = job.data;
      // 延迟导入避免循环依赖 / 循環依存回避のため遅延インポート
      const { extensionManager } = await import('@/core/extensions');
      await extensionManager.getWebhookDispatcher().dispatch(event, payload);
    },
    3,
  );

  // Script Worker — 脚本执行 / スクリプト実行
  queueManager.registerWorker(
    QUEUE_NAMES.SCRIPT,
    async (job: Job<ScriptJobData>) => {
      const { event, payload } = job.data;
      const { extensionManager } = await import('@/core/extensions');
      await extensionManager.getScriptRunner().executeForEvent(event, payload);
    },
    2,
  );

  // Audit Worker — 日志写入 / ログ書き込み
  queueManager.registerWorker(
    QUEUE_NAMES.AUDIT,
    async (job: Job<AuditJobData>) => {
      const { event, source, payload, tenantId, duration, handlerCount, error } = job.data;
      await EventLog.create({
        event,
        source,
        tenantId,
        status: error ? 'error' : 'processed',
        error,
        duration,
        handlerCount,
        payload,
      });
    },
    10,
  );

  logger.info('All queue workers registered / すべてのキュー Worker を登録完了');
}
