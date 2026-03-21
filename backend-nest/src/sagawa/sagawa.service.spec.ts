// 佐川急便サービスのテスト / 佐川急便服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { SagawaService } from './sagawa.service';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('SagawaService', () => {
  let service: SagawaService;
  let mockDb: any;

  const tenantId = 'tenant-001';

  const mockOrder = {
    id: 'ship-001',
    tenantId,
    orderNumber: 'ORD-001',
    customerManagementNumber: 'CUST-001',
    recipientName: 'Test User',
    recipientPhone: '090-1234-5678',
    recipientPostalCode: '100-0001',
    recipientPrefecture: 'Tokyo',
    recipientCity: 'Chiyoda',
    recipientStreet: '1-1-1',
    recipientBuilding: 'Building A',
    senderName: 'Warehouse',
    senderPhone: '03-1234-5678',
    senderPostalCode: '150-0001',
    senderPrefecture: 'Tokyo',
    senderCity: 'Shibuya',
    shipPlanDate: '2026-03-22',
    deliveryDatePreference: '2026-03-25',
    deliveryTimeSlot: '14-16',
    invoiceType: '0',
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
      providers: [SagawaService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<SagawaService>(SagawaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== exportCsv =====
  describe('exportCsv', () => {
    it('should export CSV with header and data rows', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));

      const result = await service.exportCsv(tenantId, { shipmentIds: ['ship-001'] });

      expect(result.exportedCount).toBe(1);
      expect(result.csv).toContain('お客様管理番号');
      expect(result.csv).toContain('CUST-001');
      expect(result.exportedAt).toBeDefined();
    });

    it('should return empty result when no orders found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.exportCsv(tenantId, { shipmentIds: ['nonexistent'] });

      expect(result.exportedCount).toBe(0);
      expect(result.csv).toBe('');
      expect(result.message).toContain('No shipment orders found');
    });

    it('should export all orders when no shipmentIds provided', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockOrder, { ...mockOrder, id: 'ship-002' }]));

      const result = await service.exportCsv(tenantId, {});

      expect(result.exportedCount).toBe(2);
    });

    it('should handle empty shipmentIds array', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));

      const result = await service.exportCsv(tenantId, { shipmentIds: [] });

      expect(result.exportedCount).toBe(1);
    });

    it('should properly escape CSV fields with commas', async () => {
      const orderWithComma = { ...mockOrder, recipientName: 'Last, First' };
      mockDb.select.mockReturnValueOnce(createChain([orderWithComma]));

      const result = await service.exportCsv(tenantId, {});

      expect(result.csv).toContain('"Last, First"');
    });

    it('should properly escape CSV fields with double quotes', async () => {
      const orderWithQuote = { ...mockOrder, recipientName: 'Test "User"' };
      mockDb.select.mockReturnValueOnce(createChain([orderWithQuote]));

      const result = await service.exportCsv(tenantId, {});

      expect(result.csv).toContain('"Test ""User"""');
    });

    it('should have 17 header columns', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockOrder]));

      const result = await service.exportCsv(tenantId, {});
      const headerLine = result.csv.split('\n')[0];
      const headers = headerLine.split(',');

      expect(headers).toHaveLength(17);
    });

    it('should handle null/undefined order fields gracefully', async () => {
      const sparseOrder = {
        id: 'ship-sparse',
        tenantId,
        orderNumber: 'ORD-SPARSE',
      };
      mockDb.select.mockReturnValueOnce(createChain([sparseOrder]));

      const result = await service.exportCsv(tenantId, {});

      expect(result.exportedCount).toBe(1);
      expect(result.csv).toContain('ORD-SPARSE');
    });
  });

  // ===== importTracking =====
  describe('importTracking', () => {
    it('should import tracking numbers from CSV', async () => {
      const csvData = 'header1,header2\nCUST-001,TRACK-12345';
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'ship-001' }]),
          }),
        }),
      });

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.importedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.importedAt).toBeDefined();
    });

    it('should return zero count for empty CSV data', async () => {
      const result = await service.importTracking(tenantId, { csvData: '' });

      expect(result.importedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No CSV data');
    });

    it('should return zero count for undefined CSV data', async () => {
      const result = await service.importTracking(tenantId, {});

      expect(result.importedCount).toBe(0);
    });

    it('should report error for row with missing tracking number', async () => {
      const csvData = 'header1,header2\nCUST-001,';
      // The tracking number is empty so it should be an error
      const result = await service.importTracking(tenantId, { csvData });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Row 1');
    });

    it('should report error for row with missing management number', async () => {
      const csvData = 'header1,header2\n,TRACK-001';

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report error when order not found in database', async () => {
      const csvData = 'header1,header2\nNONEXIST,TRACK-001';
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.importedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle database errors gracefully', async () => {
      const csvData = 'header1,header2\nCUST-001,TRACK-001';
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('DB Error')),
          }),
        }),
      });

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.importedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB Error');
    });

    it('should skip blank lines in CSV', async () => {
      const csvData = 'header1,header2\nCUST-001,TRACK-001\n\nCUST-002,TRACK-002';
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'ship-001' }]),
          }),
        }),
      });

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.importedCount).toBe(2);
    });

    it('should include import message in result', async () => {
      const csvData = 'header1,header2\nCUST-001,TRACK-001';
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'ship-001' }]),
          }),
        }),
      });

      const result = await service.importTracking(tenantId, { csvData });

      expect(result.message).toContain('1');
    });
  });

  // ===== getInvoiceTypes =====
  describe('getInvoiceTypes', () => {
    it('should return static invoice types', () => {
      const result = service.getInvoiceTypes();

      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should include code and name for each type', () => {
      const result = service.getInvoiceTypes();

      result.items.forEach((item: any) => {
        expect(item).toHaveProperty('code');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('description');
      });
    });

    it('should have 4 invoice types', () => {
      const result = service.getInvoiceTypes();

      expect(result.items).toHaveLength(4);
    });
  });
});
