// ドメインイベント定義 / 领域事件定义

// 在庫調整イベント / 库存调整事件
export class StockAdjustedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
    public readonly locationId: string,
    public readonly quantityChange: number,
    public readonly reason: string,
    public readonly userId?: string,
  ) {}
}

// 出荷完了イベント / 出货完成事件
export class OrderShippedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly carrierId?: string,
    public readonly trackingId?: string,
  ) {}
}

// 入庫受領イベント / 入库接收事件
export class InboundReceivedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly totalReceived: number,
  ) {}
}

// 返品処理イベント / 退货处理事件
export class ReturnProcessedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly returnOrderId: string,
    public readonly orderNumber: string,
    public readonly disposition: string,
  ) {}
}

// 請求生成イベント / 账单生成事件
export class BillingGeneratedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly billingRecordId: string,
    public readonly period: string,
    public readonly clientId: string,
    public readonly totalAmount: number,
  ) {}
}

// イベント名定数 / 事件名称常量
export const DOMAIN_EVENTS = {
  STOCK_ADJUSTED: 'stock.adjusted',
  STOCK_RESERVED: 'stock.reserved',
  STOCK_MOVED: 'stock.moved',
  ORDER_CREATED: 'order.created',
  ORDER_SHIPPED: 'order.shipped',
  INBOUND_RECEIVED: 'inbound.received',
  INBOUND_COMPLETED: 'inbound.completed',
  RETURN_PROCESSED: 'return.processed',
  BILLING_GENERATED: 'billing.generated',
  USER_CREATED: 'user.created',
} as const;
