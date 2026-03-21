// 通知イベントリスナー / 通知事件监听器
// ドメインイベントに基づいて通知を生成
// 基于领域事件生成通知
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, OrderShippedEvent, InboundReceivedEvent, BillingGeneratedEvent } from '../events/domain-events.js';
import { QueueService } from '../../queue/queue.service.js';
import { QUEUE_NAMES } from '../../queue/queue.constants.js';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly queueService: QueueService) {}

  // 出荷完了 → 通知 / 出货完成 → 通知
  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: OrderShippedEvent) {
    this.logger.debug(`Notification: order shipped ${event.orderNumber}`);
    // TODO: テナントの管理者ユーザーを検索して通知 / 查找租户管理员用户发送通知
  }

  // 入庫完了 → 通知 / 入库完成 → 通知
  @OnEvent(DOMAIN_EVENTS.INBOUND_RECEIVED)
  async handleInboundReceived(event: InboundReceivedEvent) {
    this.logger.debug(`Notification: inbound received ${event.orderNumber}`);
  }

  // 請求生成 → 通知 / 账单生成 → 通知
  @OnEvent(DOMAIN_EVENTS.BILLING_GENERATED)
  async handleBillingGenerated(event: BillingGeneratedEvent) {
    this.logger.debug(`Notification: billing generated for period ${event.period}`);
  }
}
