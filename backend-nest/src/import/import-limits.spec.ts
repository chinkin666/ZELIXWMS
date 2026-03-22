// インポートファイルサイズ制限テスト / 导入文件大小限制测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ImportService } from './import.service';
import { WmsException } from '../common/exceptions/wms.exception';

describe('ImportService - File Size Limits / ファイルサイズ制限テスト / 文件大小限制测试', () => {
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

  // === IMPORT_FILE_TOO_LARGE テスト / 导入文件过大测试 ===
  describe('IMPORT_FILE_TOO_LARGE (IMP-001)', () => {
    it('should throw WmsException for file > 10MB / 10MB超過でエラー / 超过10MB抛出错误', async () => {
      const overSizeBytes = 11 * 1024 * 1024;
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      await expect(
        service.validateCsv(tenantId, data, 'products', overSizeBytes),
      ).rejects.toThrow(WmsException);
    });

    it('should return IMP-001 error code / IMP-001エラーコードを返す / 返回IMP-001错误码', async () => {
      const overSizeBytes = 15 * 1024 * 1024;

      try {
        await service.validateCsv(tenantId, [{ sku: 'x', name: 'x' }], 'products', overSizeBytes);
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().code).toBe('IMP-001');
      }
    });

    it('should include 10MB in error details / エラー詳細に10MBを含む / 错误详情包含10MB', async () => {
      const overSizeBytes = 20 * 1024 * 1024;

      try {
        await service.validateCsv(tenantId, [{ sku: 'x', name: 'x' }], 'products', overSizeBytes);
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e.getResponse().details).toContain('10MB');
      }
    });

    it('should accept file at exactly 10MB boundary / ちょうど10MBは許可 / 正好10MB允许', async () => {
      const exactly10MB = 10 * 1024 * 1024;
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      const result = await service.validateCsv(tenantId, data, 'products', exactly10MB);

      expect(result.valid).toBe(true);
    });

    it('should reject file at 10MB + 1 byte / 10MB+1バイトは拒否 / 10MB+1字节拒绝', async () => {
      const justOver = 10 * 1024 * 1024 + 1;

      await expect(
        service.validateCsv(tenantId, [{ sku: 'x', name: 'x' }], 'products', justOver),
      ).rejects.toThrow(WmsException);
    });

    it('should not check file size when fileSize param is not provided / fileSize未指定時はチェックしない / 未指定fileSize时不检查', async () => {
      const data = [{ sku: 'SKU-001', name: 'Product 1' }];

      // ファイルサイズ引数なしでバリデーション / 不传文件大小参数进行验证
      const result = await service.validateCsv(tenantId, data, 'products');

      expect(result.valid).toBe(true);
    });
  });
});
