// 入庫サービス単体テスト / 入库服务单元测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { InboundService } from './inbound.service';

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

describe('InboundService / 入庫サービス / 入库服务', () => {
  let service: InboundService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const orderId = 'inbound-001';
  const mockOrder = {
    id: orderId,
    tenantId,
    orderNumber: 'INB-2026-0001',
    status: 'pending',
    clientId: 'client-001',
    warehouseId: 'wh-001',
    flowType: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockLine = {
    id: 'line-001',
    inboundOrderId: orderId,
    tenantId,
    productId: 'prod-001',
    expectedQty: 100,
    receivedQty: 0,
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
      providers: [
        InboundService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<InboundService>(InboundService);
  });

  // ========================================
  // findAll テスト / findAll 测试
  // ========================================

  it('findAll: ページネーション付き一覧を返す / 返回分页列表', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([mockOrder]))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.findAll(tenantId, { page: 1, limit: 10 });

    expect(result.items).toEqual([mockOrder]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('findAll: ステータス・クライアントでフィルタ / 按状态和客户筛选', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([]))
      .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

    const result = await service.findAll(tenantId, {
      status: 'pending',
      clientId: 'client-001',
      warehouseId: 'wh-001',
      flowType: 'normal',
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // ========================================
  // findById テスト / findById 测试
  // ========================================

  it('findById: オーダーが見つかった場合に返す / 找到订单时返回', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));

    const result = await service.findById(tenantId, orderId);

    expect(result).toEqual(mockOrder);
  });

  it('findById: 見つからない場合NotFoundException / 未找到时抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.findById(tenantId, 'nonexistent'))
      .rejects.toThrow(NotFoundException);
  });

  // ========================================
  // create テスト / create 测试
  // ========================================

  it('create: 新規入庫オーダーを作成する / 创建新入库订单', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));
    mockDb.returning.mockResolvedValueOnce([mockOrder]);

    const result = await service.create(tenantId, {
      orderNumber: 'INB-2026-0001',
      clientId: 'client-001',
      warehouseId: 'wh-001',
    } as any);

    expect(result).toEqual(mockOrder);
  });

  it('create: 注文番号重複でConflictException / 订单号重复时抛出 ConflictException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

    await expect(service.create(tenantId, { orderNumber: 'INB-2026-0001' } as any))
      .rejects.toThrow(ConflictException);
  });

  // ========================================
  // update テスト / update 测试
  // ========================================

  it('update: オーダー情報を更新する / 更新订单信息', async () => {
    const updated = { ...mockOrder, status: 'processing' };
    mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
    mockDb.returning.mockResolvedValueOnce([updated]);

    const result = await service.update(tenantId, orderId, { status: 'processing' } as any);

    expect(result.status).toBe('processing');
  });

  // ========================================
  // remove テスト / remove 测试
  // ========================================

  it('remove: オーダーを論理削除する / 软删除订单', async () => {
    const deleted = { ...mockOrder, deletedAt: new Date() };
    mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
    mockDb.returning.mockResolvedValueOnce([deleted]);

    const result = await service.remove(tenantId, orderId);

    expect(result.deletedAt).toBeDefined();
    expect(mockDb.update).toHaveBeenCalled();
  });

  // ========================================
  // findLines テスト / findLines 测试
  // ========================================

  it('findLines: オーダーの明細行を返す / 返回订单明细行', async () => {
    // findById チェック（親オーダー確認）/ findById 检查（确认父订单）
    mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
    // 明細行取得 / 获取明细行
    mockDb.select.mockReturnValueOnce(createSelectChain([mockLine]));

    const result = await service.findLines(tenantId, orderId);

    expect(result).toEqual([mockLine]);
  });
});
