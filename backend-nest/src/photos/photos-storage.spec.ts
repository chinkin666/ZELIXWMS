// 写真ストレージ容量制限テスト / 照片存储容量限制测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { PhotosService, MAX_STORAGE_BYTES } from './photos.service';
import { WmsException } from '../common/exceptions/wms.exception';

// チェーン可能なクエリモック / 可链式调用的查询mock
function createChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('PhotosService - Storage Capacity / ストレージ容量テスト / 存储容量测试', () => {
  let service: PhotosService;
  let mockDb: any;

  const tenantId = 'tenant-001';

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
      providers: [PhotosService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  // === upload: ストレージ容量超過 / 上传: 存储容量超限 ===
  describe('upload - PHOTO_STORAGE_FULL', () => {
    it('should throw PHOTO_STORAGE_FULL when storage limit exceeded / ストレージ制限超過時にエラー / 存储限制超过时抛出错误', async () => {
      // 現在のストレージ使用量がほぼ上限 / 当前存储使用量接近上限
      const currentUsage = MAX_STORAGE_BYTES - 100;
      const newFileSize = 200; // 100バイト超過 / 超过100字节

      // ストレージ使用量クエリのモック / mock存储使用量查询
      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));

      await expect(
        service.upload(tenantId, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          size: newFileSize,
        }),
      ).rejects.toThrow(WmsException);
    });

    it('should return PHO-004 error code / PHO-004エラーコードを返す / 返回PHO-004错误码', async () => {
      const currentUsage = MAX_STORAGE_BYTES - 50;

      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));

      try {
        await service.upload(tenantId, {
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 100,
        });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().code).toBe('PHO-004');
      }
    });

    it('should allow upload when within storage limit / 容量内ならアップロード許可 / 容量内允许上传', async () => {
      const currentUsage = 1000;
      const newFileSize = 500;

      // ストレージチェック用 / 存储检查用
      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));
      // insert後のreturning用 / insert后returning用
      const created = { id: 'new-photo', tenantId, filename: 'test.jpg' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.upload(tenantId, {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: newFileSize,
      });

      expect(result).toEqual(created);
    });

    it('should skip storage check when size is not provided / サイズ未指定時はチェックスキップ / 未指定大小时跳过检查', async () => {
      const created = { id: 'new-photo', tenantId, filename: 'test.jpg' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.upload(tenantId, {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result).toEqual(created);
      // select should not be called for storage check / ストレージチェック用にselectは呼ばれない
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  // === bulkUpload: ストレージ容量超過 / 批量上传: 存储容量超限 ===
  describe('bulkUpload - PHOTO_STORAGE_FULL', () => {
    it('should throw PHOTO_STORAGE_FULL when bulk upload exceeds limit / 一括アップロードで容量超過時エラー / 批量上传超过容量时抛出错误', async () => {
      const currentUsage = MAX_STORAGE_BYTES - 100;

      // ストレージ使用量クエリのモック / mock存储使用量查询
      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));

      await expect(
        service.bulkUpload(tenantId, [
          { filename: 'a.jpg', mimeType: 'image/jpeg', size: 80 },
          { filename: 'b.jpg', mimeType: 'image/jpeg', size: 80 },
        ]),
      ).rejects.toThrow(WmsException);
    });

    it('should check total size of all files in bulk / 全ファイル合計サイズでチェック / 检查全部文件总大小', async () => {
      const currentUsage = MAX_STORAGE_BYTES - 500;

      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));

      try {
        await service.bulkUpload(tenantId, [
          { filename: 'a.jpg', mimeType: 'image/jpeg', size: 300 },
          { filename: 'b.jpg', mimeType: 'image/jpeg', size: 300 },
        ]);
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().code).toBe('PHO-004');
      }
    });

    it('should allow bulk upload when within limit / 容量内なら一括アップロード許可 / 容量内允许批量上传', async () => {
      const currentUsage = 1000;

      // ストレージチェック用 / 存储检查用
      mockDb.select.mockReturnValueOnce(createChain([{ total: currentUsage }]));
      // insert後のreturning用 / insert后returning用
      const created = [
        { id: 'bulk-1', tenantId, filename: 'a.jpg' },
        { id: 'bulk-2', tenantId, filename: 'b.jpg' },
      ];
      mockDb.returning.mockResolvedValueOnce(created);

      const result = await service.bulkUpload(tenantId, [
        { filename: 'a.jpg', mimeType: 'image/jpeg', size: 100 },
        { filename: 'b.jpg', mimeType: 'image/jpeg', size: 200 },
      ]);

      expect(result).toHaveLength(2);
    });
  });
});
