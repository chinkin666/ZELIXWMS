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

  // Audit Worker — 日志写入 + 定期ジョブ / ログ書き込み + 定期ジョブ
  queueManager.registerWorker(
    QUEUE_NAMES.AUDIT,
    async (job: Job<AuditJobData>) => {
      // 定期ジョブ: 期限切れ引当解放 / 定期任务: 过期预留释放
      if ((job.data as any).type === 'release-expired-reservations') {
        const { releaseExpiredReservations } = await import('@/services/inventoryService');
        const result = await releaseExpiredReservations(30);
        logger.info(
          { released: result.releasedCount },
          'Expired reservations released / 期限切れ引当を解放',
        );
        return;
      }

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

  // 定期ジョブ: 期限切れ引当解放（30分間隔）/ 定期任务: 过期预留释放（30分钟间隔）
  scheduleRecurringJobs().catch((err) => {
    logger.warn({ err }, 'Failed to schedule recurring jobs / 定期ジョブのスケジュール失敗');
  });

  logger.info('All queue workers registered / すべてのキュー Worker を登録完了');
}

/**
 * 定期ジョブをスケジュール / 定期任务调度
 */
async function scheduleRecurringJobs(): Promise<void> {
  const queue = queueManager.getQueue(QUEUE_NAMES.AUDIT);
  if (!queue) return;

  // 30分ごとに期限切れ引当を解放 / 30分ごとに期限切れ引当を解放
  await queue.add(
    'release-expired-reservations',
    { type: 'release-expired-reservations' },
    {
      repeat: { every: 30 * 60 * 1000 }, // 30分 / 30 minutes
      removeOnComplete: true,
      removeOnFail: { count: 10 },
    },
  );

  logger.info('Recurring jobs scheduled / 定期ジョブをスケジュール完了');
}

// Audit Worker も release-expired-reservations ジョブを処理する
// workers は registerWorkers 内で登録済み — Audit Worker がこのジョブを受け取る
