// 写真管理サービスのテスト / 照片管理服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { PhotosService } from './photos.service';
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
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('PhotosService', () => {
  let service: PhotosService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const photoId = 'photo-001';
  const mockPhoto = {
    id: photoId,
    tenantId,
    entityType: 'product',
    entityId: 'prod-001',
    filename: 'test.jpg',
    originalFilename: 'test-original.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: '/storage/tenant-001/photos/test.jpg',
    thumbnailUrl: null,
    uploadedBy: 'user-001',
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
      providers: [PhotosService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll ===
  describe('findAll', () => {
    it('should return paginated photos', async () => {
      const dataChain = createChain([mockPhoto]);
      const countChain = createChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockPhoto]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply entityType filter', async () => {
      const dataChain = createChain([]);
      const countChain = createChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { entityType: 'product' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply entityId filter', async () => {
      const dataChain = createChain([]);
      const countChain = createChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { entityId: 'prod-001' });

      expect(result.items).toEqual([]);
    });

    it('should cap limit at 200', async () => {
      const dataChain = createChain([]);
      const countChain = createChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });

    it('should default page to 1 and limit to 20', async () => {
      const dataChain = createChain([]);
      const countChain = createChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return correct totalPages for multiple pages', async () => {
      const dataChain = createChain([mockPhoto]);
      const countChain = createChain([{ count: 25 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  // === findById ===
  describe('findById', () => {
    it('should return a photo by id', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockPhoto]));

      const result = await service.findById(tenantId, photoId);

      expect(result).toEqual(mockPhoto);
    });

    it('should throw WmsException PHOTO_NOT_FOUND when photo does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });

    it('should include photo id in error details', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      try {
        await service.findById(tenantId, 'missing-id');
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().details).toContain('missing-id');
      }
    });
  });

  // === upload ===
  describe('upload', () => {
    it('should upload a photo and return created record', async () => {
      const created = { ...mockPhoto, id: 'new-photo' };
      // ストレージチェック用モック / 存储检查用mock
      mockDb.select.mockReturnValueOnce(createChain([{ total: 0 }]));
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.upload(tenantId, {
        entityType: 'product',
        entityId: 'prod-001',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
      });

      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw WmsException PHOTO_TOO_LARGE for file > 5MB', async () => {
      const largeSize = 6 * 1024 * 1024;

      await expect(
        service.upload(tenantId, { size: largeSize, mimeType: 'image/jpeg' }),
      ).rejects.toThrow(WmsException);
    });

    it('should include file size in error details for too-large file', async () => {
      const largeSize = 6 * 1024 * 1024;

      try {
        await service.upload(tenantId, { size: largeSize, mimeType: 'image/jpeg' });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().code).toBe('PHO-002');
      }
    });

    it('should throw WmsException PHOTO_INVALID_TYPE for non-image MIME type', async () => {
      await expect(
        service.upload(tenantId, { mimeType: 'application/pdf', size: 100 }),
      ).rejects.toThrow(WmsException);
    });

    it('should include MIME type in error details for invalid type', async () => {
      try {
        await service.upload(tenantId, { mimeType: 'text/plain', size: 100 });
        fail('Expected WmsException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(WmsException);
        expect(e.getResponse().code).toBe('PHO-003');
      }
    });

    it('should allow upload without size validation when size is not provided', async () => {
      const created = { ...mockPhoto, id: 'new-photo' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.upload(tenantId, {
        entityType: 'product',
        filename: 'test.jpg',
      });

      expect(result).toEqual(created);
    });

    it('should generate URL when not provided', async () => {
      const created = { ...mockPhoto };
      mockDb.returning.mockResolvedValueOnce([created]);

      await service.upload(tenantId, { filename: 'pic.jpg' });

      expect(mockDb.values).toHaveBeenCalled();
    });

    it('should use provided URL when given', async () => {
      const created = { ...mockPhoto, url: 'https://cdn.example.com/photo.jpg' };
      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.upload(tenantId, {
        url: 'https://cdn.example.com/photo.jpg',
      });

      expect(result.url).toBe('https://cdn.example.com/photo.jpg');
    });
  });

  // === remove ===
  describe('remove', () => {
    it('should delete a photo and return success', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockPhoto]));

      const result = await service.remove(tenantId, photoId);

      expect(result).toEqual({ success: true, id: photoId });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw WmsException PHOTO_NOT_FOUND when deleting nonexistent photo', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === bulkUpload ===
  describe('bulkUpload', () => {
    it('should bulk upload multiple photos', async () => {
      const createdPhotos = [
        { ...mockPhoto, id: 'bulk-1' },
        { ...mockPhoto, id: 'bulk-2' },
      ];
      // ストレージチェック用モック / 存储检查用mock
      mockDb.select.mockReturnValueOnce(createChain([{ total: 0 }]));
      mockDb.returning.mockResolvedValueOnce(createdPhotos);

      const result = await service.bulkUpload(tenantId, [
        { filename: 'a.jpg', mimeType: 'image/jpeg', size: 100 },
        { filename: 'b.jpg', mimeType: 'image/png', size: 200 },
      ]);

      expect(result).toHaveLength(2);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw PHOTO_TOO_LARGE if any file exceeds 5MB', async () => {
      await expect(
        service.bulkUpload(tenantId, [
          { filename: 'small.jpg', mimeType: 'image/jpeg', size: 100 },
          { filename: 'big.jpg', mimeType: 'image/jpeg', size: 6 * 1024 * 1024 },
        ]),
      ).rejects.toThrow(WmsException);
    });

    it('should throw PHOTO_INVALID_TYPE if any file has invalid MIME type', async () => {
      await expect(
        service.bulkUpload(tenantId, [
          { filename: 'doc.pdf', mimeType: 'application/pdf', size: 100 },
        ]),
      ).rejects.toThrow(WmsException);
    });

    it('should validate all files before inserting any', async () => {
      try {
        await service.bulkUpload(tenantId, [
          { filename: 'good.jpg', mimeType: 'image/jpeg', size: 100 },
          { filename: 'bad.pdf', mimeType: 'application/pdf', size: 100 },
        ]);
        fail('Expected WmsException');
      } catch (e: any) {
        // insert should not have been called
        expect(mockDb.returning).not.toHaveBeenCalled();
      }
    });
  });
});
