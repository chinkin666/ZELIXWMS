// 監査イベントリスナー / 审计事件监听器
// ドメインイベントを BullMQ 監査キューにディスパッチ
// 将领域事件分发到 BullMQ 审计队列
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, StockAdjustedEvent, OrderShippedEvent, InboundReceivedEvent, ReturnProcessedEvent } from '../events/domain-events.js';
import { QueueService } from '../../queue/queue.service.js';
import { QUEUE_NAMES } from '../../queue/queue.constants.js';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly queueService: QueueService) {}

  // 在庫調整 → 監査ログ / 库存调整 → 审计日志
  @OnEvent(DOMAIN_EVENTS.STOCK_ADJUSTED)
  async handleStockAdjusted(event: StockAdjustedEvent) {
    this.logger.debug(`Audit: stock.adjusted product=${event.productId}`);
    await this.queueService.addJob(QUEUE_NAMES.AUDIT, 'stock-adjusted', {
      tenantId: event.tenantId,
      userId: event.userId,
      action: 'adjust',
      resourceType: 'stock',
      resourceId: event.productId,
      changes: { quantityChange: event.quantityChange, reason: event.reason },
    });
  }

  // 出荷完了 → 監査ログ / 出货完成 → 审计日志
  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: OrderShippedEvent) {
    this.logger.debug(`Audit: order.shipped order=${event.orderNumber}`);
    await this.queueService.addJob(QUEUE_NAMES.AUDIT, 'order-shipped', {
      tenantId: event.tenantId,
      action: 'ship',
      resourceType: 'shipment_order',
      resourceId: event.orderId,
      metadata: { orderNumber: event.orderNumber, trackingId: event.trackingId },
    });
  }

  // 入庫完了 → 監査ログ / 入库完成 → 审计日志
  @OnEvent(DOMAIN_EVENTS.INBOUND_RECEIVED)
  async handleInboundReceived(event: InboundReceivedEvent) {
    this.logger.debug(`Audit: inbound.received order=${event.orderNumber}`);
    await this.queueService.addJob(QUEUE_NAMES.AUDIT, 'inbound-received', {
      tenantId: event.tenantId,
      action: 'receive',
      resourceType: 'inbound_order',
      resourceId: event.orderId,
      metadata: { orderNumber: event.orderNumber, totalReceived: event.totalReceived },
    });
  }

  // 返品処理 → 監査ログ / 退货处理 → 审计日志
  @OnEvent(DOMAIN_EVENTS.RETURN_PROCESSED)
  async handleReturnProcessed(event: ReturnProcessedEvent) {
    this.logger.debug(`Audit: return.processed order=${event.orderNumber}`);
    await this.queueService.addJob(QUEUE_NAMES.AUDIT, 'return-processed', {
      tenantId: event.tenantId,
      action: 'process',
      resourceType: 'return_order',
      resourceId: event.returnOrderId,
      metadata: { orderNumber: event.orderNumber, disposition: event.disposition },
    });
  }
}
