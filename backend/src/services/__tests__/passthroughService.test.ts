/**
 * passthroughService 单元测试 / passthroughService ユニットテスト
 *
 * 通過型（FBA/RSL/B2B）倉庫オペレーション全ライフサイクルをカバー
 * 覆盖通过型（FBA/RSL/B2B）仓库操作全生命周期
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();

const mockSave = vi.fn();
const mockOrderDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: oid(),
    orderNumber: 'IN-20260319-0001',
    tenantId: 'T1',
    status: 'confirmed',
    flowType: 'passthrough',
    destinationType: 'fba',
    lines: [],
    serviceOptions: [],
    save: mockSave,
    markModified: vi.fn(),
    ...overrides,
  };
  return doc;
};

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/models/serviceRate', () => ({
  ServiceRate: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/workCharge', () => ({
  WorkCharge: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { InboundOrder } from '@/models/inboundOrder';
import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
import { Product } from '@/models/product';
import { Client } from '@/models/client';
import { logger } from '@/lib/logger';

const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

describe('passthroughService / 通過型サービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockImplementation(function(this: any) { return Promise.resolve(this); });
  });

  // ============================================================
  // createPassthroughOrder / 通過型入庫予約作成
  // ============================================================
  describe('createPassthroughOrder / 通過型入庫予約作成', () => {
    it('予約を作成しconfirmedステータスにすること / 创建预约并设为confirmed', async () => {
      const created = mockOrderDoc({ status: 'confirmed' });
      vi.mocked(InboundOrder.create).mockResolvedValue(created as any);
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Product.findOne).mockReturnValue(chainLean(null) as any);

      const { createPassthroughOrder } = await import('../passthroughService');
      const order = await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [{ productSku: 'SKU-001', quantity: 10, productName: 'テスト商品' }],
      } as any);

      expect(InboundOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'T1',
          status: 'confirmed',
          flowType: 'passthrough',
        }),
      );
    });

    it('SKU→productId自動マッチングすること / SKU自动匹配productId', async () => {
      const productId = oid();
      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: '自動マッチ商品' }) as any,
      );
      vi.mocked(InboundOrder.create).mockResolvedValue(mockOrderDoc() as any);
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [{ productSku: 'SKU-001', quantity: 10, productId: '000000000000000000000000' }],
      } as any);

      // Product.findOne が呼ばれること / Product.findOneが呼ばれることを確認
      expect(Product.findOne).toHaveBeenCalled();
    });

    it('商品マッチ時にproductNameを既存値から取得すること / 匹配商品时保留已有productName', async () => {
      // productName が既に設定されている場合は上書きしない / 已有productName时不覆盖
      const productId = oid();
      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-999', name: 'DB商品名' }) as any,
      );
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);

      let capturedLines: any;
      vi.mocked(InboundOrder.create).mockImplementation(async (data: any) => {
        capturedLines = data.lines;
        return mockOrderDoc() as any;
      });

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [{
          productSku: 'SKU-999',
          quantity: 5,
          productName: '既存の商品名',
          productId: '000000000000000000000000',
        }],
      } as any);

      // 既存の productName が保持されていること / 既存のproductNameが優先される
      expect(capturedLines[0].productName).toBe('既存の商品名');
    });

    it('商品マッチ時にproductNameが未設定ならDBから取得すること / 未设置productName时从DB取得', async () => {
      // productName が未設定の場合は DB の name を使用 / 未设置时使用DB的name
      const productId = oid();
      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-888', name: 'DBから取得した商品名' }) as any,
      );
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);

      let capturedLines: any;
      vi.mocked(InboundOrder.create).mockImplementation(async (data: any) => {
        capturedLines = data.lines;
        return mockOrderDoc() as any;
      });

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [{
          productSku: 'SKU-888',
          quantity: 5,
          productName: '',
          productId: '000000000000000000000000',
        }],
      } as any);

      // DB の名前が使われること / DBの名前が使われること
      expect(capturedLines[0].productName).toBe('DBから取得した商品名');
    });

    it('顧客名自動取得 / 自动获取客户名', async () => {
      const clientId = oid();
      vi.mocked(Client.findById).mockReturnValue(
        chainLean({ _id: clientId, name: '株式会社テスト' }) as any,
      );
      vi.mocked(InboundOrder.create).mockResolvedValue(mockOrderDoc() as any);
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        clientId,
        destinationType: 'fba',
        lines: [],
      } as any);

      expect(Client.findById).toHaveBeenCalledWith(clientId);
    });

    it('clientNameが既に提供されていればClient検索をスキップすること / 已有clientName时不查DB', async () => {
      // clientName 提供済みの場合は Client.findById を呼ばない
      // clientNameが指定されている場合はClient.findByIdを呼ばない
      vi.mocked(InboundOrder.create).mockResolvedValue(mockOrderDoc() as any);
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        clientId: oid(),
        clientName: '既存の顧客名',
        destinationType: 'fba',
        lines: [],
      } as any);

      expect(Client.findById).not.toHaveBeenCalled();
    });

    it('作業オプションに顧客専用レートが見つかった場合に費用を計算すること / 找到客户专属费率时计算费用', async () => {
      // 顧客専用レート（第1クエリ）が見つかった場合に unitPrice / estimatedCost を設定する
      // 客户专属费率（第一次查询）命中时设置unitPrice/estimatedCost
      vi.mocked(ServiceRate.findOne).mockReturnValue(
        chainLean({ unitPrice: 100 }) as any,
      );
      vi.mocked(Product.findOne).mockReturnValue(chainLean(null) as any);

      let capturedOptions: any;
      vi.mocked(InboundOrder.create).mockImplementation(async (data: any) => {
        capturedOptions = data.serviceOptions;
        return mockOrderDoc() as any;
      });

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [],
        serviceOptions: [{ optionCode: 'labeling', optionName: 'ラベル貼り', quantity: 5, unitPrice: 0 }],
      } as any);

      // unitPrice と estimatedCost が ServiceRate の値で上書きされること
      // unitPriceとestimatedCostがServiceRateの値で設定されること
      expect(capturedOptions[0].unitPrice).toBe(100);
      expect(capturedOptions[0].estimatedCost).toBe(500); // 5 * 100
    });

    it('顧客専用レートなしでデフォルトレートを使用すること / 客户专属费率不存在时使用默认费率', async () => {
      // 第1クエリは null、第2クエリ（デフォルト）はレートを返す
      // 第一次查询为null，第二次查询（默认）返回费率
      let callCount = 0;
      vi.mocked(ServiceRate.findOne).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainLean(null) as any; // client-specific → null
        return chainLean({ unitPrice: 80 }) as any;         // fallback default
      });
      vi.mocked(Product.findOne).mockReturnValue(chainLean(null) as any);

      let capturedOptions: any;
      vi.mocked(InboundOrder.create).mockImplementation(async (data: any) => {
        capturedOptions = data.serviceOptions;
        return mockOrderDoc() as any;
      });

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [],
        serviceOptions: [{ optionCode: 'inspection', optionName: '検品', quantity: 10, unitPrice: 0 }],
      } as any);

      // デフォルトレートが使われること / デフォルト費率が適用されること
      expect(capturedOptions[0].unitPrice).toBe(80);
      expect(capturedOptions[0].estimatedCost).toBe(800); // 10 * 80
    });

    it('作業オプションのレートが見つからない場合はunitPriceを変更しないこと / 费率不存在时不修改unitPrice', async () => {
      // 両クエリとも null → rate が null なので unitPrice は変更しない
      // 两次查询均为null时不修改unitPrice
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Product.findOne).mockReturnValue(chainLean(null) as any);

      let capturedOptions: any;
      vi.mocked(InboundOrder.create).mockImplementation(async (data: any) => {
        capturedOptions = data.serviceOptions;
        return mockOrderDoc() as any;
      });

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [],
        serviceOptions: [{ optionCode: 'wrapping', optionName: '梱包', quantity: 3, unitPrice: 200 }],
      } as any);

      // レートが見つからないので初期値のまま / 费率未找到，保持初始值
      expect(capturedOptions[0].unitPrice).toBe(200);
    });
  });

  // ============================================================
  // arriveOrder / 受付処理
  // ============================================================
  describe('arriveOrder / 受付処理', () => {
    it('confirmed→arrived/processingに遷移すること / 状态从confirmed转为arrived', async () => {
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [{ optionCode: 'labeling', status: 'pending', quantity: 10, unitPrice: 50 }],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 5,
        receivedBy: 'staff-1',
      });

      // serviceOptions があるので processing に遷移 / serviceOptionsありのためprocessingに遷移
      expect(order.status).toBe('processing');
      expect(order.actualBoxCount).toBe(5);
      expect(mockSave).toHaveBeenCalled();
    });

    it('serviceOptionsなし＋B2B→ready_to_ship遷移 / 无作业选项+B2B直接ready_to_ship', async () => {
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 3,
        receivedBy: 'staff-1',
      });

      // B2B + serviceOptionsなし → ready_to_ship / B2B+サービスなし→ready_to_ship
      expect(order.status).toBe('ready_to_ship');
    });

    it('serviceOptionsなし＋FBA+ラベル未準備→awaiting_label / 无作业+FBA+标未就绪→awaiting_label', async () => {
      // FBAでラベルがない場合は awaiting_label に遷移する
      // FBA且标签未就绪时转为awaiting_label
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'fba',
        fbaInfo: { labelSplitStatus: 'pending', labelPdfUrl: null },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 2,
        receivedBy: 'staff-2',
      });

      // FBAラベル未準備 → awaiting_label / FBAラベル未準備→awaiting_label
      expect(order.status).toBe('awaiting_label');
    });

    it('serviceOptionsなし＋FBA+ラベル準備OK→ready_to_ship / 无作业+FBA+标就绪→ready_to_ship', async () => {
      // FBAでラベルが準備済みの場合は ready_to_ship に遷移する
      // FBA且标签已就绪时直接转为ready_to_ship
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'fba',
        fbaInfo: { labelSplitStatus: 'split', labelPdfUrl: null },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 4,
        receivedBy: 'staff-3',
      });

      expect(order.status).toBe('ready_to_ship');
    });

    it('serviceOptionsなし＋FBA+labelPdfUrl設定済み→ready_to_ship / labelPdfUrl設定済みでready_to_ship', async () => {
      // labelPdfUrl が設定されている場合もラベル準備OK
      // labelPdfUrlが設定されている場合もラベル準備完了と見なす
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'fba',
        fbaInfo: { labelPdfUrl: 'https://s3.example.com/label.pdf' },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 1,
        receivedBy: 'staff-4',
      });

      expect(order.status).toBe('ready_to_ship');
    });

    it('差異明細あり（差異あり）→varianceReportを記録すること / 有差异明细时记录varianceReport', async () => {
      // varianceDetails がある場合は varianceReport を設定する
      // 有差异明细时设置varianceReport
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 3,
        receivedBy: 'staff-5',
        varianceDetails: [
          { sku: 'SKU-001', expectedQuantity: 10, actualQuantity: 8, variance: -2 },
        ],
      });

      expect(order.varianceReport).toBeDefined();
      expect(order.varianceReport.hasVariance).toBe(true);
      expect(order.varianceReport.details).toHaveLength(1);
      expect(order.varianceReport.reportedAt).toBeInstanceOf(Date);
    });

    it('差異明細あり（差異ゼロ）→hasVariance=falseになること / 差异为零时hasVariance=false', async () => {
      // variance がすべて 0 の場合は hasVariance = false
      // 所有差异为0时hasVariance=false
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 3,
        receivedBy: 'staff-6',
        varianceDetails: [
          { sku: 'SKU-001', expectedQuantity: 5, actualQuantity: 5, variance: 0 },
        ],
      });

      expect(order.varianceReport.hasVariance).toBe(false);
    });

    it('差異明細が空配列の場合はvarianceReportを設定しないこと / 差异明细为空时不设置varianceReport', async () => {
      // 空配列の場合は varianceReport を設定しない
      // 空数组时不设置varianceReport
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), {
        actualBoxCount: 2,
        receivedBy: 'staff-7',
        varianceDetails: [],
      });

      expect(order.varianceReport).toBeUndefined();
    });

    it('confirmed以外はエラー / 非confirmed状态报错', async () => {
      const order = mockOrderDoc({ status: 'shipped' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await expect(
        arriveOrder(String(order._id), { actualBoxCount: 1, receivedBy: 'staff-1' }),
      ).rejects.toThrow('confirmed');
    });

    it('オーダーが存在しない場合はエラーを投げること / 订单不存在时报错', async () => {
      // findById が null を返す場合はエラーを投げる
      // findByIdがnullを返す場合はエラーを投げる
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { arriveOrder } = await import('../passthroughService');
      await expect(
        arriveOrder('non-existent-id', { actualBoxCount: 1, receivedBy: 'staff-1' }),
      ).rejects.toThrow('見つかりません');
    });
  });

  // ============================================================
  // completeServiceOption / 作業完了
  // ============================================================
  describe('completeServiceOption / 作業完了', () => {
    it('作業完了で自動計費すること / 作业完成自动计费', async () => {
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [
          { optionCode: 'labeling', optionName: 'ラベル貼り', status: 'pending', quantity: 10, unitPrice: 50, estimatedCost: 500 },
        ],
        destinationType: 'b2b',
        tenantId: 'T1',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await completeServiceOption(String(order._id), 'labeling', 10);

      expect(order.serviceOptions[0].status).toBe('completed');
      expect(order.serviceOptions[0].actualQuantity).toBe(10);
    });

    it('全オプション完了後にB2B→ready_to_shipに遷移すること / 全选项完成+B2B转ready_to_ship', async () => {
      // 全オプション完了 + B2B → ready_to_ship / 全选项完成+B2B→ready_to_ship
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [
          { optionCode: 'labeling', optionName: 'ラベル', status: 'pending', quantity: 5, unitPrice: 30, estimatedCost: 150 },
        ],
        destinationType: 'b2b',
        tenantId: 'T1',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await completeServiceOption(String(order._id), 'labeling', 5);

      // B2B はラベル不要なので ready_to_ship / B2BはラベルOK → ready_to_ship
      expect(order.status).toBe('ready_to_ship');
    });

    it('全オプション完了後にFBA+ラベル未準備→awaiting_labelに遷移すること / 全完成+FBA标未就绪→awaiting_label', async () => {
      // 全オプション完了 + FBAラベル未準備 → awaiting_label
      // 全选项完成+FBA标签未就绪→awaiting_label
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [
          { optionCode: 'inspection', optionName: '検品', status: 'pending', quantity: 20, unitPrice: 10, estimatedCost: 200 },
        ],
        destinationType: 'fba',
        fbaInfo: { labelSplitStatus: 'pending', labelPdfUrl: null },
        tenantId: 'T1',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await completeServiceOption(String(order._id), 'inspection', 20);

      // FBAラベル未準備 → awaiting_label / FBA标未就绪→awaiting_label
      expect(order.status).toBe('awaiting_label');
    });

    it('一部オプション未完了の場合はステータスを変更しないこと / 部分完成时不改变状态', async () => {
      // 一部のオプションがまだ pending の場合はステータスを変更しない
      // 部分选项未完成时不修改状态
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [
          { optionCode: 'labeling', optionName: 'ラベル', status: 'pending', quantity: 5, unitPrice: 30, estimatedCost: 150 },
          { optionCode: 'inspection', optionName: '検品', status: 'pending', quantity: 10, unitPrice: 20, estimatedCost: 200 },
        ],
        destinationType: 'b2b',
        tenantId: 'T1',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      // labeling のみ完了、inspection はまだ pending
      // labelingのみ完了、inspectionはpendingのまま
      await completeServiceOption(String(order._id), 'labeling', 5);

      // processing のまま変わらないこと / processingのまま変わらない
      expect(order.status).toBe('processing');
    });

    it('存在しないオプション→エラー / 不存在的选项报错', async () => {
      const order = mockOrderDoc({ serviceOptions: [] });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await expect(
        completeServiceOption(String(order._id), 'nonexistent', 10),
      ).rejects.toThrow('見つかりません');
    });

    it('オーダーが存在しない場合はエラーを投げること / 订单不存在时报错', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { completeServiceOption } = await import('../passthroughService');
      await expect(
        completeServiceOption('bad-id', 'labeling', 5),
      ).rejects.toThrow('見つかりません');
    });

    it('計費失敗しても例外をスローせずlogger.warnを呼ぶこと / 计费失败时仅警告不抛出异常', async () => {
      // WorkCharge.create が失敗してもメインフローはブロックしない
      // WorkCharge.createが失敗してもメインフローを中断しない
      vi.mocked(WorkCharge.create).mockRejectedValue(new Error('DB接続失敗 / DB连接失败'));
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [
          { optionCode: 'wrapping', optionName: '梱包', status: 'pending', quantity: 3, unitPrice: 50, estimatedCost: 150 },
        ],
        destinationType: 'b2b',
        tenantId: 'T1',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      // エラーを投げないこと / エラーを投げないこと
      await expect(completeServiceOption(String(order._id), 'wrapping', 3)).resolves.not.toThrow();
      // logger.warn が呼ばれること / logger.warnが呼ばれること
      expect(vi.mocked(logger.warn)).toHaveBeenCalled();
    });
  });

  // ============================================================
  // onLabelUploaded / FBAラベルアップロード完了
  // ============================================================
  describe('onLabelUploaded / FBAラベルアップロード完了', () => {
    it('awaiting_label＋全作業完了→ready_to_shipに遷移すること / awaiting_label+全完成→ready_to_ship', async () => {
      // awaiting_label かつ全サービスオプション完了 → ready_to_ship
      // awaiting_label且全选项完成→ready_to_ship
      const order = mockOrderDoc({
        status: 'awaiting_label',
        serviceOptions: [
          { optionCode: 'labeling', status: 'completed', quantity: 5, unitPrice: 30 },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { onLabelUploaded } = await import('../passthroughService');
      await onLabelUploaded(String(order._id));

      expect(order.status).toBe('ready_to_ship');
      expect(mockSave).toHaveBeenCalled();
    });

    it('awaiting_label＋serviceOptionsなし→ready_to_shipに遷移すること / awaiting_label+无选项→ready_to_ship', async () => {
      // serviceOptions が空配列の場合も全完了扱い → ready_to_ship
      // serviceOptionsが空配列の場合も全完了とみなす→ready_to_ship
      const order = mockOrderDoc({
        status: 'awaiting_label',
        serviceOptions: [],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { onLabelUploaded } = await import('../passthroughService');
      await onLabelUploaded(String(order._id));

      expect(order.status).toBe('ready_to_ship');
    });

    it('awaiting_label＋未完了オプションあり→ステータスを変更しないこと / awaiting_label+未完成选项→不改变状态', async () => {
      // 未完了のオプションが残っている場合は ready_to_ship に遷移しない
      // 有未完成选项时不转为ready_to_ship
      const order = mockOrderDoc({
        status: 'awaiting_label',
        serviceOptions: [
          { optionCode: 'inspection', status: 'pending', quantity: 10, unitPrice: 20 },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { onLabelUploaded } = await import('../passthroughService');
      await onLabelUploaded(String(order._id));

      // awaiting_label のまま変わらない / awaiting_labelのまま変わらない
      expect(order.status).toBe('awaiting_label');
    });

    it('awaiting_label以外のステータスはステータスを変更しないこと / 非awaiting_label状态不改变', async () => {
      // processing 状態の場合はラベルアップロードが届いても変化しない
      // processing状态时ラベルアップロードが届いても変化しない
      const order = mockOrderDoc({
        status: 'processing',
        serviceOptions: [{ optionCode: 'labeling', status: 'completed' }],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { onLabelUploaded } = await import('../passthroughService');
      await onLabelUploaded(String(order._id));

      // processing のまま変わらないこと / processingのまま変わらない
      expect(order.status).toBe('processing');
      expect(mockSave).toHaveBeenCalled(); // save は呼ばれる
    });

    it('オーダーが存在しない場合はエラーを投げること / 订单不存在时报错', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { onLabelUploaded } = await import('../passthroughService');
      await expect(onLabelUploaded('bad-id')).rejects.toThrow('見つかりません');
    });
  });

  // ============================================================
  // shipOrder / 出荷完了
  // ============================================================
  describe('shipOrder / 出荷完了', () => {
    it('ready_to_ship→shippedに遷移すること / 从ready_to_ship转为shipped', async () => {
      const order = mockOrderDoc({ status: 'ready_to_ship' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { shipOrder } = await import('../passthroughService');
      await shipOrder(String(order._id), {
        trackingNumbers: [{ trackingNumber: 'TRK-001', carrier: 'yamato' }],
        shippedBy: 'staff-1',
      });

      expect(order.status).toBe('shipped');
      expect(order.trackingNumbers).toHaveLength(1);
      expect(order.shippedAt).toBeInstanceOf(Date);
    });

    it('複数追跡番号を設定すること / 支持多个追踪号', async () => {
      // 複数追跡番号を一括登録できること / 支持批量登录多个追踪号
      const order = mockOrderDoc({ status: 'ready_to_ship' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { shipOrder } = await import('../passthroughService');
      await shipOrder(String(order._id), {
        trackingNumbers: [
          { boxNumber: 'BOX-1', trackingNumber: 'TRK-001', carrier: 'yamato' },
          { boxNumber: 'BOX-2', trackingNumber: 'TRK-002', carrier: 'sagawa' },
        ],
      });

      expect(order.trackingNumbers).toHaveLength(2);
    });

    it('ready_to_ship以外はエラー / 非ready_to_ship状态报错', async () => {
      const order = mockOrderDoc({ status: 'processing' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { shipOrder } = await import('../passthroughService');
      await expect(
        shipOrder(String(order._id), { trackingNumbers: [] }),
      ).rejects.toThrow('ready_to_ship');
    });

    it('オーダーが存在しない場合はエラーを投げること / 订单不存在时报错', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { shipOrder } = await import('../passthroughService');
      await expect(
        shipOrder('bad-id', { trackingNumbers: [] }),
      ).rejects.toThrow('見つかりません');
    });
  });

  // ============================================================
  // acknowledgeVariance / 差異確認
  // ============================================================
  describe('acknowledgeVariance / 差異確認', () => {
    it('差異レポートの確認日時を記録すること / 记录差异确认时间', async () => {
      const order = mockOrderDoc({
        varianceReport: { hasVariance: true, details: [], reportedAt: new Date() },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { acknowledgeVariance } = await import('../passthroughService');
      await acknowledgeVariance(String(order._id));

      expect(order.varianceReport.clientViewedAt).toBeInstanceOf(Date);
      expect(order.markModified).toHaveBeenCalledWith('varianceReport');
    });

    it('差異レポートがない場合はmarkModifiedを呼ばないこと / 无差异报告时不调用markModified', async () => {
      // varianceReport が未設定の場合は markModified を呼ばない
      // varianceReportが未設定の場合はmarkModifiedを呼ばない
      const order = mockOrderDoc({ varianceReport: undefined });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { acknowledgeVariance } = await import('../passthroughService');
      await acknowledgeVariance(String(order._id));

      // markModified は呼ばれないこと / markModifiedは呼ばれないこと
      expect(order.markModified).not.toHaveBeenCalled();
      // save は呼ばれること / saveは呼ばれること
      expect(mockSave).toHaveBeenCalled();
    });

    it('オーダーが存在しない場合はエラーを投げること / 订单不存在时报错', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { acknowledgeVariance } = await import('../passthroughService');
      await expect(acknowledgeVariance('bad-id')).rejects.toThrow('見つかりません');
    });
  });

  // ============================================================
  // checkLabelReady (internal) via arriveOrder / checkLabelReady内部ヘルパーテスト
  // ============================================================
  describe('checkLabelReady - RSL / unknown destinations / RSL・不明宛先のラベル判定', () => {
    it('RSL＋labelSplitStatus=split→ready_to_ship / RSL+split→ready_to_ship', async () => {
      // RSL destinationType で labelSplitStatus が split の場合はラベル準備OK
      // RSL宛先でlabelSplitStatusがsplitの場合はラベル準備完了
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'rsl',
        rslInfo: { labelSplitStatus: 'split', labelPdfUrl: null },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), { actualBoxCount: 2, receivedBy: 'staff-rsl' });

      expect(order.status).toBe('ready_to_ship');
    });

    it('RSL＋labelPdfUrl設定済み→ready_to_ship / RSL+labelPdfUrlあり→ready_to_ship', async () => {
      // RSL で labelPdfUrl が設定されている場合もラベル準備OK
      // RSLでlabelPdfUrlが設定されている場合もラベル準備完了
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'rsl',
        rslInfo: { labelPdfUrl: 'https://s3.example.com/rsl-label.pdf' },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), { actualBoxCount: 1, receivedBy: 'staff-rsl-2' });

      expect(order.status).toBe('ready_to_ship');
    });

    it('RSL＋ラベル未準備→awaiting_label / RSL+ラベル未就绪→awaiting_label', async () => {
      // RSL でラベルが準備されていない場合は awaiting_label
      // RSLでラベルが未準備の場合はawaiting_label
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'rsl',
        rslInfo: { labelSplitStatus: 'pending', labelPdfUrl: null },
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), { actualBoxCount: 1, receivedBy: 'staff-rsl-3' });

      expect(order.status).toBe('awaiting_label');
    });

    it('不明宛先タイプ→ready_to_ship / 未知宛先类型→ready_to_ship', async () => {
      // 未知の destinationType は checkLabelReady が true を返す → ready_to_ship
      // 未知のdestinationTypeはcheckLabelReadyがtrueを返す→ready_to_ship
      const order = mockOrderDoc({
        status: 'confirmed',
        serviceOptions: [],
        destinationType: 'unknown_type',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { arriveOrder } = await import('../passthroughService');
      await arriveOrder(String(order._id), { actualBoxCount: 1, receivedBy: 'staff-unknown' });

      // 不明宛先でも ready_to_ship / 未知宛先でもready_to_ship
      expect(order.status).toBe('ready_to_ship');
    });
  });

  // ============================================================
  // createChargeForOption - WorkCharge fallback branches
  // WorkCharge作成時のフォールバック分岐テスト
  // ============================================================
  describe('createChargeForOption - WorkCharge fallback branches / WorkCharge作成フォールバック分岐', () => {
    it('tenantIdが未設定の場合はdefaultを使用すること / tenantIdなし時はdefaultを使用', async () => {
      // tenantId が falsy な場合は 'default' にフォールバック
      // tenantIdがfalsyな場合は'default'にフォールバック
      vi.mocked(WorkCharge.create).mockResolvedValue({} as any);
      const order = mockOrderDoc({
        status: 'processing',
        tenantId: undefined, // tenantId なし / tenantIdなし
        serviceOptions: [
          { optionCode: 'wrapping', optionName: '梱包', status: 'pending', quantity: 2, unitPrice: 60, estimatedCost: 120 },
        ],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await completeServiceOption(String(order._id), 'wrapping', 2);

      // WorkCharge.create が tenantId='default' で呼ばれること
      // WorkCharge.createがtenantId='default'で呼ばれること
      expect(vi.mocked(WorkCharge.create)).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'default' }),
      );
    });

    it('actualQuantityがない場合はquantityにフォールバックすること / actualQuantityなし時はquantityを使用', async () => {
      // actualQuantity が未設定の場合は quantity をフォールバックとして使う
      // actualQuantityが未設定の場合はquantityをフォールバックとして使う
      vi.mocked(WorkCharge.create).mockResolvedValue({} as any);
      const order = mockOrderDoc({
        status: 'processing',
        tenantId: 'T1',
        serviceOptions: [
          {
            optionCode: 'tagging',
            optionName: 'タグ付け',
            status: 'pending',
            quantity: 7,
            unitPrice: 25,
            estimatedCost: 175,
            actualQuantity: undefined, // actualQuantity なし / actualQuantityなし
            actualCost: undefined,     // actualCost なし / actualCostなし
          },
        ],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      await completeServiceOption(String(order._id), 'tagging', 0); // 0 を渡して actualQuantity=0 は falsy

      // quantity=7 が fallback として WorkCharge に渡されること
      // quantity=7がフォールバックとしてWorkChargeに渡されること
      expect(vi.mocked(WorkCharge.create)).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 7 }),
      );
    });

    it('actualCostがない場合はestimatedCostにフォールバックすること / actualCostなし時はestimatedCostを使用', async () => {
      // actualCost が 0 (falsy) の場合は estimatedCost をフォールバックとして使う
      // actualCostが0(falsy)の場合はestimatedCostをフォールバックとして使う
      vi.mocked(WorkCharge.create).mockResolvedValue({} as any);
      const order = mockOrderDoc({
        status: 'processing',
        tenantId: 'T1',
        serviceOptions: [
          {
            optionCode: 'photo',
            optionName: '撮影',
            status: 'pending',
            quantity: 3,
            unitPrice: 200,
            estimatedCost: 600,
            actualQuantity: undefined,
            actualCost: undefined, // actualCost なし → estimatedCost を使う
          },
        ],
        destinationType: 'b2b',
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { completeServiceOption } = await import('../passthroughService');
      // actualQuantity=0 を渡すことで actualCost = 0 * unitPrice = 0 → falsy
      await completeServiceOption(String(order._id), 'photo', 0);

      // estimatedCost=600 が amount として WorkCharge に渡されること
      // estimatedCost=600がamountとしてWorkChargeに渡されること
      expect(vi.mocked(WorkCharge.create)).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 600 }),
      );
    });
  });

  // ============================================================
  // createPassthroughOrder - productId が有効な場合はSKU検索をスキップ
  // productIdが有効な場合のSKU検索スキップテスト
  // ============================================================
  describe('createPassthroughOrder - productId skip branch / productId有効時のSKU検索スキップ', () => {
    it('有効なproductIdが設定されている場合はProduct検索をスキップすること / 有效productId时跳过Product查询', async () => {
      // productId が '000000000000000000000000' 以外の値が設定されている場合は Product.findOne を呼ばない
      // productIdが'000000000000000000000000'以外の場合はProduct.findOneを呼ばない
      vi.mocked(ServiceRate.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(InboundOrder.create).mockResolvedValue(mockOrderDoc() as any);

      const { createPassthroughOrder } = await import('../passthroughService');
      await createPassthroughOrder({
        tenantId: 'T1',
        destinationType: 'fba',
        lines: [
          {
            productSku: 'SKU-VALID',
            quantity: 5,
            productId: oid(), // 有効な ObjectId / 有効なObjectId
            productName: '有効商品',
          },
        ],
      } as any);

      // 有効な productId があるので Product.findOne は呼ばれない
      // 有効なproductIdがあるのでProduct.findOneは呼ばれない
      expect(Product.findOne).not.toHaveBeenCalled();
    });
  });
});
