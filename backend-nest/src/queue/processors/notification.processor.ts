// 通知プロセッサ / 通知处理器
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE } from '../../database/database.module.js';
import { notifications } from '../../database/schema/settings.js';
import { QUEUE_NAMES } from '../queue.constants.js';
import type { DrizzleDB } from '../../database/database.types.js';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { tenantId, userId, title, body, type, referenceType, referenceId } = job.data;
    this.logger.log(`Notification: ${type} → ${userId}: ${title}`);

    await this.db.insert(notifications).values({
      tenantId,
      userId,
      title,
      body: body || null,
      type,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      createdAt: new Date(),
    });

    return { sent: true };
  }
}
