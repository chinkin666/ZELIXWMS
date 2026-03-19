/**
 * fbaBoxService 单元测试 / fbaBoxService ユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();
const mockSave = vi.fn().mockResolvedValue(undefined);
const mockDeleteOne = vi.fn().mockResolvedValue(undefined);

vi.mock('@/models/fbaBox', () => ({
  FbaBox: {
    findById: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(3),
  },
  FBA_BOX_LIMITS: { maxWeightMixed: 15, maxWeightSingle: 30, maxLongestSide: 63.5, maxTotalDimensions: 150 },
  validateFbaBox: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { FbaBox, validateFbaBox } from '@/models/fbaBox';

describe('fbaBoxService / FBA箱サービス', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('splitBox / 分箱', () => {
    it('1箱を2箱に分割すること / 一箱拆为两箱', async () => {
      const orderId = oid();
      const box = {
        _id: oid(),
        tenantId: 'T1',
        inboundOrderId: orderId,
        status: 'packing',
        items: [
          { productId: oid(), sku: 'SKU-A', fnsku: 'FN-A', quantity: 10 },
          { productId: oid(), sku: 'SKU-B', fnsku: 'FN-B', quantity: 5 },
        ],
        save: mockSave,
      };
      vi.mocked(FbaBox.findById).mockResolvedValue(box as any);
      vi.mocked(FbaBox.create).mockResolvedValue({ _id: oid(), boxNumber: 'NEW-U004' } as any);

      const { splitBox } = await import('../fbaBoxService');
      const result = await splitBox(String(box._id), [{ sku: 'SKU-A', quantity: 4 }]);

      // 元箱のSKU-Aが6に減少
      expect(box.items[0].quantity).toBe(6);
      expect(FbaBox.create).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('packing以外→エラー / 非packing状态报错', async () => {
      vi.mocked(FbaBox.findById).mockResolvedValue({
        status: 'sealed',
        items: [],
      } as any);

      const { splitBox } = await import('../fbaBoxService');
      await expect(splitBox('id', [{ sku: 'A', quantity: 1 }])).rejects.toThrow('packing');
    });
  });

  describe('mergeBoxes / 合箱', () => {
    it('2箱を1箱に統合すること / 两箱合为一箱', async () => {
      const orderId = oid();
      const target = {
        _id: oid(),
        inboundOrderId: orderId,
        status: 'packing',
        items: [{ productId: oid(), sku: 'SKU-A', fnsku: 'FN-A', quantity: 5 }],
        weight: 3,
        save: mockSave,
      };
      const source = {
        _id: oid(),
        inboundOrderId: orderId,
        status: 'packing',
        items: [{ productId: oid(), sku: 'SKU-A', fnsku: 'FN-A', quantity: 3 }],
        weight: 2,
        deleteOne: mockDeleteOne,
      };

      vi.mocked(FbaBox.findById)
        .mockResolvedValueOnce(target as any)
        .mockResolvedValueOnce(source as any);

      const { mergeBoxes } = await import('../fbaBoxService');
      await mergeBoxes(String(target._id), String(source._id));

      expect(target.items[0].quantity).toBe(8); // 5+3
      expect(target.weight).toBe(5); // 3+2
      expect(mockDeleteOne).toHaveBeenCalled();
    });
  });

  describe('mergeBoxes 追加テスト / 合箱追加测试', () => {
    it('異なるSKUの場合はアイテムを追加すること / 不同SKU时添加新项目', async () => {
      const orderId = oid();
      const target = {
        _id: oid(),
        inboundOrderId: orderId,
        status: 'packing',
        items: [{ productId: oid(), sku: 'SKU-A', fnsku: 'FN-A', quantity: 5 }],
        weight: 3,
        save: mockSave,
      };
      const source = {
        _id: oid(),
        inboundOrderId: orderId,
        status: 'packing',
        items: [{ productId: oid(), sku: 'SKU-B', fnsku: 'FN-B', quantity: 4 }],
        weight: 2,
        deleteOne: mockDeleteOne,
      };

      vi.mocked(FbaBox.findById)
        .mockResolvedValueOnce(target as any)
        .mockResolvedValueOnce(source as any);

      const { mergeBoxes } = await import('../fbaBoxService');
      await mergeBoxes(String(target._id), String(source._id));

      expect(target.items).toHaveLength(2); // SKU-A + SKU-B
      expect(target.items[1].sku).toBe('SKU-B');
    });

    it('箱が見つからない場合エラー / 箱不存在时报错', async () => {
      vi.mocked(FbaBox.findById)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const { mergeBoxes } = await import('../fbaBoxService');
      await expect(mergeBoxes('id1', 'id2')).rejects.toThrow('見つかりません');
    });

    it('packing以外の状態でエラー / 非packing状态报错', async () => {
      const orderId = oid();
      vi.mocked(FbaBox.findById)
        .mockResolvedValueOnce({ _id: oid(), inboundOrderId: orderId, status: 'sealed', items: [] } as any)
        .mockResolvedValueOnce({ _id: oid(), inboundOrderId: orderId, status: 'packing', items: [] } as any);

      const { mergeBoxes } = await import('../fbaBoxService');
      await expect(mergeBoxes('id1', 'id2')).rejects.toThrow('packing');
    });

    it('異なる入庫予約の箱でエラー / 不同入库预定的箱报错', async () => {
      vi.mocked(FbaBox.findById)
        .mockResolvedValueOnce({ _id: oid(), inboundOrderId: oid(), status: 'packing', items: [] } as any)
        .mockResolvedValueOnce({ _id: oid(), inboundOrderId: oid(), status: 'packing', items: [] } as any);

      const { mergeBoxes } = await import('../fbaBoxService');
      await expect(mergeBoxes('id1', 'id2')).rejects.toThrow('同一入庫予約');
    });
  });

  describe('groupBoxesByFc / FC別グループ化', () => {
    it('FC別に箱をグループ化すること / 按FC分组', async () => {
      const boxes = [
        { boxNumber: 'U001', destinationFc: 'NRT1', items: [] },
        { boxNumber: 'U002', destinationFc: 'KIX2', items: [] },
        { boxNumber: 'U003', destinationFc: 'NRT1', items: [] },
      ];
      vi.mocked(FbaBox.find).mockReturnValue({ lean: () => Promise.resolve(boxes) } as any);

      const { groupBoxesByFc } = await import('../fbaBoxService');
      const groups = await groupBoxesByFc('order-1');

      expect(groups['NRT1']).toHaveLength(2);
      expect(groups['KIX2']).toHaveLength(1);
    });

    it('destinationFcがない箱はdefaultグループ / 无destinationFc归入default组', async () => {
      const boxes = [
        { boxNumber: 'U001', items: [] },
        { boxNumber: 'U002', destinationFc: 'NRT1', items: [] },
      ];
      vi.mocked(FbaBox.find).mockReturnValue({ lean: () => Promise.resolve(boxes) } as any);

      const { groupBoxesByFc } = await import('../fbaBoxService');
      const groups = await groupBoxesByFc('order-1');

      expect(groups['default']).toHaveLength(1);
      expect(groups['NRT1']).toHaveLength(1);
    });

    it('箱が0件の場合は空オブジェクト / 无箱时返回空对象', async () => {
      vi.mocked(FbaBox.find).mockReturnValue({ lean: () => Promise.resolve([]) } as any);

      const { groupBoxesByFc } = await import('../fbaBoxService');
      const groups = await groupBoxesByFc('order-1');

      expect(Object.keys(groups)).toHaveLength(0);
    });
  });

  describe('validateAllBoxes / 一括検証', () => {
    it('全箱を検証して結果を返すこと / 批量校验所有箱', async () => {
      const boxes = [
        { boxNumber: 'U001', weight: 10, items: [{ sku: 'A', quantity: 5 }] },
        { boxNumber: 'U002', weight: 20, items: [{ sku: 'B', quantity: 3 }, { sku: 'C', quantity: 2 }] },
      ];
      vi.mocked(FbaBox.find).mockReturnValue({ lean: () => Promise.resolve(boxes) } as any);
      vi.mocked(validateFbaBox)
        .mockReturnValueOnce({ valid: true, errors: [] })
        .mockReturnValueOnce({ valid: false, errors: ['重量超過'] });

      const { validateAllBoxes } = await import('../fbaBoxService');
      const result = await validateAllBoxes('order-1');

      expect(result.totalBoxes).toBe(2);
      expect(result.validBoxes).toBe(1);
      expect(result.invalidBoxes).toHaveLength(1);
      expect(result.invalidBoxes[0].boxNumber).toBe('U002');
    });
  });
});
