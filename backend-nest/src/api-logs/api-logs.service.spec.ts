// APIログサービスのテスト / API日志服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ApiLogsService } from './api-logs.service';
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
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('ApiLogsService', () => {
  let service: ApiLogsService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const logId = 'log-001';

  const mockLog = {
    id: logId,
    tenantId,
    method: 'GET',
    path: '/api/v1/products',
    statusCode: 200,
    duration: 45,
    requestBody: null,
    responseBody: null,
    createdAt: new Date('2026-03-20T10:00:00Z'),
  };

  const mockLog2 = {
    id: 'log-002',
    tenantId,
    method: 'POST',
    path: '/api/v1/orders',
    statusCode: 201,
    duration: 120,
    requestBody: { orderNumber: 'ORD-001' },
    responseBody: null,
    createdAt: new Date('2026-03-21T10:00:00Z'),
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiLogsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ApiLogsService>(ApiLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== findAll =====
  describe('findAll', () => {
    it('should return paginated API logs', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog, mockLog2]))
        .mockReturnValueOnce(createChain([{ count: 2 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by HTTP method', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { method: 'GET' });

      expect(result.items).toEqual([mockLog]);
    });

    it('should filter by status code', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog2]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { statusCode: 201 });

      expect(result.items).toEqual([mockLog2]);
    });

    it('should filter by path', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { path: '/products' });

      expect(result.items).toEqual([mockLog]);
    });

    it('should filter by date range', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog2]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, {
        startDate: '2026-03-21',
        endDate: '2026-03-22',
      });

      expect(result.items).toEqual([mockLog2]);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });

    it('should default page to 1 and limit to 20', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return empty items when no logs match', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { method: 'DELETE' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply multiple filters simultaneously', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockLog]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, {
        method: 'GET',
        statusCode: 200,
        path: '/products',
      });

      expect(result.items).toHaveLength(1);
    });
  });

  // ===== findById =====
  describe('findById', () => {
    it('should return a log by id', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockLog]));

      const result = await service.findById(tenantId, logId);

      expect(result).toEqual(mockLog);
      expect(result.method).toBe('GET');
      expect(result.statusCode).toBe(200);
    });

    it('should throw WmsException API_LOG_NOT_FOUND when not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include log id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findById(tenantId, 'log-missing');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('APILOG-001');
        expect(e.getResponse().details).toContain('log-missing');
      }
    });
  });
});
