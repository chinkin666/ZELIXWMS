// ドメインイベント テスト / 领域事件测试
import {
  StockAdjustedEvent,
  OrderShippedEvent,
  InboundReceivedEvent,
  ReturnProcessedEvent,
  BillingGeneratedEvent,
  DOMAIN_EVENTS,
} from './domain-events.js';

describe('StockAdjustedEvent', () => {
  // プロパティが正しく保存される / 属性正确存储
  it('should store all properties correctly', () => {
    const event = new StockAdjustedEvent(
      'tenant-1',
      'prod-1',
      'loc-A1',
      -5,
      'order fulfillment',
      'user-1',
    );

    expect(event.tenantId).toBe('tenant-1');
    expect(event.productId).toBe('prod-1');
    expect(event.locationId).toBe('loc-A1');
    expect(event.quantityChange).toBe(-5);
    expect(event.reason).toBe('order fulfillment');
    expect(event.userId).toBe('user-1');
  });

  // オプションフィールドは省略可能 / 可选字段可以省略
  it('should allow optional userId to be undefined', () => {
    const event = new StockAdjustedEvent(
      'tenant-1',
      'prod-1',
      'loc-A1',
      10,
      'manual adjustment',
    );

    expect(event.userId).toBeUndefined();
  });
});

describe('OrderShippedEvent', () => {
  it('should store all properties correctly', () => {
    const event = new OrderShippedEvent(
      'tenant-1',
      'order-1',
      'ORD-2026-001',
      'carrier-yamato',
      'TRACK-123',
    );

    expect(event.tenantId).toBe('tenant-1');
    expect(event.orderId).toBe('order-1');
    expect(event.orderNumber).toBe('ORD-2026-001');
    expect(event.carrierId).toBe('carrier-yamato');
    expect(event.trackingId).toBe('TRACK-123');
  });

  it('should allow optional fields to be undefined', () => {
    const event = new OrderShippedEvent('tenant-1', 'order-1', 'ORD-001');

    expect(event.carrierId).toBeUndefined();
    expect(event.trackingId).toBeUndefined();
  });
});

describe('InboundReceivedEvent', () => {
  it('should store all properties correctly', () => {
    const event = new InboundReceivedEvent(
      'tenant-1',
      'inb-1',
      'INB-2026-001',
      150,
    );

    expect(event.tenantId).toBe('tenant-1');
    expect(event.orderId).toBe('inb-1');
    expect(event.orderNumber).toBe('INB-2026-001');
    expect(event.totalReceived).toBe(150);
  });
});

describe('ReturnProcessedEvent', () => {
  it('should store all properties correctly', () => {
    const event = new ReturnProcessedEvent(
      'tenant-1',
      'ret-1',
      'RET-2026-001',
      'restock',
    );

    expect(event.tenantId).toBe('tenant-1');
    expect(event.returnOrderId).toBe('ret-1');
    expect(event.orderNumber).toBe('RET-2026-001');
    expect(event.disposition).toBe('restock');
  });
});

describe('BillingGeneratedEvent', () => {
  it('should store all properties correctly', () => {
    const event = new BillingGeneratedEvent(
      'tenant-1',
      'bill-1',
      '2026-03',
      'client-1',
      125000,
    );

    expect(event.tenantId).toBe('tenant-1');
    expect(event.billingRecordId).toBe('bill-1');
    expect(event.period).toBe('2026-03');
    expect(event.clientId).toBe('client-1');
    expect(event.totalAmount).toBe(125000);
  });
});

describe('DOMAIN_EVENTS', () => {
  // 全期待イベント名を含む / 包含所有预期事件名称
  it('should contain all expected event names', () => {
    expect(DOMAIN_EVENTS.STOCK_ADJUSTED).toBe('stock.adjusted');
    expect(DOMAIN_EVENTS.STOCK_RESERVED).toBe('stock.reserved');
    expect(DOMAIN_EVENTS.STOCK_MOVED).toBe('stock.moved');
    expect(DOMAIN_EVENTS.ORDER_CREATED).toBe('order.created');
    expect(DOMAIN_EVENTS.ORDER_SHIPPED).toBe('order.shipped');
    expect(DOMAIN_EVENTS.INBOUND_RECEIVED).toBe('inbound.received');
    expect(DOMAIN_EVENTS.INBOUND_COMPLETED).toBe('inbound.completed');
    expect(DOMAIN_EVENTS.RETURN_PROCESSED).toBe('return.processed');
    expect(DOMAIN_EVENTS.BILLING_GENERATED).toBe('billing.generated');
    expect(DOMAIN_EVENTS.USER_CREATED).toBe('user.created');
  });

  // 10個のイベントが定義されている / 定义了10个事件
  it('should have exactly 10 event types', () => {
    expect(Object.keys(DOMAIN_EVENTS)).toHaveLength(10);
  });
});
