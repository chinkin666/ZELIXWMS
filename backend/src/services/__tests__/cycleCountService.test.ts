/**
 * cycleCountService 単元測試 / cycleCountService ユニットテスト
 *
 * カバレッジ目標: 85%+ / 覆盖率目标: 85%+
 * テスト範囲 / 测试范围:
 *   - generateMonthlyCycleCount: SKU抽選・在庫なし・既存計画・カスタム抽選率・ロケーションマッピング
 *   - recordCount: 正常記録・計画なし・非進行中・無効インデックス・差異率計算(ゼロ除算含む)
 *   - checkVarianceAlerts: アラート発行・閾値以下・未カウント・計画なし・confirmed項目・ゼロ数量
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();

vi.mock('@/models/cycleCountPlan', () => ({
  CycleCountPlan: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { find: vi.fn() },
}));

vi.mock('@/models/product', () => ({
  Product: { find: vi.fn() },
}));

vi.mock('@/models/location', () => ({
  Location: { find: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { CycleCountPlan } from '@/models/cycleCountPlan';
import { StockQuant } from '@/models/stockQuant';
import { Product } from '@/models/product';
import { Location } from '@/models/location';
import { logger } from '@/lib/logger';

// チェーン可能なモックヘルパー / 可链式调用的模拟助手
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });
const chainSelect = (val: any) => ({
  select: () => ({ lean: () => Promise.resolve(val) }),
});
const mockSave = vi.fn().mockResolvedValue(undefined);

// ─── テスト用共通クォントデータ / 测试用通用库存数据 ─────────────────────────

/** 5件のユニークSKUを持つ在庫 / 5个唯一SKU的库存 */
function buildQuants(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    productId: oid(),
    productSku: `SKU-${String(i + 1).padStart(3, '0')}`,
    locationId: oid(),
    quantity: 100 - i * 5,
  }));
}

