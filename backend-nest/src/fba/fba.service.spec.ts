// FBAサービスのテスト / FBA服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { FbaService } from './fba.service';
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

describe('FbaService', () => {
  let service: FbaService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const planId = 'plan-001';
  const boxId = 'box-001';

  const mockPlan = {
    id: planId,
    tenantId,
    name: 'FBA Shipment Q1',
    status: 'draft',
    confirmedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBox = {
    id: boxId,
    tenantId,
    shipmentPlanId: planId,
    boxNumber: 'BOX-001',
    weight: 5.0,
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
      providers: [FbaService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<FbaService>(FbaService);
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
      expect(result.total).toBe(0);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAllPlans(tenantId, { limit: 500 });

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

    it('should throw WmsException FBA_PLAN_NOT_FOUND when not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findPlanById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include plan id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findPlanById(tenantId, 'plan-missing');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().details).toContain('plan-missing');
      }
    });
  });

  // ===== createPlan =====
  describe('createPlan', () => {
    it('should create a plan with draft status', async () => {
      const created = { ...mockPlan, status: 'draft' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.createPlan(tenantId, { name: 'FBA Shipment Q1' });

      expect(result.status).toBe('draft');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should always set status to draft regardless of dto', async () => {
      const created = { ...mockPlan, status: 'draft' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.createPlan(tenantId, {
        name: 'Test',
        status: 'confirmed',
      });

      expect(result.status).toBe('draft');
    });
  });

  // ===== updatePlan =====
  describe('updatePlan', () => {
    it('should update a plan', async () => {
      const updated = { ...mockPlan, name: 'Updated Plan' };
      mockDb.select.mockReturnValueOnce(createChain([mockPlan]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updatePlan(tenantId, planId, { name: 'Updated Plan' });

      expect(result.name).toBe('Updated Plan');
    });

    it('should throw WmsException when plan does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.updatePlan(tenantId, 'nonexistent', { name: 'test' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // ===== confirmPlan =====
  describe('confirmPlan', () => {
    it('should confirm a plan and set confirmedAt', async () => {
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

  // ===== findAllBoxes =====
  describe('findAllBoxes', () => {
    it('should return paginated boxes', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockBox]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAllBoxes(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockBox]);
      expect(result.total).toBe(1);
    });

    it('should filter boxes by shipmentPlanId', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockBox]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAllBoxes(tenantId, { shipmentPlanId: planId });

      expect(result.items).toEqual([mockBox]);
    });

    it('should return empty when no boxes match', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAllBoxes(tenantId, {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ===== createBox =====
  describe('createBox', () => {
    it('should create a box', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBox]);

      const result = await service.createBox(tenantId, {
        shipmentPlanId: planId,
        boxNumber: 'BOX-001',
        weight: 5.0,
      });

      expect(result).toEqual(mockBox);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ===== updateBox =====
  describe('updateBox', () => {
    it('should update a box', async () => {
      const updated = { ...mockBox, weight: 10.0 };
      mockDb.select.mockReturnValueOnce(createChain([mockBox]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updateBox(tenantId, boxId, { weight: 10.0 });

      expect(result.weight).toBe(10.0);
    });

    it('should throw WmsException FBA_BOX_NOT_FOUND when box does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.updateBox(tenantId, 'nonexistent', { weight: 1 }),
      ).rejects.toThrow(WmsException);
    });

    it('should include box id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.updateBox(tenantId, 'box-missing', { weight: 1 });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('FBA-002');
        expect(e.getResponse().details).toContain('box-missing');
      }
    });
  });
});
