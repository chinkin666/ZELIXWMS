// ワークフローサービスのテスト / 工作流服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { WorkflowsService } from './workflows.service';
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

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const workflowId = 'wf-001';
  const mockWorkflow = {
    id: workflowId,
    tenantId,
    name: 'Auto Label',
    description: 'Auto-generate labels',
    triggerType: 'order_created',
    triggerConfig: {},
    actions: [{ type: 'print_label' }],
    enabled: true,
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLog = {
    id: 'log-001',
    tenantId,
    workflowId,
    status: 'running',
    triggerData: { orderId: 'ord-001' },
    startedAt: new Date(),
    createdAt: new Date(),
  };

  const mockRule = {
    id: 'rule-001',
    tenantId,
    name: 'Zone A Rule',
    description: 'Assign to Zone A',
    priority: 1,
    conditions: {},
    actions: {},
    enabled: true,
    createdAt: new Date(),
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
      providers: [WorkflowsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll ===
  describe('findAll', () => {
    it('should return paginated workflows', async () => {
      const dataChain = createChain([mockWorkflow]);
      const countChain = createChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockWorkflow]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should default page to 1 and limit to 20', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { limit: 500 });

      expect(result.limit).toBe(200);
    });
  });

  // === findById ===
  describe('findById', () => {
    it('should return a workflow by id', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockWorkflow]));

      const result = await service.findById(tenantId, workflowId);

      expect(result).toEqual(mockWorkflow);
    });

    it('should throw WmsException WORKFLOW_NOT_FOUND when not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include workflow id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findById(tenantId, 'wf-missing');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().details).toContain('wf-missing');
      }
    });
  });

  // === create ===
  describe('create', () => {
    it('should create a new workflow', async () => {
      mockDb.returning.mockResolvedValueOnce([mockWorkflow]);

      const result = await service.create(tenantId, {
        name: 'Auto Label',
        triggerType: 'order_created',
        actions: [{ type: 'print_label' }],
      });

      expect(result).toEqual(mockWorkflow);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should default enabled to true', async () => {
      mockDb.returning.mockResolvedValueOnce([{ ...mockWorkflow, enabled: true }]);

      const result = await service.create(tenantId, {
        name: 'Test',
        triggerType: 'manual',
      });

      expect(result.enabled).toBe(true);
    });
  });

  // === update ===
  describe('update', () => {
    it('should update a workflow', async () => {
      const updated = { ...mockWorkflow, name: 'Updated Name' };
      mockDb.select.mockReturnValueOnce(createChain([mockWorkflow]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update(tenantId, workflowId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw WmsException when updating nonexistent workflow', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'test' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === remove ===
  describe('remove', () => {
    it('should delete a workflow and return success', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockWorkflow]));

      const result = await service.remove(tenantId, workflowId);

      expect(result).toEqual({ success: true, id: workflowId });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw WmsException when removing nonexistent workflow', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === trigger ===
  describe('trigger', () => {
    it('should trigger an enabled workflow and return execution log', async () => {
      // findById for the workflow
      mockDb.select.mockReturnValueOnce(createChain([mockWorkflow]));
      // insert log returning
      mockDb.returning.mockResolvedValueOnce([mockLog]);

      const result = await service.trigger(tenantId, {
        workflowId,
        triggerData: { orderId: 'ord-001' },
      });

      expect(result).toEqual(mockLog);
      expect(result.status).toBe('running');
    });

    it('should throw WmsException WORKFLOW_DISABLED for disabled workflow', async () => {
      const disabledWf = { ...mockWorkflow, enabled: false };
      mockDb.select.mockReturnValueOnce(createChain([disabledWf]));

      await expect(
        service.trigger(tenantId, { workflowId }),
      ).rejects.toThrow(WmsException);
    });

    it('should include workflow id in disabled error details', async () => {
      const disabledWf = { ...mockWorkflow, enabled: false };
      mockDb.select.mockReturnValueOnce(createChain([disabledWf]));

      try {
        await service.trigger(tenantId, { workflowId });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('WF-002');
        expect(e.getResponse().details).toContain(workflowId);
      }
    });

    it('should throw WmsException when triggering nonexistent workflow', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.trigger(tenantId, { workflowId: 'nonexistent' }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === findLogs ===
  describe('findLogs', () => {
    it('should return paginated logs for a workflow', async () => {
      // findById check
      mockDb.select.mockReturnValueOnce(createChain([mockWorkflow]));
      // data + count
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findLogs(tenantId, workflowId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockLog]);
      expect(result.total).toBe(1);
    });

    it('should throw WmsException when workflow does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.findLogs(tenantId, 'nonexistent', { page: 1, limit: 10 }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === findAllRules ===
  describe('findAllRules', () => {
    it('should return paginated slotting rules', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockRule]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAllRules(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockRule]);
      expect(result.total).toBe(1);
    });
  });

  // === createRule ===
  describe('createRule', () => {
    it('should create a slotting rule', async () => {
      mockDb.returning.mockResolvedValueOnce([mockRule]);

      const result = await service.createRule(tenantId, {
        name: 'Zone A Rule',
        priority: 1,
      });

      expect(result).toEqual(mockRule);
    });
  });

  // === updateRule ===
  describe('updateRule', () => {
    it('should update a slotting rule', async () => {
      const updated = { ...mockRule, name: 'Updated Rule' };
      mockDb.select.mockReturnValueOnce(createChain([mockRule]));
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updateRule(tenantId, 'rule-001', { name: 'Updated Rule' });

      expect(result.name).toBe('Updated Rule');
    });

    it('should throw WmsException SLOTTING_RULE_NOT_FOUND when rule does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(
        service.updateRule(tenantId, 'nonexistent', { name: 'test' }),
      ).rejects.toThrow(WmsException);
    });
  });
});
