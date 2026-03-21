// 通知サービスのテスト / 通知服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { NotificationsService } from './notifications.service';
import { WmsException } from '../common/exceptions/wms.exception';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createSelectChain(resolveValue: any = []) {
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

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const notificationId = 'notif-001';
  const userId = 'user-001';
  const mockNotification = {
    id: notificationId,
    tenantId,
    userId,
    type: 'info',
    title: 'テスト通知',
    message: 'テストメッセージ',
    isRead: false,
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 通知一覧取得成功 / 成功获取通知列表
    it('should return paginated notifications', async () => {
      const mockItems = [mockNotification];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // フィルタ付き検索（未読のみ）/ 带筛选搜索（仅未读）
    it('should apply isRead filter', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { isRead: false });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    // ユーザーIDフィルタ / 用户ID筛选
    it('should apply userId filter', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([mockNotification]))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { userId });

      expect(result.total).toBe(1);
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a notification by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockNotification]));

      const result = await service.findById(tenantId, notificationId);

      expect(result).toEqual(mockNotification);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when notification not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    // 作成成功 / 创建成功
    it('should create a new notification', async () => {
      const createDto = { userId, type: 'warning', title: '新通知', message: '内容' } as any;
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // === markAsRead テスト / markAsRead 测试 ===
  describe('markAsRead', () => {
    // 既読マーク成功 / 标记已读成功
    it('should mark a notification as read', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockNotification]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockNotification, isRead: true, readAt: new Date() }]);

      const result = await service.markAsRead(tenantId, notificationId);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when marking nonexistent notification', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.markAsRead(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === markAllRead テスト / markAllRead 测试 ===
  describe('markAllRead', () => {
    // 全通知既読マーク成功 / 全部通知标记已读成功
    it('should mark all user notifications as read', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { ...mockNotification, isRead: true },
        { ...mockNotification, id: 'notif-002', isRead: true },
      ]);

      const result = await service.markAllRead(tenantId, userId);

      expect(result).toEqual({ updated: 2 });
    });

    // 未読通知がない場合 / 没有未读通知时
    it('should return updated: 0 when no unread notifications', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await service.markAllRead(tenantId, userId);

      expect(result).toEqual({ updated: 0 });
    });
  });
});
