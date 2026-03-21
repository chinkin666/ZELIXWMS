// インポートサービスのテスト / 导入服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ImportService } from './import.service';
import { WmsException } from '../common/exceptions/wms.exception';

describe('ImportService', () => {
  let service: ImportService;
  let mockDb: any;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
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
      providers: [ImportService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== validateCsv =====
  describe('validateCsv', () => {
    it('should return valid result for correct product data', async () => {
      const data = [
        { sku: 'SKU-001', name: 'Product 1', price: 100 },
        { sku: 'SKU-002', name: 'Product 2', price: 200 },
      ];

      const result = await service.validateCsv(tenantId, data, 'products');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.preview.length).toBeLessThanOrEqual(5);
    });

    it('should return preview of up to 5 items', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        sku: `SKU-${i}`,
        name: `Product ${i}`,
      }));

      const result = await service.validateCsv(tenantId, data, 'products');

      expect(result.preview).toHaveLength(5);
    });

    it('should throw IMPORT_FILE_TOO_LARGE for file > 10MB', async () => {
      const largeFileSize = 11 * 1024 * 1024;
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      await expect(
        service.validateCsv(tenantId, data, 'products', largeFileSize),
      ).rejects.toThrow(WmsException);
    });

    it('should include file size in error for too-large file', async () => {
      const largeFileSize = 11 * 1024 * 1024;

      try {
        await service.validateCsv(tenantId, [{ sku: 'x', name: 'x' }], 'products', largeFileSize);
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('IMP-001');
        expect(e.getResponse().details).toContain('10MB');
      }
    });

    it('should reject file exactly at 10MB boundary', async () => {
      const exactlyOver = 10 * 1024 * 1024 + 1;

      await expect(
        service.validateCsv(tenantId, [{ sku: 'x', name: 'x' }], 'products', exactlyOver),
      ).rejects.toThrow(WmsException);
    });

    it('should accept file at exactly 10MB', async () => {
      const exactly10MB = 10 * 1024 * 1024;
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      // Should NOT throw
      const result = await service.validateCsv(tenantId, data, 'products', exactly10MB);

      expect(result.valid).toBe(true);
    });

    it('should return invalid result for empty data', async () => {
      const result = await service.validateCsv(tenantId, []);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should return invalid result for null data', async () => {
      const result = await service.validateCsv(tenantId, null as any);

      expect(result.valid).toBe(false);
    });

    it('should throw IMPORT_INVALID_HEADERS for CSV with no columns', async () => {
      const data = [{}];

      await expect(
        service.validateCsv(tenantId, data),
      ).rejects.toThrow(WmsException);
    });

    it('should throw IMPORT_INVALID_HEADERS when required headers missing', async () => {
      const data = [{ foo: 'bar', baz: 'qux' }];

      await expect(
        service.validateCsv(tenantId, data, 'products'),
      ).rejects.toThrow(WmsException);
    });

    it('should include missing header names in error', async () => {
      const data = [{ foo: 'bar' }];

      try {
        await service.validateCsv(tenantId, data, 'products');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().code).toBe('IMP-002');
        expect(e.getResponse().details).toContain('sku');
        expect(e.getResponse().details).toContain('name');
      }
    });

    it('should throw IMPORT_VALIDATION_FAILED for missing required field values', async () => {
      const data = [{ sku: '', name: 'Product 1' }];

      await expect(
        service.validateCsv(tenantId, data, 'products'),
      ).rejects.toThrow(WmsException);
    });

    it('should throw IMPORT_VALIDATION_FAILED for invalid number field', async () => {
      const data = [{ sku: 'SKU-001', name: 'Product 1', price: 'not-a-number' }];

      await expect(
        service.validateCsv(tenantId, data, 'products'),
      ).rejects.toThrow(WmsException);
    });

    it('should validate order data with required fields', async () => {
      const data = [
        { orderNumber: 'ORD-001', recipientName: 'Test User' },
      ];

      const result = await service.validateCsv(tenantId, data, 'orders');

      expect(result.valid).toBe(true);
    });

    it('should validate inventory data with required fields', async () => {
      const data = [
        { productId: 'prod-001', locationId: 'loc-001', quantity: 10 },
      ];

      const result = await service.validateCsv(tenantId, data, 'inventory');

      expect(result.valid).toBe(true);
    });

    it('should auto-detect products entity type from headers', async () => {
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      const result = await service.validateCsv(tenantId, data);

      expect(result.valid).toBe(true);
    });

    it('should auto-detect orders entity type from headers', async () => {
      const data = [{ orderNumber: 'ORD-001', recipientName: 'Test' }];

      const result = await service.validateCsv(tenantId, data);

      expect(result.valid).toBe(true);
    });
  });

  // ===== importCsv =====
  describe('importCsv', () => {
    it('should import products successfully', async () => {
      const data = [
        { sku: 'SKU-001', name: 'Product 1' },
        { sku: 'SKU-002', name: 'Product 2' },
      ];

      const result = await service.importCsv(tenantId, data, 'products');

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should import orders successfully', async () => {
      const data = [
        { orderNumber: 'ORD-001', recipientName: 'User 1' },
      ];

      const result = await service.importCsv(tenantId, data, 'orders');

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should import inventory successfully', async () => {
      const data = [
        { productId: 'prod-001', locationId: 'loc-001', quantity: 10 },
      ];

      const result = await service.importCsv(tenantId, data, 'inventory');

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for unsupported entity type', async () => {
      const data = [{ foo: 'bar' }];

      const result = await service.importCsv(tenantId, data, 'unknown');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unsupported entity type');
    });

    it('should return zero imported for empty data', async () => {
      const result = await service.importCsv(tenantId, [], 'products');

      expect(result.imported).toBe(0);
    });

    it('should return zero imported for null data', async () => {
      const result = await service.importCsv(tenantId, null as any, 'products');

      expect(result.imported).toBe(0);
    });

    it('should handle per-row database errors and continue', async () => {
      mockDb.values
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Duplicate key'))
        .mockResolvedValueOnce(undefined);

      const data = [
        { sku: 'SKU-001', name: 'Product 1' },
        { sku: 'SKU-DUP', name: 'Duplicate' },
        { sku: 'SKU-003', name: 'Product 3' },
      ];

      const result = await service.importCsv(tenantId, data, 'products');

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Row 2');
    });

    it('should include row number in error messages', async () => {
      mockDb.values.mockRejectedValueOnce(new Error('Constraint violation'));

      const data = [{ sku: 'SKU-001', name: 'Product 1' }];
      const result = await service.importCsv(tenantId, data, 'products');

      expect(result.errors[0]).toContain('Row 1');
    });
  });
});
