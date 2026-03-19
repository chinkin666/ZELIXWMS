/**
 * GraphQL Mutation Resolvers テスト / GraphQL Mutation解析器测试
 *
 * ミューテーション解析器の入力検証とDB操作の検証
 * Mutation解析器的输入验证和DB操作验证
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(() => ({ lean: () => Promise.resolve(null) })),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    create: vi.fn(),
    findOne: vi.fn(() => ({ lean: () => Promise.resolve({ _id: 'p1' }) })),
    findByIdAndUpdate: vi.fn(() => ({ lean: () => Promise.resolve(null) })),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    create: vi.fn(),
  },
}));

vi.mock('@/models/client', () => ({
  Client: {
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: { emit: vi.fn().mockResolvedValue(undefined) },
  HOOK_EVENTS: { ORDER_CREATED: 'order.created', ORDER_CANCELLED: 'order.cancelled' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ShipmentOrder } from '@/models/shipmentOrder';
import { Product } from '@/models/product';
import { InboundOrder } from '@/models/inboundOrder';
import { Client } from '@/models/client';

describe('GraphQL Mutation Resolvers / ミューテーションリゾルバ', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createShipmentOrder / 出荷指示作成', () => {
    it('注文を作成してIDを返すこと / 创建订单并返回ID', async () => {
      const data = { _id: 'order-1', orderNumber: 'SH20260319-0001' };
      const mockOrder = { ...data, toObject: () => data };
      vi.mocked(ShipmentOrder.create).mockResolvedValue(mockOrder as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.createShipmentOrder(null, {
        input: {
          recipient: { name: '田中太郎', phone: '09012345678', postalCode: '1600023', prefecture: '東京都', city: '新宿区', street: '西新宿1-2-3' },
          products: [{ productSku: 'SKU-001', quantity: 2 }],
        },
      });

      expect(ShipmentOrder.create).toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
    });

    it('デフォルト値が設定されること / 设置默认值', async () => {
      vi.mocked(ShipmentOrder.create).mockResolvedValue({ _id: 'o1', toObject: () => ({ _id: 'o1' }) } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      await mutationResolvers.Mutation.createShipmentOrder(null, { input: {} });

      const createArg = vi.mocked(ShipmentOrder.create).mock.calls[0][0] as any;
      expect(createArg.invoiceType).toBe('0');
      expect(createArg.status.confirm.isConfirmed).toBe(false);
    });
  });

  describe('createProduct / 商品作成', () => {
    it('商品を作成すること / 创建商品', async () => {
      const mockProduct = { _id: 'p1', sku: 'SKU-001', name: 'テスト商品', toObject: () => ({ _id: 'p1', sku: 'SKU-001', name: 'テスト商品' }) };
      vi.mocked(Product.create).mockResolvedValue(mockProduct as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.createProduct(null, {
        input: { sku: 'SKU-001', name: 'テスト商品', price: 1000 },
      });

      expect(Product.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'SKU-001', name: 'テスト商品' }),
      );
      expect(result).toHaveProperty('_id');
    });
  });

  describe('updateProduct / 商品更新', () => {
    it('商品を更新すること / 更新商品', async () => {
      const updated = { _id: 'p1', sku: 'SKU-001', name: '更新後' };
      vi.mocked(Product.findByIdAndUpdate).mockReturnValue({ lean: () => Promise.resolve(updated) } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.updateProduct(null, {
        id: 'p1',
        input: { name: '更新後' },
      });

      expect(result).toEqual(updated);
    });

    it('存在しない場合はnullを返す / 不存在返回null', async () => {
      vi.mocked(Product.findByIdAndUpdate).mockReturnValue({ lean: () => Promise.resolve(null) } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.updateProduct(null, {
        id: 'nonexistent',
        input: { name: 'x' },
      });

      expect(result).toBeNull();
    });
  });

  describe('cancelShipmentOrder / 出荷指示取消', () => {
    it('注文を取消してtrueを返す / 取消订单返回true', async () => {
      vi.mocked(ShipmentOrder.findById).mockResolvedValue({
        _id: 'o1', orderNumber: 'SH-001', status: { shipped: { isShipped: false } },
      } as any);
      vi.mocked(ShipmentOrder.findByIdAndDelete).mockResolvedValue({ _id: 'o1' } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.cancelShipmentOrder(null, { id: 'o1' });

      expect(result).toEqual({ success: true, message: 'Order cancelled', id: 'o1' });
    });
  });

  describe('createInboundOrder / 入庫指示作成', () => {
    it('入庫指示を作成すること / 创建入库指示', async () => {
      const data = { _id: 'ib1', orderNumber: 'IN20260319-0001' };
      vi.mocked(InboundOrder.create).mockResolvedValue({ ...data, toObject: () => data } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.createInboundOrder(null, {
        input: {
          destinationLocationId: 'loc-1',
          lines: [{ productId: 'p1', expectedQuantity: 100 }],
        },
      });

      expect(InboundOrder.create).toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
    });
  });

  describe('createClient / 顧客作成', () => {
    it('顧客を作成すること / 创建客户', async () => {
      const data = { _id: 'c1', name: '株式会社テスト' };
      vi.mocked(Client.create).mockResolvedValue({ ...data, toObject: () => data } as any);

      const { mutationResolvers } = await import('../resolvers/mutations');
      const result = await mutationResolvers.Mutation.createClient(null, {
        input: { name: '株式会社テスト', code: 'TEST' },
      });

      expect(result).toHaveProperty('_id');
    });
  });
});
