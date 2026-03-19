/**
 * peakModeService 完全ユニットテスト / peakModeService 完整单元测试
 *
 * カバレッジ目標 / 覆盖率目标: 80%+
 * テスト対象 / 测试目标:
 *   - getCapacityStatus (容量ステータス計算 / 容量状态计算)
 *   - enablePeakMode (大促モード有効化 / 启用大促模式)
 *   - disablePeakMode (大促モード無効化 / 禁用大促模式)
 *   - getPeakModeStatus (大促モード状態取得 / 获取大促模式状态)
 *   - isInboundFrozen (入庫フリーズ確認 / 入库冻结检查)
 *   - 繁忙期シナリオ / 繁忙期场景 (年末年始・お中元・お歳暮)
 *   - 閾値境界テスト / 阈值边界测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── モック / 模拟依赖 ───

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { aggregate: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/models/location', () => ({
  Location: { countDocuments: vi.fn().mockResolvedValue(100) },
}));

vi.mock('@/models/featureFlag', () => ({
  FeatureFlag: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── モデルをインポート（モック後）/ 模拟后导入模型 ───
import { StockQuant } from '@/models/stockQuant';
import { Location } from '@/models/location';
import { FeatureFlag } from '@/models/featureFlag';

/**
 * chainLean: findOne().lean() チェーンを模倣するヘルパー
 * chainLean: 模拟findOne().lean()链的辅助函数
 */
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

/**
 * モック用 FeatureFlag ドキュメント生成ヘルパー
 * 生成模拟FeatureFlag文档的辅助函数
 */
const mockFlagDoc = (
  key: string,
  defaultEnabled: boolean,
  tenantOverrides: { tenantId: string; enabled: boolean }[] = [],
) => ({
  key,
  defaultEnabled,
  tenantOverrides,
});

// ─── テストスイート / 测试套件 ───