describe('cycleCountService / 循環棚卸サービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── generateMonthlyCycleCount / 月次計画自動生成 ──────────────────────────

  describe('generateMonthlyCycleCount / 月次計画自動生成', () => {
    it('5 SKUから20%（ceil=1件）を抽選し計画を生成すること / 从5个SKU抽选20%(ceil=1件)并生成计划', async () => {
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      const quants = buildQuants(5);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        planNumber: 'CC-2026-03-0001',
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-03');

      expect(CycleCountPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planType: 'monthly_cycle',
          period: '2026-03',
          status: 'draft',
          alertTriggered: false,
        }),
      );
      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      // 5 SKU × 20% = 1 (ceil)
      expect(createArg.targetSkuCount).toBe(1);
      expect(createArg.totalSkuCount).toBe(5);
    });

    it('10 SKUから50%（5件）を抽選できること / 从10个SKU抽选50%(5件)', async () => {
      // カスタム抽選率 50% / 自定义抽选率50%
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      const quants = buildQuants(10);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-04', 0.5);

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      expect(createArg.targetSkuCount).toBe(5);
      expect(createArg.totalSkuCount).toBe(10);
      // coverageRate = 5/10 = 0.5
      expect(createArg.coverageRate).toBeCloseTo(0.5);
    });

    it('1件のSKUしかなくてもceil(0.2)=1件抽選すること / 只有1个SKU时ceil(0.2)=1件', async () => {
      // 最小値境界 / 最小值边界
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([{ productId: oid(), productSku: 'SKU-ONLY', locationId: oid(), quantity: 5 }]) as any,
      );
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-05');

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      // Math.max(1, ceil(1 * 0.2)) = 1
      expect(createArg.targetSkuCount).toBe(1);
    });

    it('在庫ゼロの場合にエラーをスローすること / 无库存时应抛出错误', async () => {
      // 空の在庫一覧 / 空库存列表
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await expect(
        generateMonthlyCycleCount('T1', '2026-06'),
      ).rejects.toThrow('在庫がありません');
    });

    it('既存の計画が存在するときエラーをスローすること / 已有计划时应抛出错误', async () => {
      // 重複計画防止 / 防止重复计划
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue({
        planNumber: 'CC-2026-03-9999',
      } as any);

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await expect(
        generateMonthlyCycleCount('T1', '2026-03'),
      ).rejects.toThrow('既に存在');
    });

    it('ロケーションコードをlocMapから正しく解決すること / 应从locMap正确解析位置代码', async () => {
      // ロケーションコードマッピングの検証 / 验证位置代码映射
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);

      const locId = oid();
      const quants = [
        { productId: oid(), productSku: 'SKU-LOC-001', locationId: locId, quantity: 20 },
      ];
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(
        chainSelect([{ _id: locId, code: 'A-01-01' }]) as any,
      );
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-07', 1.0); // 100%で全件選択

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      expect(createArg.items[0].locationCode).toBe('A-01-01');
    });

    it('ロケーションIDが未登録の場合、locationCodeは空文字 / 未注册的locationId应返回空字符串', async () => {
      // locMapにないIDのフォールバック / locMap中不存在的ID的回退
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);

      const unknownLocId = oid();
      const quants = [
        { productId: oid(), productSku: 'SKU-NO-LOC', locationId: unknownLocId, quantity: 10 },
      ];
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any); // マッチなし

      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-08', 1.0);

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      expect(createArg.items[0].locationCode).toBe('');
    });

    it('同一SKUの複数在庫レコードを重複なく扱うこと / 同一SKU的多个库存记录应去重处理', async () => {
      // 同じSKUが複数ロケーションにある場合 / 同一SKU存在于多个位置的情况
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      const prodId = oid();
      const quants = [
        { productId: prodId, productSku: 'SKU-MULTI', locationId: oid(), quantity: 50 },
        { productId: prodId, productSku: 'SKU-MULTI', locationId: oid(), quantity: 30 },
      ];
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-09', 1.0);

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      // ユニークSKUは1件 → targetSkuCount=1, itemsは2件（両ロケーション）
      expect(createArg.totalSkuCount).toBe(1);
      expect(createArg.items.length).toBe(2);
    });

    it('計画番号がCC-PERIOD-NNNNの形式で生成すること / 计划编号应符合CC-PERIOD-NNNN格式', async () => {
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(buildQuants(1)) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-10');

      const createArg = vi.mocked(CycleCountPlan.create).mock.calls[0][0] as any;
      expect(createArg.planNumber).toMatch(/^CC-2026-10-\d{4}$/);
    });

    it('infoログを出力すること / 应输出info日志', async () => {
      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(buildQuants(3)) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        planNumber: 'CC-2026-11-0001',
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      await generateMonthlyCycleCount('T1', '2026-11');

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.objectContaining({ planNumber: 'CC-2026-11-0001' }),
        expect.any(String),
      );
    });
  });

  // ─── recordCount / カウント結果記録 ──────────────────────────────────────

  describe('recordCount / カウント結果記録', () => {
    it('正常にカウント結果を記録し差異を計算すること / 正常记录计数结果并计算差异', async () => {
      // systemQuantity=100, counted=95 → variance=-5, varianceRate=0.05
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [
          {
            sku: 'SKU-001',
            locationCode: 'A-01-01',
            systemQuantity: 100,
            countedQuantity: undefined as number | undefined,
            variance: undefined as number | undefined,
            varianceRate: undefined as number | undefined,
            countedBy: undefined as string | undefined,
            countedAt: undefined as Date | undefined,
            status: 'pending' as any,
          },
        ],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      const result = await recordCount(String(plan._id), 0, 95, '田中');

      const item = result.items[0];
      expect(item.countedQuantity).toBe(95);
      expect(item.variance).toBe(-5);
      expect(item.varianceRate).toBeCloseTo(0.05);
      expect(item.countedBy).toBe('田中');
      expect(item.countedAt).toBeInstanceOf(Date);
      expect(item.status).toBe('counted');
      expect(mockSave).toHaveBeenCalled();
    });

    it('差異がゼロのときvarianceRate=0 / 无差异时varianceRate=0', async () => {
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [
          { sku: 'SKU-EQ', locationCode: 'B-02', systemQuantity: 50, status: 'pending' as any },
        ],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      const result = await recordCount(String(plan._id), 0, 50, '佐藤');

      expect(result.items[0].variance).toBe(0);
      expect(result.items[0].varianceRate).toBe(0);
    });

    it('systemQuantity=0かつcountedQuantity>0のとき差異率=1 / systemQuantity=0且counted>0时差异率=1', async () => {
      // ゼロ除算ガード: 新規在庫ロケーションに数量が見つかった場合
      // 零除法保护: 在新库存位置发现数量的情况
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [
          { sku: 'SKU-NEW', locationCode: 'C-03', systemQuantity: 0, status: 'pending' as any },
        ],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      const result = await recordCount(String(plan._id), 0, 10, '鈴木');

      expect(result.items[0].varianceRate).toBe(1);
    });

    it('systemQuantity=0かつcountedQuantity=0のとき差異率=0 / systemQuantity=0且counted=0时差异率=0', async () => {
      // 両方ゼロの境界値 / 两者均为零的边界值
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [
          { sku: 'SKU-ZERO', locationCode: 'D-04', systemQuantity: 0, status: 'pending' as any },
        ],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      const result = await recordCount(String(plan._id), 0, 0, '山田');

      expect(result.items[0].varianceRate).toBe(0);
    });

    it('計画が存在しない場合エラーをスローすること / 计划不存在时应抛出错误', async () => {
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(null);

      const { recordCount } = await import('../cycleCountService');
      await expect(
        recordCount('nonexistent-id', 0, 10, 'テスター'),
      ).rejects.toThrow('棚卸計画が見つかりません');
    });

    it('draft状態の計画にカウント不可エラー / draft状态的计划不可计数', async () => {
      // in_progress 以外は拒否 / 非in_progress状态应拒绝
      const plan = {
        _id: oid(),
        status: 'draft',
        items: [{ sku: 'SKU-001', systemQuantity: 10, status: 'pending' as any }],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      await expect(
        recordCount(String(plan._id), 0, 10, 'テスター'),
      ).rejects.toThrow('進行中の計画のみカウント可能');
    });

    it('completed状態の計画にカウント不可エラー / completed状态的计划不可计数', async () => {
      const plan = {
        _id: oid(),
        status: 'completed',
        items: [{ sku: 'SKU-001', systemQuantity: 10, status: 'counted' as any }],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      await expect(
        recordCount(String(plan._id), 0, 10, 'テスター'),
      ).rejects.toThrow('進行中の計画のみカウント可能');
    });

    it('存在しないインデックスのエラー / 不存在的索引应报错', async () => {
      // インデックス999はアイテムがない / 索引999不存在
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [{ sku: 'SKU-001', systemQuantity: 10, status: 'pending' as any }],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      await expect(
        recordCount(String(plan._id), 999, 10, 'テスター'),
      ).rejects.toThrow('項目インデックス 999 が存在しません');
    });

    it('複数アイテムの2番目を記録できること / 应能记录多个项目中的第二项', async () => {
      const plan = {
        _id: oid(),
        status: 'in_progress',
        items: [
          { sku: 'SKU-A', locationCode: 'A', systemQuantity: 100, status: 'pending' as any },
          { sku: 'SKU-B', locationCode: 'B', systemQuantity: 200, status: 'pending' as any },
        ],
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { recordCount } = await import('../cycleCountService');
      const result = await recordCount(String(plan._id), 1, 198, '検品者');

      expect(result.items[1].countedQuantity).toBe(198);
      expect(result.items[1].variance).toBe(-2);
      expect(result.items[0].status).toBe('pending'); // 他アイテムは変更なし
    });
  });

  // ─── checkVarianceAlerts / 差異率アラート ────────────────────────────────

  describe('checkVarianceAlerts / 差異率アラート', () => {
    it('差異率>0.5%のとき alertTriggered=true / 差异率>0.5%时alertTriggered=true', async () => {
      // SKU-A: variance=2/100=2% > 0.5% → アラート発行 / 触发警报
      const plan = {
        _id: oid(),
        planNumber: 'CC-ALERT-001',
        items: [
          { sku: 'SKU-A', locationCode: 'L1', systemQuantity: 100, variance: 2, varianceRate: 0.02, status: 'counted' },
          { sku: 'SKU-B', locationCode: 'L2', systemQuantity: 50, variance: 0, varianceRate: 0, status: 'counted' },
        ],
        totalVarianceRate: undefined as number | undefined,
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      // 全体差異率 = 2/150 ≈ 1.33% > 0.5% / 整体差异率 = 2/150 ≈ 1.33% > 0.5%
      expect(result.alertTriggered).toBe(true);
      expect(result.totalVarianceRate).toBeCloseTo(2 / 150);
      expect(result.highVarianceItems.length).toBeGreaterThanOrEqual(1);
      expect(result.highVarianceItems[0].sku).toBe('SKU-A');
      expect(plan.alertTriggered).toBe(true);
      expect(plan.totalVarianceRate).toBeCloseTo(2 / 150);
      expect(mockSave).toHaveBeenCalled();
    });

    it('差異率<=0.5%のとき alertTriggered=false / 差异率<=0.5%时alertTriggered=false', async () => {
      // 全て正確: SKU-C variance=0 / 全部精确: variance=0
      const plan = {
        _id: oid(),
        planNumber: 'CC-OK-001',
        items: [
          { sku: 'SKU-C', locationCode: 'M1', systemQuantity: 1000, variance: 1, varianceRate: 0.001, status: 'counted' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      // 差異率 = 1/1000 = 0.1% < 0.5% / 差异率 = 0.1% < 0.5%
      expect(result.alertTriggered).toBe(false);
      expect(result.highVarianceItems).toEqual([]);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it('差異率>0.5%のときlogger.warnを出力すること / 差异率>0.5%时输出logger.warn', async () => {
      const plan = {
        _id: oid(),
        planNumber: 'CC-WARN-001',
        items: [
          { sku: 'SKU-W', locationCode: 'W1', systemQuantity: 10, variance: 5, varianceRate: 0.5, status: 'counted' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      await checkVarianceAlerts(String(plan._id));

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.objectContaining({ planNumber: 'CC-WARN-001' }),
        expect.any(String),
      );
    });

    it('カウント未実施アイテムが0件のとき早期リターン / 无已计数项目时应早期返回', async () => {
      // pending項目のみ → countedItems空 / 只有pending项目 → countedItems为空
      const plan = {
        _id: oid(),
        planNumber: 'CC-EMPTY-001',
        items: [
          { sku: 'SKU-P', locationCode: 'P1', systemQuantity: 100, status: 'pending' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      expect(result.totalVarianceRate).toBe(0);
      expect(result.alertTriggered).toBe(false);
      expect(result.highVarianceItems).toEqual([]);
      // saveは呼ばれない（早期リターン）/ save不被调用（早期返回）
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('confirmed状態の項目もカウントに含まれること / confirmed状态的项目也应包含在计数中', async () => {
      // confirmed は検品済み確定ステータス / confirmed 是已验证确认状态
      const plan = {
        _id: oid(),
        planNumber: 'CC-CONF-001',
        items: [
          { sku: 'SKU-CONF', locationCode: 'X1', systemQuantity: 200, variance: 3, varianceRate: 0.015, status: 'confirmed' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      // confirmed項目が集計対象 / confirmed项目纳入统计
      expect(result.totalVarianceRate).toBeGreaterThan(0);
    });

    it('counted と confirmed を混在させたとき両方を集計すること / counted和confirmed混合时应同时统计', async () => {
      const plan = {
        _id: oid(),
        planNumber: 'CC-MIX-001',
        items: [
          { sku: 'SKU-1', locationCode: 'Y1', systemQuantity: 100, variance: 1, varianceRate: 0.01, status: 'counted' },
          { sku: 'SKU-2', locationCode: 'Y2', systemQuantity: 100, variance: 2, varianceRate: 0.02, status: 'confirmed' },
          { sku: 'SKU-3', locationCode: 'Y3', systemQuantity: 100, variance: 0, varianceRate: 0, status: 'pending' }, // 除外
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      // totalSystem = 200, totalVariance = 3, rate = 3/200 = 1.5% > 0.5%
      expect(result.totalVarianceRate).toBeCloseTo(3 / 200);
      expect(result.alertTriggered).toBe(true);
    });

    it('計画が存在しない場合エラーをスローすること / 计划不存在时应抛出错误', async () => {
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(null);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      await expect(
        checkVarianceAlerts('nonexistent-id'),
      ).rejects.toThrow('棚卸計画が見つかりません');
    });

    it('totalSystemが0のときtotalVarianceRateは0 / totalSystem=0时totalVarianceRate=0', async () => {
      // ゼロ数量在庫でのカウント / 零数量库存的计数
      const plan = {
        _id: oid(),
        planNumber: 'CC-ZERO-001',
        items: [
          { sku: 'SKU-ZERO', locationCode: 'Z1', systemQuantity: 0, variance: 0, varianceRate: 0, status: 'counted' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      // totalSystem=0 → ゼロ除算回避 → rate=0 / totalSystem=0 → 避免除零 → rate=0
      expect(result.totalVarianceRate).toBe(0);
      expect(result.alertTriggered).toBe(false);
    });

    it('highVarianceItemsにskuとlocationCodeとvarianceRateが含まれること / highVarianceItems应包含sku、locationCode和varianceRate', async () => {
      // highVarianceItemsの構造検証 / 验证highVarianceItems的数据结构
      const plan = {
        _id: oid(),
        planNumber: 'CC-STRUCT-001',
        items: [
          { sku: 'SKU-HIGH', locationCode: 'H1', systemQuantity: 100, variance: 10, varianceRate: 0.1, status: 'counted' },
          { sku: 'SKU-LOW', locationCode: 'H2', systemQuantity: 100, variance: 0, varianceRate: 0, status: 'counted' },
        ],
        alertTriggered: false,
        save: mockSave,
      };
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

      const { checkVarianceAlerts } = await import('../cycleCountService');
      const result = await checkVarianceAlerts(String(plan._id));

      expect(result.highVarianceItems).toHaveLength(1);
      expect(result.highVarianceItems[0]).toMatchObject({
        sku: 'SKU-HIGH',
        locationCode: 'H1',
        varianceRate: 0.1,
      });
    });
  });
});
