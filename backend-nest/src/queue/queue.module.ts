// キューモジュール / 队列模块
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueController } from './queue.controller.js';
import { QueueService } from './queue.service.js';
import { WebhookProcessor } from './processors/webhook.processor.js';
import { AuditProcessor } from './processors/audit.processor.js';
import { NotificationProcessor } from './processors/notification.processor.js';
import { QUEUE_NAMES } from './queue.constants.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    // 全キュー登録 / 注册所有队列
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WEBHOOK },
      { name: QUEUE_NAMES.AUDIT },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.CSV_IMPORT },
      { name: QUEUE_NAMES.BILLING },
      { name: QUEUE_NAMES.REPORT },
      { name: QUEUE_NAMES.SCRIPT },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService, WebhookProcessor, AuditProcessor, NotificationProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
