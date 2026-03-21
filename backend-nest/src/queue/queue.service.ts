// キューサービス / 队列服务
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';

@Injectable()
export class QueueService {
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AUDIT) private auditQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CSV_IMPORT) private csvImportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BILLING) private billingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT) private reportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCRIPT) private scriptQueue: Queue,
  ) {
    this.queues = new Map([
      [QUEUE_NAMES.WEBHOOK, webhookQueue],
      [QUEUE_NAMES.AUDIT, auditQueue],
      [QUEUE_NAMES.NOTIFICATION, notificationQueue],
      [QUEUE_NAMES.CSV_IMPORT, csvImportQueue],
      [QUEUE_NAMES.BILLING, billingQueue],
      [QUEUE_NAMES.REPORT, reportQueue],
      [QUEUE_NAMES.SCRIPT, scriptQueue],
    ]);
  }

  // キュー状態取得 / 获取队列状态
  async getQueueStatus() {
    const statuses = [];
    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts();
        statuses.push({ name, ...counts });
      } catch {
        statuses.push({ name, error: 'Unable to connect' });
      }
    }
    return { available: true, queues: statuses };
  }

  // ジョブ追加 / 添加任务
  async addJob(queueName: string, jobName: string, data: any, opts?: any) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    return queue.add(jobName, data, opts);
  }

  // キュークリーン / 清理队列
  async cleanQueue(queueName: string, grace?: number) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    await queue.clean(grace || 0, 1000, 'completed');
    await queue.clean(grace || 0, 1000, 'failed');
    return { cleaned: true };
  }
}
