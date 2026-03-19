/**
 * inspectionService 单元测试 / inspectionService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();
const mockSave = vi.fn();

vi.mock('@/models/inspectionRecord', () => ({
  InspectionRecord: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
  },
  CheckResult: {},
  InspectionMode: {},
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: { findById: vi.fn() },
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: { INBOUND_DAMAGE_REPORTED: 'inbound.damage.reported' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { InspectionRecord } from '@/models/inspectionRecord';

describe('inspectionService / 検品サービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  describe('createInspection / 検品記録作成', () => {
    it('検品記録を作成すること / 创建检品记录', async () => {
      const mockRecord = {
        _id: oid(),
        recordNumber: 'INS-20260319-00001',
        tenantId: 'T1',
        inboundOrderId: oid(),
        inspectionMode: 'full',
        expectedQuantity: 100,
        inspectedQuantity: 0,
        passedQuantity: 0,
        failedQuantity: 0,
        checks: {
          skuMatch: 'na',
          barcodeMatch: 'na',
          quantityMatch: 'na',
          appearanceOk: 'na',
          accessoriesOk: 'na',
          packagingOk: 'na',
        },
      };
      vi.mocked(InspectionRecord.create).mockResolvedValue(mockRecord as any);

      const { createInspection } = await import('../inspectionService');
      const result = await createInspection({
        tenantId: 'T1',
        inboundOrderId: String(oid()),
        sku: 'SKU-001',
        expectedQuantity: 100,
        inspectedBy: '田中太郎',
      });

      expect(InspectionRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'T1',
          inspectionMode: 'full',
          expectedQuantity: 100,
          inspectedBy: '田中太郎',
        }),
      );
      expect(result.checks.skuMatch).toBe('na');
    });
  });

  describe('recordInspectionResult / 検品結果記録', () => {
    it('6次元チェック結果を記録すること / 记录6维度检查结果', async () => {
      const mockRecord = {
        _id: oid(),
        checks: { skuMatch: 'na', barcodeMatch: 'na', quantityMatch: 'na', appearanceOk: 'na', accessoriesOk: 'na', packagingOk: 'na' },
        inspectedQuantity: 0,
        passedQuantity: 0,
        failedQuantity: 0,
        exceptions: [],
        photos: [],
        save: mockSave,
      };
      vi.mocked(InspectionRecord.findById).mockResolvedValue(mockRecord as any);

      const { recordInspectionResult } = await import('../inspectionService');
      await recordInspectionResult(String(mockRecord._id), {
        checks: {
          skuMatch: 'pass',
          barcodeMatch: 'pass',
          quantityMatch: 'fail',
          appearanceOk: 'pass',
          accessoriesOk: 'na',
          packagingOk: 'pass',
        },
        inspectedQuantity: 100,
        passedQuantity: 95,
        failedQuantity: 5,
        exceptions: [
          { category: 'quantity_variance', quantity: 5, description: '数量不足5個', photoUrls: [] },
        ],
      });

      expect(mockRecord.checks.skuMatch).toBe('pass');
      expect(mockRecord.checks.quantityMatch).toBe('fail');
      expect(mockRecord.inspectedQuantity).toBe(100);
      expect(mockRecord.passedQuantity).toBe(95);
      expect(mockRecord.exceptions).toHaveLength(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it('存在しないレコード→エラー / 不存在的记录报错', async () => {
      vi.mocked(InspectionRecord.findById).mockResolvedValue(null);

      const { recordInspectionResult } = await import('../inspectionService');
      await expect(
        recordInspectionResult('nonexistent', {
          checks: {},
          inspectedQuantity: 10,
          passedQuantity: 10,
          failedQuantity: 0,
        }),
      ).rejects.toThrow('見つかりません');
    });
  });

  describe('verifyInspection / 検品承認', () => {
    it('検品結果を承認すること / 确认检品结果', async () => {
      const mockRecord = {
        _id: oid(),
        inspectedQuantity: 100,
        verifiedBy: undefined as string | undefined,
        verifiedAt: undefined as Date | undefined,
        save: mockSave,
      };
      vi.mocked(InspectionRecord.findById).mockResolvedValue(mockRecord as any);

      const { verifyInspection } = await import('../inspectionService');
      await verifyInspection(String(mockRecord._id), '鈴木課長');

      expect(mockRecord.verifiedBy).toBe('鈴木課長');
      expect(mockRecord.verifiedAt).toBeInstanceOf(Date);
    });

    it('未検品の記録は承認不可 / 未检品记录不能确认', async () => {
      vi.mocked(InspectionRecord.findById).mockResolvedValue({
        inspectedQuantity: 0,
        save: mockSave,
      } as any);

      const { verifyInspection } = await import('../inspectionService');
      await expect(verifyInspection('id', '鈴木課長')).rejects.toThrow('まだ実施されていません');
    });
  });

  describe('getInspectionStats / 検品統計', () => {
    it('入庫予定の検品統計を返すこと / 返回入库预定的检品统计', async () => {
      const records = [
        {
          inspectedQuantity: 100,
          passedQuantity: 95,
          failedQuantity: 5,
          exceptions: [
            { category: 'quantity_variance', quantity: 3, description: 'テスト' },
            { category: 'appearance_defect', quantity: 2, description: 'テスト' },
          ],
        },
        {
          inspectedQuantity: 50,
          passedQuantity: 50,
          failedQuantity: 0,
          exceptions: [],
        },
      ];
      vi.mocked(InspectionRecord.find).mockReturnValue({
        lean: () => Promise.resolve(records),
      } as any);

      const { getInspectionStats } = await import('../inspectionService');
      const stats = await getInspectionStats('order-1');

      expect(stats.totalRecords).toBe(2);
      expect(stats.totalInspected).toBe(150);
      expect(stats.totalPassed).toBe(145);
      expect(stats.totalFailed).toBe(5);
      expect(stats.passRate).toBeCloseTo(145 / 150);
      expect(stats.exceptionCount).toBe(2);
      expect(stats.byCategory['quantity_variance']).toBe(1);
    });
  });

  describe('getInspectionPerformance / 検品パフォーマンス', () => {
    it('テナントの検品KPIを返すこと / 返回租户的检品KPI', async () => {
      vi.mocked(InspectionRecord.aggregate)
        .mockResolvedValueOnce([
          { totalRecords: 500, totalInspected: 50000, totalPassed: 49800 },
        ])
        .mockResolvedValueOnce([
          { _id: 'quantity_variance', count: 15 },
          { _id: 'appearance_defect', count: 8 },
        ]);

      const { getInspectionPerformance } = await import('../inspectionService');
      const perf = await getInspectionPerformance('T1');

      expect(perf.totalRecords).toBe(500);
      expect(perf.overallPassRate).toBeCloseTo(49800 / 50000);
      expect(perf.targetMet).toBe(true); // 99.6% > 99.5% target
      expect(perf.topExceptionCategories).toHaveLength(2);
    });
  });
});
