// Webhook イベントリスナー / Webhook事件监听器
// ドメインイベントを Webhook キューにディスパッチ
// 将领域事件分发到 Webhook 队列
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, OrderShippedEvent, InboundReceivedEvent } from '../events/domain-events.js';
import { QueueService } from '../../queue/queue.service.js';
import { QUEUE_NAMES } from '../../queue/queue.constants.js';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module.js';
import { webhooks } from '../../database/schema/extensions.js';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class WebhookListener {
  private readonly logger = new Logger(WebhookListener.name);

  constructor(
    private readonly queueService: QueueService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  // 出荷完了 → Webhook 送信 / 出货完成 → Webhook发送
  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: OrderShippedEvent) {
    await this.dispatchWebhooks(event.tenantId, 'order.shipped', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      trackingId: event.trackingId,
    });
  }

  // 入庫完了 → Webhook 送信 / 入库完成 → Webhook发送
  @OnEvent(DOMAIN_EVENTS.INBOUND_RECEIVED)
  async handleInboundReceived(event: InboundReceivedEvent) {
    await this.dispatchWebhooks(event.tenantId, 'inbound.received', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      totalReceived: event.totalReceived,
    });
  }

  // テナントの有効 Webhook を検索してキューに追加 / 查找租户的有效Webhook并加入队列
  private async dispatchWebhooks(tenantId: string, eventName: string, payload: any) {
    try {
      const activeWebhooks = await this.db
        .select()
        .from(webhooks)
        .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.enabled, true)));

      for (const wh of activeWebhooks) {
        const events = (wh.events as string[]) || [];
        if (events.includes(eventName) || events.includes('*')) {
          await this.queueService.addJob(QUEUE_NAMES.WEBHOOK, `webhook-${wh.id}`, {
            url: wh.url,
            event: eventName,
            payload,
            secret: wh.secret,
          }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
          this.logger.debug(`Webhook queued: ${eventName} → ${wh.url}`);
        }
      }
    } catch (error) {
      this.logger.error(`Webhook dispatch error for ${eventName}`, (error as Error).message);
    }
  }
}
