/**
 * chargeService 单元测试 / chargeService ユニットテスト
 *
 * 作業チャージ自動生成・保管料計算・月次請求書生成のテスト
 * 作业费用自动生成、仓储费计算、月度账单生成的测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock models
vi.mock('@/models/serviceRate', () => ({
  ServiceRate: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/workCharge', () => ({
  WorkCharge: {
    create: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('@/models/billingRecord', () => ({
  BillingRecord: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
import { BillingRecord } from '@/models/billingRecord';
import { StockQuant } from '@/models/stockQuant';
import { Client } from '@/models/client';

const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });
const chainSortLean = (val: any) => ({ sort: () => chainLean(val) });

describe('chargeService / チャージサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createAutoCharge / 自動チャージ作成 ─────────────────────

  describe('createAutoCharge / 自動チャージ作成', () => {
    it('顧客専用料金で課金すること / 使用客户专属费率计费', async () => {
      const clientRate = { unitPrice: 100, chargeType: 'picking' };
      vi.mocked(ServiceRate.findOne).mockReturnValueOnce(chainLean(clientRate) as any);

      const { createAutoCharge } = await import('../chargeService');
      await createAutoCharge({
        tenantId: 'T1',
        clientId: 'C1',
        clientName: '株式会社テスト',
        chargeType: 'picking',
        referenceType: 'wave',
        referenceId: 'W-001',
        referenceNumber: 'WV-20260319-0001',
        quantity: 5,
        description: 'ピッキング作業',
      });

      expect(WorkCharge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'T1',
          clientId: 'C1',
          quantity: 5,
          unitPrice: 100,
          amount: 500,
          isBilled: false,
        }),
      );
    });

    it('顧客料金なし→デフォルト料金を使用 / 无客户费率时使用默认费率', async () => {
      const defaultRate = { unitPrice: 80, chargeType: 'picking' };
      vi.mocked(ServiceRate.findOne)
        .mockReturnValueOnce(chainLean(null) as any) // 顧客専用なし
        .mockReturnValueOnce(chainLean(defaultRate) as any); // デフォルト

      const { createAutoCharge } = await import('../chargeService');
      await createAutoCharge({
        tenantId: 'T1',
        clientId: 'C1',
        chargeType: 'picking',
        referenceType: 'wave',
        quantity: 3,
        description: 'ピッキング',
      });

      expect(WorkCharge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitPrice: 80,
          amount: 240,
        }),
      );
    });

    it('料金設定なし→チャージしない / 无费率设置时不创建费用', async () => {
      vi.mocked(ServiceRate.findOne)
        .mockReturnValueOnce(chainLean(null) as any)
        .mockReturnValueOnce(chainLean(null) as any);

      const { createAutoCharge } = await import('../chargeService');
      await createAutoCharge({
        tenantId: 'T1',
        chargeType: 'unknown_type',
        referenceType: 'wave',
        quantity: 1,
        description: 'テスト',
      });

      expect(WorkCharge.create).not.toHaveBeenCalled();
    });

    it('DB例外→ログのみ、例外を投げない / DB异常时仅记录日志不抛异常', async () => {
      vi.mocked(ServiceRate.findOne).mockImplementation(() => {
        throw new Error('DB error');
      });

      const { createAutoCharge } = await import('../chargeService');

      await expect(
        createAutoCharge({
          tenantId: 'T1',
          chargeType: 'picking',
          referenceType: 'wave',
          quantity: 1,
          description: 'テスト',
        }),
      ).resolves.toBeUndefined();
    });

    it('billingPeriod を自動設定すること / billingPeriod を自動設定', async () => {
      const rate = { unitPrice: 50, chargeType: 'packing' };
      vi.mocked(ServiceRate.findOne).mockReturnValueOnce(chainLean(rate) as any);

      const { createAutoCharge } = await import('../chargeService');
      await createAutoCharge({
        tenantId: 'T1',
        chargeType: 'packing',
        referenceType: 'shipmentOrder',
        quantity: 2,
        description: '梱包作業',
      });

      expect(WorkCharge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billingPeriod: expect.stringMatching(/^\d{4}-\d{2}$/),
          chargeDate: expect.any(Date),
        }),
      );
    });

    it('数量×単価=金額が正しいこと / 数量×单价=金额正确', async () => {
      const rate = { unitPrice: 150, chargeType: 'labeling' };
      vi.mocked(ServiceRate.findOne).mockReturnValueOnce(chainLean(rate) as any);

      const { createAutoCharge } = await import('../chargeService');
      await createAutoCharge({
        tenantId: 'T1',
        chargeType: 'labeling',
        referenceType: 'fba',
        quantity: 10,
        description: 'FBAラベル貼り',
      });

      expect(WorkCharge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitPrice: 150,
          amount: 1500, // 10 × 150
          quantity: 10,
        }),
      );
    });
  });

  // ─── calculateDailyStorageFees / 日次保管料計算 ─────────────

  describe('calculateDailyStorageFees / 日次保管料計算', () => {
    it('顧客別にロケーション占有数で課金すること / 按客户库位占用数计费', async () => {
      vi.mocked(StockQuant.aggregate).mockResolvedValue([
        { clientId: 'C1', locationCount: 5 },
        { clientId: 'C2', locationCount: 3 },
      ]);

      // ServiceRate.find で一括取得（N+1防止）/ ServiceRate.find 批量获取
      vi.mocked(ServiceRate.find).mockReturnValue(chainLean([
        { unitPrice: 200, chargeType: 'storage', isActive: true },
      ]) as any);

      const { calculateDailyStorageFees } = await import('../chargeService');
      const result = await calculateDailyStorageFees('T1');

      expect(result.clientsCharged).toBe(2);
      expect(result.totalAmount).toBe(1600); // (5+3) × 200
      expect(WorkCharge.create).toHaveBeenCalledTimes(2);
    });

    it('占有ロケーションなしで0件を返す / 无占用库位返回0', async () => {
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { calculateDailyStorageFees } = await import('../chargeService');
      const result = await calculateDailyStorageFees('T1');

      expect(result.clientsCharged).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(WorkCharge.create).not.toHaveBeenCalled();
    });

    it('料金設定のない顧客はスキップ / 无费率的客户跳过', async () => {
      vi.mocked(StockQuant.aggregate).mockResolvedValue([
        { clientId: 'C1', locationCount: 5 },
        { clientId: 'C2', locationCount: 3 },
      ]);

      // C1専用料金のみ、デフォルトなし / 只有C1专用费率，无默认
      vi.mocked(ServiceRate.find).mockReturnValue(chainLean([
        { clientId: 'C1', unitPrice: 100, chargeType: 'storage', isActive: true },
      ]) as any);

      const { calculateDailyStorageFees } = await import('../chargeService');
      const result = await calculateDailyStorageFees('T1');

      expect(result.clientsCharged).toBe(1);
      expect(result.totalAmount).toBe(500); // 5 × 100
    });

    it('DB例外で0を返すこと / DB异常返回0', async () => {
      vi.mocked(StockQuant.aggregate).mockRejectedValue(new Error('DB error'));

      const { calculateDailyStorageFees } = await import('../chargeService');
      const result = await calculateDailyStorageFees('T1');

      expect(result.clientsCharged).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  // ─── generateMonthlyBilling / 月次請求書生成 ─────────────────

  describe('generateMonthlyBilling / 月次請求書生成', () => {
    it('顧客別に請求レコードを生成すること / 按客户生成账单记录', async () => {
      vi.mocked(WorkCharge.aggregate).mockResolvedValue([
        {
          _id: 'C1',
          orderCount: 10,
          totalQuantity: 50,
          handlingFee: 5000,
          storageFee: 2000,
          shippingCost: 3000,
          otherFees: 500,
          totalAmount: 10500,
        },
      ]);

      vi.mocked(Client.find).mockReturnValue(chainLean([{ _id: 'C1', name: '株式会社テスト' }]) as any);

      const { generateMonthlyBilling } = await import('../chargeService');
      const result = await generateMonthlyBilling('T1', '2026-03');

      expect(result.recordCount).toBe(1);
      expect(result.totalAmount).toBe(10500);
      expect(BillingRecord.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', period: '2026-03' }),
        expect.objectContaining({
          $set: expect.objectContaining({
            clientName: '株式会社テスト',
            totalAmount: 10500,
            status: 'draft',
          }),
        }),
        expect.objectContaining({ upsert: true }),
      );
      expect(WorkCharge.updateMany).toHaveBeenCalled();
    });

    it('未請求チャージなしで0件を返す / 无未计费费用返回0', async () => {
      vi.mocked(WorkCharge.aggregate).mockResolvedValue([]);

      const { generateMonthlyBilling } = await import('../chargeService');
      const result = await generateMonthlyBilling('T1', '2026-03');

      expect(result.recordCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('clientIdなしの場合もclientNameはundefined / 无clientId时clientName为undefined', async () => {
      vi.mocked(WorkCharge.aggregate).mockResolvedValue([
        {
          _id: null,
          orderCount: 5,
          totalQuantity: 20,
          handlingFee: 2000,
          storageFee: 0,
          shippingCost: 0,
          otherFees: 0,
          totalAmount: 2000,
        },
      ]);

      const { generateMonthlyBilling } = await import('../chargeService');
      const result = await generateMonthlyBilling('T1', '2026-03');

      expect(result.recordCount).toBe(1);
      // clientIdがnullのためClient.findは呼ばれない / clientId为null所以不调用Client.find
      expect(Client.find).not.toHaveBeenCalled();
    });

    it('DB例外で0を返す / DB异常返回0', async () => {
      vi.mocked(WorkCharge.aggregate).mockRejectedValue(new Error('DB error'));

      const { generateMonthlyBilling } = await import('../chargeService');
      const result = await generateMonthlyBilling('T1', '2026-03');

      expect(result.recordCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  // ─── getBillingSummary / 請求サマリー取得 ─────────────────────

  describe('getBillingSummary / 請求サマリー取得', () => {
    it('請求レコードとグランドトータルを返す / 账单记录和总计金额', async () => {
      const records = [
        { tenantId: 'T1', clientId: 'C1', totalAmount: 10000 },
        { tenantId: 'T1', clientId: 'C2', totalAmount: 5000 },
      ];
      vi.mocked(BillingRecord.find).mockReturnValue(chainSortLean(records) as any);

      const { getBillingSummary } = await import('../chargeService');
      const result = await getBillingSummary('T1', '2026-03');

      expect(result.records).toHaveLength(2);
      expect(result.grandTotal).toBe(15000);
    });

    it('レコードなしで空配列を返す / 无记录返回空数组', async () => {
      vi.mocked(BillingRecord.find).mockReturnValue(chainSortLean([]) as any);

      const { getBillingSummary } = await import('../chargeService');
      const result = await getBillingSummary('T1', '2026-03');

      expect(result.records).toHaveLength(0);
      expect(result.grandTotal).toBe(0);
    });
  });
});
