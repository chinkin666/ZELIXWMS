// RSLサービスのテスト / RSL服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { RslService } from './rsl.service';
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

describe('RslService', () => {
  let service: RslService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const planId = 'rsl-plan-001';

  const mockPlan = {
    id: planId,
    tenantId,
    name: 'RSL Shipment Q1',
    status: 'draft',
    confirmedAt: null,
    shippedAt: null,
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RslService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<RslService>(RslService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== findAllPlans =====
  describe('findAllPlans', () => {
    it('should return paginated plans', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockPlan]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAllPlans(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockPlan]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAllPlans(tenantId, { status: 'confirmed' });

      expect(result.items).toEqual([]);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAllPlans(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });

    it('should default page to 1 and limit to 20', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAllPlans(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ===== findPlanById =====
  describe('findPlanById', () => {
    it('should return a plan by id', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));

      const result = await service.findPlanById(tenantId, planId);

      expect(result).toEqual(mockPlan);
    });

    it('should throw WmsException RSL_PLAN_NOT_FOUND when not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findPlanById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include plan id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findPlanById(tenantId, 'rsl-missing');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('RSL-001');
        expect(e.getResponse().details).toContain('rsl-missing');
      }
    });
  });

  // ===== createPlan =====
  describe('createPlan', () => {
    it('should create a plan with draft status', async () => {
      const created = { ...mockPlan, status: 'draft' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.createPlan(tenantId, { name: 'RSL Shipment' });

      expect(result.status).toBe('draft');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should always set status to draft', async () => {
      const created = { ...mockPlan, status: 'draft' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.createPlan(tenantId, { name: 'Test', status: 'confirmed' });

      expect(result.status).toBe('draft');
    });
  });

  // ===== updatePlan =====
  describe('updatePlan', () => {
    it('should update a plan', async () => {
      const updated = { ...mockPlan, name: 'Updated' };
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updatePlan(tenantId, planId, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw WmsException when plan does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.updatePlan(tenantId, 'nonexistent', {}),
      ).rejects.toThrow(WmsException);
    });
  });

  // ===== confirmPlan =====
  describe('confirmPlan', () => {
    it('should confirm a plan', async () => {
      const confirmed = { ...mockPlan, status: 'confirmed', confirmedAt: new Date() };
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));
      mockDb.returning.mockResolvedValueOnce([confirmed]);

      const result = await service.confirmPlan(tenantId, planId);

      expect(result.status).toBe('confirmed');
      expect(result.confirmedAt).toBeDefined();
    });

    it('should throw WmsException when confirming nonexistent plan', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.confirmPlan(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // ===== shipPlan =====
  describe('shipPlan', () => {
    it('should ship a plan', async () => {
      const shipped = { ...mockPlan, status: 'shipped', shippedAt: new Date() };
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));
      mockDb.returning.mockResolvedValueOnce([shipped]);

      const result = await service.shipPlan(tenantId, planId);

      expect(result.status).toBe('shipped');
      expect(result.shippedAt).toBeDefined();
    });

    it('should throw WmsException when shipping nonexistent plan', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.shipPlan(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // ===== cancelPlan =====
  describe('cancelPlan', () => {
    it('should cancel a plan', async () => {
      const cancelled = { ...mockPlan, status: 'cancelled' };
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));
      mockDb.returning.mockResolvedValueOnce([cancelled]);

      const result = await service.cancelPlan(tenantId, planId);

      expect(result.status).toBe('cancelled');
    });

    it('should throw WmsException when cancelling nonexistent plan', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.cancelPlan(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
