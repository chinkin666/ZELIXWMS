// イベントリスナーモジュール / 事件监听器模块
// 全ドメインイベントリスナーを登録
// 注册所有领域事件监听器
import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module.js';
import { AuditListener } from './audit.listener.js';
import { WebhookListener } from './webhook.listener.js';
import { NotificationListener } from './notification.listener.js';

@Module({
  imports: [QueueModule],
  providers: [AuditListener, WebhookListener, NotificationListener],
  exports: [AuditListener, WebhookListener, NotificationListener],
})
export class ListenersModule {}
