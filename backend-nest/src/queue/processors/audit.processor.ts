// 監査ログプロセッサ / 审计日志处理器
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE } from '../../database/database.module.js';
import { operationLogs } from '../../database/schema/settings.js';
import { QUEUE_NAMES } from '../queue.constants.js';
import type { DrizzleDB } from '../../database/database.types.js';

@Processor(QUEUE_NAMES.AUDIT)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { tenantId, userId, action, resourceType, resourceId, changes, metadata } = job.data;
    this.logger.debug(`Audit log: ${action} ${resourceType} ${resourceId}`);

    await this.db.insert(operationLogs).values({
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      changes: changes || null,
      metadata: metadata || null,
      createdAt: new Date(),
    });

    return { logged: true };
  }
}
