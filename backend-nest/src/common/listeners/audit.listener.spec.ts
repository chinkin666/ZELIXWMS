// 監査リスナーテスト / 审计监听器测试
import { AuditListener } from './audit.listener';
import { StockAdjustedEvent, OrderShippedEvent, InboundReceivedEvent, ReturnProcessedEvent } from '../events/domain-events';

describe('AuditListener / 監査リスナー / 审计监听器', () => {
  let listener: AuditListener;
  let mockQueueService: any;

  beforeEach(() => {
    mockQueueService = { addJob: jest.fn().mockResolvedValue({}) };
    listener = new AuditListener(mockQueueService);
  });

  // 在庫調整イベント → 監査キューにジョブ追加 / 库存调整事件 → 审计队列添加任务
  it('stock.adjusted で監査ジョブを追加する / stock.adjusted 添加审计任务', async () => {
    const event = new StockAdjustedEvent('T1', 'p1', 'loc1', 10, 'adjustment', 'u1');
    await listener.handleStockAdjusted(event);
    expect(mockQueueService.addJob).toHaveBeenCalledWith('audit', 'stock-adjusted', expect.objectContaining({
      tenantId: 'T1', action: 'adjust', resourceType: 'stock', resourceId: 'p1',
    }));
  });

  // 出荷完了イベント / 出货完成事件
  it('order.shipped で監査ジョブを追加する / order.shipped 添加审计任务', async () => {
    const event = new OrderShippedEvent('T1', 'o1', 'ORD-001', 'c1', 'TRK-001');
    await listener.handleOrderShipped(event);
    expect(mockQueueService.addJob).toHaveBeenCalledWith('audit', 'order-shipped', expect.objectContaining({
      tenantId: 'T1', action: 'ship', resourceType: 'shipment_order',
    }));
  });

  // 入庫完了イベント / 入库完成事件
  it('inbound.received で監査ジョブを追加する / inbound.received 添加审计任务', async () => {
    const event = new InboundReceivedEvent('T1', 'i1', 'INB-001', 50);
    await listener.handleInboundReceived(event);
    expect(mockQueueService.addJob).toHaveBeenCalledWith('audit', 'inbound-received', expect.objectContaining({
      action: 'receive', resourceType: 'inbound_order',
    }));
  });

  // 返品処理イベント / 退货处理事件
  it('return.processed で監査ジョブを追加する / return.processed 添加审计任务', async () => {
    const event = new ReturnProcessedEvent('T1', 'r1', 'RET-001', 'restock');
    await listener.handleReturnProcessed(event);
    expect(mockQueueService.addJob).toHaveBeenCalledWith('audit', 'return-processed', expect.objectContaining({
      action: 'process', resourceType: 'return_order',
    }));
  });
});
