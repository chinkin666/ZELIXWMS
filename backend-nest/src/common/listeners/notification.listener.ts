// 通知イベントリスナー / 通知事件监听器
// ドメインイベントに基づいて通知を生成
// 基于领域事件生成通知
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and } from 'drizzle-orm';
import { DOMAIN_EVENTS, OrderShippedEvent, InboundReceivedEvent, BillingGeneratedEvent } from '../events/domain-events.js';
import { QueueService } from '../../queue/queue.service.js';
import { QUEUE_NAMES } from '../../queue/queue.constants.js';
import { DRIZZLE } from '../../database/database.module.js';
import { users } from '../../database/schema/users.js';
import type { DrizzleDB } from '../../database/database.types.js';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly queueService: QueueService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  // テナントの管理者ユーザーを検索 / 查找租户管理员用户
  private async findTenantAdmins(tenantId: string) {
    return this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin'), eq(users.isActive, true)));
  }

  // 管理者への通知をキューに追加 / 将通知加入管理员队列
  private async notifyAdmins(tenantId: string, type: string, payload: Record<string, unknown>) {
    const admins = await this.findTenantAdmins(tenantId);
    for (const admin of admins) {
      await this.queueService.addJob(QUEUE_NAMES.NOTIFICATION, type, {
        userId: admin.id,
        email: admin.email,
        ...payload,
      });
    }
    this.logger.debug(`Enqueued ${type} notification for ${admins.length} admin(s) in tenant ${tenantId}`);
  }

  // 出荷完了 → 通知 / 出货完成 → 通知
  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: OrderShippedEvent) {
    this.logger.debug(`Notification: order shipped ${event.orderNumber}`);
    await this.notifyAdmins(event.tenantId, 'order_shipped', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      trackingId: event.trackingId,
    });
  }

  // 入庫完了 → 通知 / 入库完成 → 通知
  @OnEvent(DOMAIN_EVENTS.INBOUND_RECEIVED)
  async handleInboundReceived(event: InboundReceivedEvent) {
    this.logger.debug(`Notification: inbound received ${event.orderNumber}`);
    await this.notifyAdmins(event.tenantId, 'inbound_received', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      totalReceived: event.totalReceived,
    });
  }

  // 請求生成 → 通知 / 账单生成 → 通知
  @OnEvent(DOMAIN_EVENTS.BILLING_GENERATED)
  async handleBillingGenerated(event: BillingGeneratedEvent) {
    this.logger.debug(`Notification: billing generated for period ${event.period}`);
    await this.notifyAdmins(event.tenantId, 'billing_generated', {
      billingRecordId: event.billingRecordId,
      period: event.period,
      clientId: event.clientId,
      totalAmount: event.totalAmount,
    });
  }
}
