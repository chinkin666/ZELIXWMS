// パススルーサービスのテスト / 直通服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { PassthroughService } from './passthrough.service';
import { WmsException } from '../common/exceptions/wms.exception';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('PassthroughService', () => {
  let service: PassthroughService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const orderId = 'pt-001';

  const mockOrder = {
    id: orderId,
    tenantId,
    orderNumber: 'PT-2026-001',
    status: 'draft',
    confirmedAt: null,
    receivedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PassthroughService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<PassthroughService>(PassthroughService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== findAll =====
  describe('findAll', () => {
    it('should return paginated orders', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockOrder]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { status: 'confirmed' });

      expect(result.items).toEqual([]);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });

    it('should default page and limit', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ===== findById =====
  describe('findById', () => {
    it('should return an order by id', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));

      const result = await service.findById(tenantId, orderId);

      expect(result).toEqual(mockOrder);
    });

    it('should throw WmsException PASSTHROUGH_NOT_FOUND when not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include order id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findById(tenantId, 'pt-missing');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('PASS-001');
        expect(e.getResponse().details).toContain('pt-missing');
      }
    });
  });

  // ===== create =====
  describe('create', () => {
    it('should create an order with draft status', async () => {
      const created = { ...mockOrder, status: 'draft' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.create(tenantId, { orderNumber: 'PT-2026-001' });

      expect(result.status).toBe('draft');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ===== update - valid status transitions =====
  describe('update - status transitions', () => {
    it('should transition from draft to confirmed', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      const confirmedOrder = { ...mockOrder, status: 'confirmed', confirmedAt: new Date() };

      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));
      mockDb.returning.mockResolvedValueOnce([confirmedOrder]);

      const result = await service.update(tenantId, orderId, { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
    });

    it('should transition from draft to cancelled', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      const cancelledOrder = { ...mockOrder, status: 'cancelled', cancelledAt: new Date() };

      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));
      mockDb.returning.mockResolvedValueOnce([cancelledOrder]);

      const result = await service.update(tenantId, orderId, { status: 'cancelled' });

      expect(result.status).toBe('cancelled');
    });

    it('should transition from confirmed to receiving', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      const receivingOrder = { ...mockOrder, status: 'receiving', receivedAt: new Date() };

      mockDb.select.mockReturnValueOnce(createChain([confirmedOrder]));
      mockDb.returning.mockResolvedValueOnce([receivingOrder]);

      const result = await service.update(tenantId, orderId, { status: 'receiving' });

      expect(result.status).toBe('receiving');
    });

    it('should transition from receiving to completed', async () => {
      const receivingOrder = { ...mockOrder, status: 'receiving' };
      const completedOrder = { ...mockOrder, status: 'completed', completedAt: new Date() };

      mockDb.select.mockReturnValueOnce(createChain([receivingOrder]));
      mockDb.returning.mockResolvedValueOnce([completedOrder]);

      const result = await service.update(tenantId, orderId, { status: 'completed' });

      expect(result.status).toBe('completed');
    });

    it('should update fields without status change', async () => {
      const updated = { ...mockOrder, notes: 'Updated notes' };
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update(tenantId, orderId, { notes: 'Updated notes' });

      expect(result.notes).toBe('Updated notes');
    });
  });

  // ===== update - invalid status transitions =====
  describe('update - invalid status transitions', () => {
    it('should throw WmsException for draft -> receiving', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'receiving' }),
      ).rejects.toThrow(WmsException);
    });

    it('should throw WmsException for draft -> completed', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'completed' }),
      ).rejects.toThrow(WmsException);
    });

    it('should throw WmsException for completed -> any', async () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      mockDb.select.mockReturnValueOnce(createChain([completedOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'draft' }),
      ).rejects.toThrow(WmsException);
    });

    it('should throw WmsException for cancelled -> any', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      mockDb.select.mockReturnValueOnce(createChain([cancelledOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'draft' }),
      ).rejects.toThrow(WmsException);
    });

    it('should include status names in invalid transition error', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));

      try {
        await service.update(tenantId, orderId, { status: 'completed' });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('PASS-002');
        expect(e.getResponse().details).toContain('draft');
        expect(e.getResponse().details).toContain('completed');
      }
    });

    it('should throw WmsException for confirmed -> completed (skip receiving)', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      mockDb.select.mockReturnValueOnce(createChain([confirmedOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'completed' }),
      ).rejects.toThrow(WmsException);
    });

    it('should throw WmsException for receiving -> cancelled', async () => {
      const receivingOrder = { ...mockOrder, status: 'receiving' };
      mockDb.select.mockReturnValueOnce(createChain([receivingOrder]));

      await expect(
        service.update(tenantId, orderId, { status: 'cancelled' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // ===== arrive =====
  describe('arrive', () => {
    it('should transition to confirmed via arrive shortcut', async () => {
      const draftOrder = { ...mockOrder, status: 'draft' };
      const confirmed = { ...mockOrder, status: 'confirmed', confirmedAt: new Date() };
      mockDb.select.mockReturnValueOnce(createChain([draftOrder]));
      mockDb.returning.mockResolvedValueOnce([confirmed]);

      const result = await service.arrive(tenantId, orderId);

      expect(result.status).toBe('confirmed');
    });
  });

  // ===== ship =====
  describe('ship', () => {
    it('should transition to receiving via ship shortcut', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      const receiving = { ...mockOrder, status: 'receiving', receivedAt: new Date() };
      mockDb.select.mockReturnValueOnce(createChain([confirmedOrder]));
      mockDb.returning.mockResolvedValueOnce([receiving]);

      const result = await service.ship(tenantId, orderId);

      expect(result.status).toBe('receiving');
    });
  });

  // ===== getDashboard =====
  describe('getDashboard', () => {
    it('should return dashboard with summary and recent orders', async () => {
      // groupBy counts
      mockDb.select.mockReturnValueOnce(
        createChain([
          { status: 'draft', count: 3 },
          { status: 'confirmed', count: 2 },
        ]),
      );
      // recent orders
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));

      const result = await service.getDashboard(tenantId);

      expect(result.tenantId).toBe(tenantId);
      expect(result.summary).toBeDefined();
      expect(result.summary.draft).toBe(3);
      expect(result.summary.confirmed).toBe(2);
      expect(result.summary.total).toBe(5);
      expect(result.recentOrders).toHaveLength(1);
    });

    it('should return zero counts when no orders exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getDashboard(tenantId);

      expect(result.summary.total).toBe(0);
      expect(result.summary.draft).toBe(0);
      expect(result.recentOrders).toEqual([]);
    });
  });
});
