// Webhook プロセッサ / Webhook处理器
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';

@Processor(QUEUE_NAMES.WEBHOOK)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job): Promise<any> {
    const { url, event, payload, secret } = job.data;
    this.logger.log(`Processing webhook: ${event} → ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Webhook-Secret': secret } : {}),
        },
        body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });

      return { status: response.status, success: response.ok };
    } catch (error: any) {
      this.logger.error(`Webhook failed: ${event} → ${url}`, error.message);
      throw error; // BullMQ がリトライする / BullMQ会重试
    }
  }
}