describe('peakModeService / 大促モードサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════
  // getCapacityStatus / 容量ステータス計算
  // ══════════════════════════════════════════════════════════════

  describe('getCapacityStatus / 容量ステータス計算', () => {
    it('利用率を正しく計算すること（通常稼働） / 正确计算利用率（正常运营）', async () => {
      // ARRANGE: 100ロケーション中85が使用中
      // 准备: 100个库位中85个已使用
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 85 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      // ASSERT: 85%利用率・警告あり・危機なし
      // 断言: 85%利用率、有警告、无危机
      expect(status.totalLocations).toBe(100);
      expect(status.occupiedLocations).toBe(85);
      expect(status.occupancyRate).toBeCloseTo(0.85);
      expect(status.isWarning).toBe(true);   // 85% >= 80%
      expect(status.isCritical).toBe(false); // 85% < 95%
    });

    it('ロケーションなし→利用率0 / 无库位利用率为0', async () => {
      // エッジケース: 倉庫設定が未完了の場合
      // 边缘情况: 仓库设置未完成时
      vi.mocked(Location.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      // 0除算を防ぎ利用率0を返すこと
      // 防止除以零并返回利用率0
      expect(status.totalLocations).toBe(0);
      expect(status.occupiedLocations).toBe(0);
      expect(status.occupancyRate).toBe(0);
      expect(status.isWarning).toBe(false);
      expect(status.isCritical).toBe(false);
    });

    it('利用率80%ちょうど→警告あり / 利用率恰好80%→有警告', async () => {
      // 境界値: 警告閾値ちょうど（isWarning: occupancyRate >= 0.8）
      // 边界值: 恰好达到警告阈值（isWarning: occupancyRate >= 0.8）
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 80 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      expect(status.occupancyRate).toBeCloseTo(0.8);
      expect(status.isWarning).toBe(true);  // >= 0.8 → 警告
      expect(status.isCritical).toBe(false);
    });

    it('利用率79%→警告なし / 利用率79%→无警告', async () => {
      // 境界値: 警告閾値未満
      // 边界值: 低于警告阈值
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 79 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      expect(status.isWarning).toBe(false); // 79% < 80%
      expect(status.isCritical).toBe(false);
    });

    it('利用率95%ちょうど→危機あり / 利用率恰好95%→危机', async () => {
      // 境界値: 危機閾値ちょうど（isCritical: occupancyRate >= 0.95）
      // 边界值: 恰好达到危机阈值（isCritical: occupancyRate >= 0.95）
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 95 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      expect(status.isWarning).toBe(true);  // 95% >= 80%
      expect(status.isCritical).toBe(true); // 95% >= 95%
    });

    it('利用率94%→危機なし / 利用率94%→无危机', async () => {
      // 境界値: 危機閾値未満
      // 边界值: 低于危机阈值
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 94 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      expect(status.isWarning).toBe(true);  // 94% >= 80%
      expect(status.isCritical).toBe(false); // 94% < 95%
    });

    it('利用率100%→警告かつ危機 / 利用率100%→警告且危机', async () => {
      // 最大値テスト: 全ロケーションが使用中
      // 最大值测试: 所有库位均被使用
      vi.mocked(Location.countDocuments).mockResolvedValue(200 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 200 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      expect(status.occupancyRate).toBe(1.0);
      expect(status.isWarning).toBe(true);
      expect(status.isCritical).toBe(true);
    });

    it('StockQuant.aggregateが空→occupiedLocations=0 / StockQuant.aggregate为空→occupiedLocations=0', async () => {
      // 在庫がゼロの場合（空倉庫）
      // 库存为零时（空仓库）
      vi.mocked(Location.countDocuments).mockResolvedValue(50 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]); // 空の集計結果

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      // aggregateが空の場合 occupiedLocations = 0
      // aggregate为空时 occupiedLocations = 0
      expect(status.occupiedLocations).toBe(0);
      expect(status.occupancyRate).toBe(0);
    });

    it('warehouseIdフィルターが渡されること / warehouseId过滤条件被传递', async () => {
      // 特定倉庫でのステータス取得
      // 获取特定仓库的状态
      vi.mocked(Location.countDocuments).mockResolvedValue(50 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 30 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      await getCapacityStatus('warehouse-tokyo');

      // warehouseIdが countDocuments の検索条件に含まれること
      // warehouseId包含在countDocuments的搜索条件中
      expect(Location.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ warehouseId: 'warehouse-tokyo' }),
      );
    });

    it('warehouseIdなしでもフィルターなしで動作 / 无warehouseId也能正常工作', async () => {
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 60 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      await getCapacityStatus(); // warehouseIdなし / 无warehouseId

      // warehouseIdなしのとき検索条件に含まれないこと
      // 无warehouseId时不包含在搜索条件中
      const callArg = vi.mocked(Location.countDocuments).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('warehouseId');
    });

    it('Location.countDocumentsが bin と shelf タイプのみカウント / 仅计数bin和shelf类型', async () => {
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getCapacityStatus } = await import('../peakModeService');
      await getCapacityStatus();

      // bin と shelf のみ（ステージングエリアなどを除外）
      // 仅bin和shelf（排除暂存区等）
      expect(Location.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          type: { $in: ['bin', 'shelf'] },
          isActive: true,
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════
  // enablePeakMode / 大促モード有効化
  // ══════════════════════════════════════════════════════════════

  describe('enablePeakMode / 大促モード有効化', () => {
    it('大促モードを有効化し容量ステータスを返すこと / 启用大促模式并返回容量状态', async () => {
      // ARRANGE: FeatureFlagのupsert・updateをモック
      // 准备: 模拟FeatureFlag的upsert和update
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 70 }]);

      const { enablePeakMode } = await import('../peakModeService');
      const result = await enablePeakMode('tenant-001', '年末セール対応');

      // ASSERT: enabled=trueと容量ステータスが返ること
      // 断言: 返回enabled=true和容量状态
      expect(result.enabled).toBe(true);
      expect(result.capacityStatus).toBeDefined();
      expect(result.capacityStatus.totalLocations).toBe(100);
      expect(result.capacityStatus.occupiedLocations).toBe(70);
    });

    it('有効化時に FeatureFlag.findOneAndUpdate が複数回呼ばれること / 启用时FeatureFlag.findOneAndUpdate被多次调用', async () => {
      // peak_mode と peak_mode_inbound_freeze の2フラグが処理される
      // 处理peak_mode和peak_mode_inbound_freeze这2个标志
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { enablePeakMode } = await import('../peakModeService');
      await enablePeakMode('tenant-002');

      // ensureFlag (2回) + テナント有効化 (2フラグ × 各1回 = 最低2回)
      // ensureFlag (2次) + 租户启用 (2标志各1次 = 至少2次)
      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalled();
    });

    it('テナントオーバーライドが存在する場合は更新する / 存在租户覆盖时进行更新', async () => {
      // ARRANGE: 既存のテナントオーバーライドが存在する（$setで更新される）
      // 准备: 存在现有租户覆盖（使用$set更新）
      const existingOverrideDoc = {
        key: 'peak_mode',
        tenantOverrides: [{ tenantId: 'T1', enabled: false }],
      };
      vi.mocked(FeatureFlag.findOneAndUpdate)
        .mockResolvedValueOnce(null) // ensureFlag: peak_mode
        .mockResolvedValueOnce(null) // ensureFlag: peak_mode_inbound_freeze
        .mockResolvedValueOnce(existingOverrideDoc as any) // peak_mode: $set (found)
        .mockResolvedValueOnce(existingOverrideDoc as any); // inbound_freeze: $set (found)

      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 80 }]);

      const { enablePeakMode } = await import('../peakModeService');
      const result = await enablePeakMode('T1', 'お歳暮シーズン');

      expect(result.enabled).toBe(true);
    });

    it('テナントオーバーライドが存在しない場合は$pushで追加 / 租户覆盖不存在时用$push添加', async () => {
      // ARRANGE: テナントオーバーライドが存在しない（$pushで追加される）
      // 准备: 租户覆盖不存在（使用$push添加）
      vi.mocked(FeatureFlag.findOneAndUpdate)
        .mockResolvedValueOnce(null) // ensureFlag: peak_mode
        .mockResolvedValueOnce(null) // ensureFlag: peak_mode_inbound_freeze
        .mockResolvedValueOnce(null) // peak_mode: $set → null → $push が呼ばれる
        .mockResolvedValueOnce(null) // peak_mode: $push
        .mockResolvedValueOnce(null) // inbound_freeze: $set → null → $push が呼ばれる
        .mockResolvedValueOnce(null); // inbound_freeze: $push

      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { enablePeakMode } = await import('../peakModeService');
      const result = await enablePeakMode('new-tenant');

      expect(result.enabled).toBe(true);
      // $pushによる追加が呼ばれること
      // $push添加被调用
      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'peak_mode' }),
        expect.objectContaining({ $push: expect.any(Object) }),
      );
    });

    it('reasonパラメータを渡せること / 可以传递reason参数', async () => {
      // reasonはログに記録されるが戻り値には影響しない
      // reason被记录到日志但不影响返回值
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { enablePeakMode } = await import('../peakModeService');
      const result = await enablePeakMode('T1', 'ブラックフライデー対応');

      expect(result.enabled).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // disablePeakMode / 大促モード無効化
  // ══════════════════════════════════════════════════════════════

  describe('disablePeakMode / 大促モード無効化', () => {
    it('大促モードを無効化すること / 禁用大促模式', async () => {
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);

      const { disablePeakMode } = await import('../peakModeService');
      const result = await disablePeakMode('tenant-001');

      // ASSERT: enabled=falseが返ること
      // 断言: 返回enabled=false
      expect(result.enabled).toBe(false);
    });

    it('無効化時に FeatureFlag.findOneAndUpdate が呼ばれること / 禁用时FeatureFlag.findOneAndUpdate被调用', async () => {
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);

      const { disablePeakMode } = await import('../peakModeService');
      await disablePeakMode('T1');

      // peak_mode と peak_mode_inbound_freeze の両フラグが無効化される
      // peak_mode和peak_mode_inbound_freeze两个标志均被禁用
      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'peak_mode',
          'tenantOverrides.tenantId': 'T1',
        }),
        expect.objectContaining({ $set: { 'tenantOverrides.$.enabled': false } }),
      );
      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'peak_mode_inbound_freeze',
          'tenantOverrides.tenantId': 'T1',
        }),
        expect.objectContaining({ $set: { 'tenantOverrides.$.enabled': false } }),
      );
    });

    it('容量ステータスは返さない（disableはシンプル）/ 不返回容量状态（disable操作简单）', async () => {
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);

      const { disablePeakMode } = await import('../peakModeService');
      const result = await disablePeakMode('T1');

      // disablePeakModeは capacityStatus を含まない
      // disablePeakMode不包含capacityStatus
      expect(result).toEqual({ enabled: false });
      expect((result as any).capacityStatus).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // getPeakModeStatus / 大促モード状態取得
  // ══════════════════════════════════════════════════════════════

  describe('getPeakModeStatus / 大促モード状態取得', () => {
    it('フラグが存在しない→無効状態 / 标志不存在→禁用状态', async () => {
      // ARRANGE: FeatureFlagが見つからない場合
      // 准备: 未找到FeatureFlag时
      vi.mocked(FeatureFlag.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T1');

      expect(status.enabled).toBe(false);
      expect(status.inboundFreezeActive).toBe(false);
    });

    it('テナントオーバーライドで有効→enabled=true / 租户覆盖启用→enabled=true', async () => {
      // ARRANGE: テナントT1で大促モードが有効
      // 准备: 租户T1启用了大促模式
      vi.mocked(FeatureFlag.findOne).mockReturnValue(
        chainLean(
          mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
        ) as any,
      );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 90 }]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T1');

      expect(status.enabled).toBe(true);
    });

    it('テナントオーバーライドで無効→enabled=false / 租户覆盖禁用→enabled=false', async () => {
      // ARRANGE: テナントT2はオーバーライドで無効
      // 准备: 租户T2通过覆盖禁用
      vi.mocked(FeatureFlag.findOne).mockReturnValue(
        chainLean(
          mockFlagDoc('peak_mode', true, [{ tenantId: 'T2', enabled: false }]),
        ) as any,
      );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getPeakModeStatus } = await import('../peakModeService');
      // T2はオーバーライドで無効化されている
      // T2通过覆盖被禁用
      const status = await getPeakModeStatus('T2');

      expect(status.enabled).toBe(false);
    });

    it('テナントオーバーライドがない→defaultEnabledを参照 / 无租户覆盖→参考defaultEnabled', async () => {
      // ARRANGE: T3はオーバーライドがないが defaultEnabled=true のフラグ
      // 准备: T3无覆盖但标志defaultEnabled=true
      vi.mocked(FeatureFlag.findOne).mockReturnValue(
        chainLean(
          mockFlagDoc('peak_mode', true, [
            { tenantId: 'OTHER-TENANT', enabled: false },
          ]),
        ) as any,
      );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T3');

      // T3のオーバーライドがないのでdefaultEnabled=trueが適用される
      // T3无覆盖故应用defaultEnabled=true
      expect(status.enabled).toBe(true);
    });

    it('容量ステータスも一緒に返すこと / 同时返回容量状态', async () => {
      vi.mocked(FeatureFlag.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(200 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 160 }]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T1');

      // 容量ステータスが正しく計算されること
      // 容量状态被正确计算
      expect(status.capacityStatus.totalLocations).toBe(200);
      expect(status.capacityStatus.occupiedLocations).toBe(160);
      expect(status.capacityStatus.occupancyRate).toBeCloseTo(0.8);
    });

    it('peakFlagとfreezeFlagで異なる状態を持てること / peakFlag和freezeFlag可以有不同状态', async () => {
      // ARRANGE: peak_mode=true、freeze=false の非対称状態
      // 准备: peak_mode=true、freeze=false的非对称状态
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'T1', enabled: false },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T1');

      expect(status.enabled).toBe(true);         // peak_mode = true
      expect(status.inboundFreezeActive).toBe(false); // freeze = false
    });

    it('両フラグが有効 / 两个标志均启用', async () => {
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'T1', enabled: true },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 95 }]);

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('T1');

      expect(status.enabled).toBe(true);
      expect(status.inboundFreezeActive).toBe(true);
      expect(status.capacityStatus.isCritical).toBe(true); // 95% >= 95%
    });
  });

  // ══════════════════════════════════════════════════════════════
  // isInboundFrozen / 入庫フリーズ確認
  // ══════════════════════════════════════════════════════════════

  describe('isInboundFrozen / 入庫フリーズ確認', () => {
    it('大促モード無効→入庫フリーズなし / 大促模式禁用→不冻结入库', async () => {
      // ARRANGE: peak_mode=false の場合
      // 准备: peak_mode=false时
      vi.mocked(FeatureFlag.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { isInboundFrozen } = await import('../peakModeService');
      const frozen = await isInboundFrozen('T1');

      // 大促モード無効なのでフリーズなし
      // 大促模式禁用故不冻结
      expect(frozen).toBe(false);
    });

    it('大促モード有効・freezeフラグ有効→入庫フリーズ / 大促模式启用且freeze标志启用→冻结入库', async () => {
      // ARRANGE: peak_mode=true、freeze=true
      // 准备: peak_mode=true、freeze=true
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'T1', enabled: true },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 85 }]);

      const { isInboundFrozen } = await import('../peakModeService');
      const frozen = await isInboundFrozen('T1');

      // 両方有効→フリーズ
      // 两者均启用→冻结
      expect(frozen).toBe(true);
    });

    it('大促モード有効・freezeフラグ無効→入庫フリーズなし / 大促模式启用但freeze标志禁用→不冻结入库', async () => {
      // ARRANGE: peak_mode=true、freeze=false（非対称状態）
      // 准备: peak_mode=true但freeze=false（非对称状态）
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'T1', enabled: false },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { isInboundFrozen } = await import('../peakModeService');
      const frozen = await isInboundFrozen('T1');

      // peak_mode=true でも freeze=false なのでフリーズなし
      // 即使peak_mode=true但freeze=false故不冻结
      expect(frozen).toBe(false);
    });

    it('複数テナントで独立した状態を持つ / 多租户有独立状态', async () => {
      // T1はフリーズ、T2はフリーズなし
      // T1冻结，T2不冻结

      // T1テスト / T1测试
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [{ tenantId: 'T1', enabled: true }]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'T1', enabled: true },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 90 }]);

      const { isInboundFrozen } = await import('../peakModeService');
      const t1Frozen = await isInboundFrozen('T1');
      expect(t1Frozen).toBe(true);

      // T2テスト / T2测试
      vi.clearAllMocks();
      vi.mocked(FeatureFlag.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const t2Frozen = await isInboundFrozen('T2');
      expect(t2Frozen).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // 日本WMS繁忙期シナリオ / 日本WMS繁忙期场景
  // ══════════════════════════════════════════════════════════════

  describe('繁忙期シナリオ / 繁忙期场景', () => {
    it('年末年始（お正月）：利用率95%超で危機状態 / 年末年始（新年）：利用率超95%为危机状态', async () => {
      // シナリオ: 年末の注文ラッシュで倉庫が逼迫
      // 场景: 年末订单高峰期仓库紧张
      vi.mocked(Location.countDocuments).mockResolvedValue(1000 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 978 }]);

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus();

      // 97.8%利用率 → 警告かつ危機
      // 97.8%利用率 → 警告且危机
      expect(status.occupancyRate).toBeCloseTo(0.978);
      expect(status.isWarning).toBe(true);
      expect(status.isCritical).toBe(true);
    });

    it('お中元シーズン（7月）：大促モード有効化 / お中元季节（7月）：启用大促模式', async () => {
      // シナリオ: 7月のお中元ギフトシーズンに大促モード有効化
      // 场景: 7月お中元礼品季节启用大促模式
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(500 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 420 }]); // 84%

      const { enablePeakMode } = await import('../peakModeService');
      const result = await enablePeakMode('tenant-summer', 'お中元シーズン入庫管理');

      expect(result.enabled).toBe(true);
      expect(result.capacityStatus.occupancyRate).toBeCloseTo(0.84);
      expect(result.capacityStatus.isWarning).toBe(true); // 84% > 80% 警告
    });

    it('お歳暮シーズン（12月）：入庫フリーズで非緊急入庫を遮断 / お歳暮季节（12月）：通过入库冻结拦截非紧急入库', async () => {
      // シナリオ: 12月お歳暮ピーク時に入庫フリーズ有効
      // 场景: 12月お歳暮高峰期启用入库冻结
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode', false, [
              { tenantId: 'year-end-tenant', enabled: true },
            ]),
          ) as any,
        )
        .mockReturnValueOnce(
          chainLean(
            mockFlagDoc('peak_mode_inbound_freeze', false, [
              { tenantId: 'year-end-tenant', enabled: true },
            ]),
          ) as any,
        );
      vi.mocked(Location.countDocuments).mockResolvedValue(1000 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 960 }]); // 96%

      const { isInboundFrozen } = await import('../peakModeService');
      const frozen = await isInboundFrozen('year-end-tenant');

      // お歳暮ピーク時は入庫フリーズが有効
      // お歳暮高峰期启用入库冻结
      expect(frozen).toBe(true);
    });

    it('ブラックフライデー（11月）：大促モードから大促モード解除 / 黑色星期五（11月）：从大促模式解除', async () => {
      // シナリオ: ブラックフライデー終了後に大促モードを解除
      // 场景: 黑色星期五结束后解除大促模式
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);

      const { disablePeakMode } = await import('../peakModeService');
      const result = await disablePeakMode('black-friday-tenant');

      expect(result.enabled).toBe(false);
    });

    it('繁忙期前後の状態遷移：有効→無効 / 繁忙期前后状态转换：启用→禁用', async () => {
      // シナリオ: セール開始時に有効化、終了時に無効化
      // 场景: 促销开始时启用，结束时禁用

      // セール開始（有効化）/ 促销开始（启用）
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(500 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 350 }]);

      const { enablePeakMode, disablePeakMode } = await import('../peakModeService');

      const enableResult = await enablePeakMode('sale-tenant', 'セール開始');
      expect(enableResult.enabled).toBe(true);

      // セール終了（無効化）/ 促销结束（禁用）
      vi.clearAllMocks();
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);

      const disableResult = await disablePeakMode('sale-tenant');
      expect(disableResult.enabled).toBe(false);
    });

    it('通常期（普通の週）：利用率50%・全フラグ無効 / 普通期（普通的一周）：利用率50%・所有标志禁用', async () => {
      // シナリオ: 繁忙期以外の通常期
      // 场景: 非繁忙期的普通期
      vi.mocked(FeatureFlag.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(200 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 100 }]); // 50%

      const { getPeakModeStatus } = await import('../peakModeService');
      const status = await getPeakModeStatus('normal-tenant');

      expect(status.enabled).toBe(false);
      expect(status.inboundFreezeActive).toBe(false);
      expect(status.capacityStatus.isWarning).toBe(false); // 50% < 80%
      expect(status.capacityStatus.isCritical).toBe(false);
    });

    it('複数倉庫シナリオ：東京倉庫の容量確認 / 多仓库场景：确认东京仓库容量', async () => {
      // シナリオ: 東京倉庫のみの容量ステータスを取得
      // 场景: 仅获取东京仓库的容量状态
      vi.mocked(Location.countDocuments).mockResolvedValue(300 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ count: 270 }]); // 90%

      const { getCapacityStatus } = await import('../peakModeService');
      const status = await getCapacityStatus('warehouse-tokyo');

      expect(status.totalLocations).toBe(300);
      expect(status.occupancyRate).toBeCloseTo(0.9);
      expect(status.isWarning).toBe(true);  // 90% >= 80%
      expect(status.isCritical).toBe(false); // 90% < 95%

      // warehouseIdフィルターが正しく渡される
      // warehouseId过滤条件正确传递
      expect(Location.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ warehouseId: 'warehouse-tokyo' }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════
  // FeatureFlag 内部ロジック / FeatureFlag 内部逻辑
  // ══════════════════════════════════════════════════════════════

  describe('FeatureFlag 内部ロジック / FeatureFlag 内部逻辑', () => {
    it('ensureFlag: upsertでフラグを作成または確認 / ensureFlag: 通过upsert创建或确认标志', async () => {
      // ARRANGE: FeatureFlag.findOneAndUpdateがupsert動作
      // 准备: FeatureFlag.findOneAndUpdate执行upsert操作
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { enablePeakMode } = await import('../peakModeService');
      await enablePeakMode('T1');

      // ensureFlagで $setOnInsert を使ったupsertが呼ばれること
      // ensureFlag中使用$setOnInsert的upsert被调用
      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'peak_mode' },
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            key: 'peak_mode',
            defaultEnabled: false,
          }),
        }),
        { upsert: true },
      );
    });

    it('ensureFlag: inbound_freezeフラグも作成される / ensureFlag: inbound_freezeフラグも被创建', async () => {
      vi.mocked(FeatureFlag.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { enablePeakMode } = await import('../peakModeService');
      await enablePeakMode('T1');

      expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'peak_mode_inbound_freeze' },
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            key: 'peak_mode_inbound_freeze',
            defaultEnabled: false,
          }),
        }),
        { upsert: true },
      );
    });

    it('getPeakModeStatus: Promise.allで並列フラグ取得 / getPeakModeStatus: 通过Promise.all并行获取标志', async () => {
      // 2つのフラグを並列で取得すること（FeatureFlag.findOneが2回呼ばれる）
      // 并行获取2个标志（FeatureFlag.findOne被调用2次）
      vi.mocked(FeatureFlag.findOne)
        .mockReturnValueOnce(chainLean(null) as any)
        .mockReturnValueOnce(chainLean(null) as any);
      vi.mocked(Location.countDocuments).mockResolvedValue(100 as any);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getPeakModeStatus } = await import('../peakModeService');
      await getPeakModeStatus('T1');

      // findOneが peak_mode と peak_mode_inbound_freeze の2回呼ばれること
      // findOneが被调用2次，分别用于peak_mode和peak_mode_inbound_freeze
      expect(FeatureFlag.findOne).toHaveBeenCalledTimes(2);
      expect(FeatureFlag.findOne).toHaveBeenCalledWith({
        key: 'peak_mode',
      });
      expect(FeatureFlag.findOne).toHaveBeenCalledWith({
        key: 'peak_mode_inbound_freeze',
      });
    });
  });
});
