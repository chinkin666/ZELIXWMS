/**
 * exceptionService 単元測試 / exceptionService ユニットテスト
 *
 * カバレッジ目標: 90%+ / 覆盖率目标: 90%+
 * テスト範囲 / 测试范围:
 *   - createException: SLA自動設定・全レベル・任意フィールド
 *   - checkSlaBreaches: 超過検出・通知fire-and-forget・空の場合
 *   - resolveException: 正常解決・存在しない場合エラー
 *   - acknowledgeException: 確認状態更新・存在しない場合エラー
 *   - getExceptionDashboard: 統計集計・空データフォールバック
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();
const mockSave = vi.fn().mockResolvedValue(undefined);

vi.mock('@/models/exceptionReport', () => ({
  ExceptionReport: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  SLA_MINUTES: { C: 30, B: 120, A: 240 },
}));

vi.mock('@/services/notificationService', () => ({
  sendNotificationsForEvent: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ExceptionReport } from '@/models/exceptionReport';
import { sendNotificationsForEvent } from '@/services/notificationService';
import { logger } from '@/lib/logger';

// ─── createException / 異常報告作成 ───────────────────────────────────────────

describe('exceptionService / 異常報告サービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createException ──────────────────────────────────────────────────────

  describe('createException / 異常報告作成', () => {
    it('C級(緊急)のSLA期限を30分後に設定すること / C级(紧急)SLA期限设为30分钟后', async () => {
      // C級 = 30分 / C级 = 30分钟
      const before = Date.now();
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        reportNumber: 'EXC-20260319-00001',
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'inbound_order',
        level: 'C',
        category: 'quantity_variance',
        description: '数量不足5個 / 数量不足5件',
        reportedBy: '田中',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.level).toBe('C');
      expect(call.status).toBe('open');
      expect(call.slaBreached).toBe(false);
      // SLA期限は呼出し時刻から約30分後 / SLA期限约为调用时刻30分钟后
      const slaMs = call.slaDeadline.getTime() - before;
      expect(slaMs).toBeGreaterThanOrEqual(29 * 60 * 1000);
      expect(slaMs).toBeLessThanOrEqual(31 * 60 * 1000);
    });

    it('B級(重要)のSLA期限を120分後に設定すること / B级(重要)SLA期限设为120分钟后', async () => {
      const before = Date.now();
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        reportNumber: 'EXC-20260319-00002',
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'fba_plan',
        level: 'B',
        category: 'label_error',
        description: 'FBAラベル貼り間違い / FBA标签贴错',
        reportedBy: '佐藤',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.level).toBe('B');
      const slaMs = call.slaDeadline.getTime() - before;
      expect(slaMs).toBeGreaterThanOrEqual(119 * 60 * 1000);
      expect(slaMs).toBeLessThanOrEqual(121 * 60 * 1000);
    });

    it('A級(一般)のSLA期限を240分後に設定すること / A级(一般)SLA期限设为240分钟后', async () => {
      const before = Date.now();
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        reportNumber: 'EXC-20260319-00003',
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T2',
        referenceType: 'return_order',
        level: 'A',
        category: 'appearance_defect',
        description: '外装に傷あり / 外包装有划痕',
        reportedBy: '鈴木',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.level).toBe('A');
      const slaMs = call.slaDeadline.getTime() - before;
      expect(slaMs).toBeGreaterThanOrEqual(239 * 60 * 1000);
      expect(slaMs).toBeLessThanOrEqual(241 * 60 * 1000);
    });

    it('photos未指定時は空配列を設定すること / 未指定photos时设置空数组', async () => {
      // photosは省略可能、デフォルトは[] / photos可省略，默认为[]
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'task',
        level: 'A',
        category: 'other',
        description: '不明な差異 / 不明差异',
        reportedBy: '山田',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.photos).toEqual([]);
    });

    it('全任意フィールドを渡した場合も正常に保存すること / 传递所有可选字段时也能正常保存', async () => {
      // 全フィールド指定のケース / 所有字段全部指定的情况
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const refId = oid();
      const clientId = oid();
      const photos = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'inbound_order',
        referenceId: String(refId),
        clientId: String(clientId),
        clientName: '株式会社テスト / 测试公司',
        level: 'C',
        category: 'mixed_shipment',
        boxNumber: 'BOX-001',
        sku: 'SKU-TEST-001',
        affectedQuantity: 10,
        description: '混載検出 / 检测到混载',
        photos,
        suggestedAction: '返品対応 / 退货处理',
        reportedBy: '検品担当',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.clientName).toBe('株式会社テスト / 测试公司');
      expect(call.boxNumber).toBe('BOX-001');
      expect(call.sku).toBe('SKU-TEST-001');
      expect(call.affectedQuantity).toBe(10);
      expect(call.photos).toEqual(photos);
      expect(call.suggestedAction).toBe('返品対応 / 退货处理');
    });

    it('reportNumber はEXC-YYYYMMDD-NNNNNの形式で生成すること / reportNumber应符合EXC-YYYYMMDD-NNNNN格式', async () => {
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'other',
        level: 'B',
        category: 'documentation_error',
        description: '書類不備 / 单据不齐',
        reportedBy: '事務',
      });

      const call = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any;
      expect(call.reportNumber).toMatch(/^EXC-\d{8}-\d{5}$/);
    });

    it('ロガーにinfo出力すること / 应输出info日志', async () => {
      vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        reportNumber: 'EXC-20260319-99999',
      }));

      const { createException } = await import('../exceptionService');
      await createException({
        tenantId: 'T1',
        referenceType: 'inbound_order',
        level: 'C',
        category: 'quantity_variance',
        description: 'テスト / 测试',
        reportedBy: 'テスター',
      });

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.objectContaining({ reportNumber: 'EXC-20260319-99999', level: 'C' }),
        expect.any(String),
      );
    });
  });

  // ─── checkSlaBreaches / SLA超過チェック ───────────────────────────────────

  describe('checkSlaBreaches / SLA超過チェック', () => {
    it('期限切れの報告を検出してslaBreachedフラグを立てること / 检测超时报告并设置slaBreached标志', async () => {
      // 期限切れ1件 / 超时1件
      const breachedReport = {
        _id: oid(),
        reportNumber: 'EXC-002',
        level: 'C',
        category: 'quantity_variance',
        description: '数量不足 / 数量不足',
        slaDeadline: new Date(Date.now() - 60 * 1000), // 1分前に期限切れ
        slaBreached: false,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.find).mockResolvedValue([breachedReport] as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      const result = await checkSlaBreaches('T1');

      expect(result.breachedCount).toBe(1);
      expect(result.breachedReports).toEqual(['EXC-002']);
      expect(breachedReport.slaBreached).toBe(true);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('複数の期限切れ報告を一括処理すること / 批量处理多条超时报告', async () => {
      // 複数件の期限切れ / 多条超时
      const reports = ['EXC-010', 'EXC-011', 'EXC-012'].map((num) => ({
        _id: oid(),
        reportNumber: num,
        level: 'B',
        category: 'label_error',
        description: 'ラベルエラー / 标签错误',
        slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000),
        slaBreached: false,
        save: vi.fn().mockResolvedValue(undefined),
      }));
      vi.mocked(ExceptionReport.find).mockResolvedValue(reports as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      const result = await checkSlaBreaches('T1');

      expect(result.breachedCount).toBe(3);
      expect(result.breachedReports).toEqual(['EXC-010', 'EXC-011', 'EXC-012']);
      reports.forEach((r) => expect(r.slaBreached).toBe(true));
    });

    it('期限切れがゼロ件のときlogger.warnを呼ばないこと / 无超时时不调用logger.warn', async () => {
      // 超過なし / 无超时
      vi.mocked(ExceptionReport.find).mockResolvedValue([] as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      const result = await checkSlaBreaches('T1');

      expect(result.breachedCount).toBe(0);
      expect(result.breachedReports).toEqual([]);
      expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it('期限切れ検出時にlogger.warnを出力すること / 检测到超时时输出logger.warn', async () => {
      // warnログのテスト / 警告日志测试
      const report = {
        _id: oid(),
        reportNumber: 'EXC-WARN-001',
        level: 'C',
        category: 'packaging_issue',
        description: '包装不備 / 包装不良',
        slaDeadline: new Date(Date.now() - 1000),
        slaBreached: false,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.find).mockResolvedValue([report] as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      await checkSlaBreaches('T2');

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T2', breachedCount: 1 }),
        expect.any(String),
      );
    });

    it('通知はfire-and-forgetで呼び出すこと / 通知以fire-and-forget方式调用', async () => {
      // 通知エラーが全体処理に影響しない / 通知错误不影响整体处理
      vi.mocked(sendNotificationsForEvent).mockRejectedValue(new Error('notification failed'));
      const report = {
        _id: oid(),
        reportNumber: 'EXC-NOTIFY-001',
        level: 'C',
        category: 'quantity_variance',
        description: 'テスト通知 / 测试通知',
        slaDeadline: new Date(Date.now() - 1000),
        slaBreached: false,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.find).mockResolvedValue([report] as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      // 通知エラーがあっても結果を正常に返す / 即使通知失败也应正常返回结果
      const result = await checkSlaBreaches('T1');

      expect(result.breachedCount).toBe(1);
      expect(sendNotificationsForEvent).toHaveBeenCalledWith(
        'exception.sla_breached',
        expect.objectContaining({ reportNumber: 'EXC-NOTIFY-001' }),
        'T1',
      );
    });

    it('クエリはtenantIdで絞り込むこと / 查询应按tenantId过滤', async () => {
      vi.mocked(ExceptionReport.find).mockResolvedValue([] as any);

      const { checkSlaBreaches } = await import('../exceptionService');
      await checkSlaBreaches('TENANT-XYZ');

      expect(ExceptionReport.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'TENANT-XYZ' }),
      );
    });
  });

  // ─── resolveException / 異常解決 ─────────────────────────────────────────

  describe('resolveException / 異常解決', () => {
    it('異常報告を解決状態に更新すること / 将异常报告更新为已解决状态', async () => {
      const report = {
        _id: oid(),
        status: 'open' as any,
        resolvedBy: undefined as string | undefined,
        resolvedAt: undefined as Date | undefined,
        resolution: undefined as string | undefined,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { resolveException } = await import('../exceptionService');
      const result = await resolveException(String(report._id), '在庫を再確認し修正 / 重新确认库存并修正', '鈴木');

      expect(result.status).toBe('resolved');
      expect(result.resolvedBy).toBe('鈴木');
      expect(result.resolution).toBe('在庫を再確認し修正 / 重新确认库存并修正');
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    it('存在しない報告IDでエラーをスローすること / 不存在的报告ID应抛出错误', async () => {
      // 存在しない場合 / 不存在时
      vi.mocked(ExceptionReport.findById).mockResolvedValue(null);

      const { resolveException } = await import('../exceptionService');
      await expect(
        resolveException('nonexistent-id', '解決策 / 解决方案', '担当者'),
      ).rejects.toThrow('異常報告が見つかりません');
    });

    it('notified状態の報告も解決できること / notified状态的报告也能解决', async () => {
      // notified → resolved への遷移 / notified → resolved 状态迁移
      const report = {
        _id: oid(),
        status: 'notified' as any,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { resolveException } = await import('../exceptionService');
      await resolveException(String(report._id), '処理完了 / 处理完成', '管理者');

      expect(report.status).toBe('resolved');
    });

    it('acknowledged状態の報告も解決できること / acknowledged状態也能解决', async () => {
      const report = {
        _id: oid(),
        status: 'acknowledged' as any,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { resolveException } = await import('../exceptionService');
      await resolveException(String(report._id), '顧客確認後解決 / 客户确认后解决', '担当');

      expect(report.status).toBe('resolved');
    });
  });

  // ─── acknowledgeException / 顧客確認 ─────────────────────────────────────

  describe('acknowledgeException / 顧客確認', () => {
    it('異常報告を確認状態に更新すること / 将异常报告更新为已确认状态', async () => {
      // 顧客が異常を確認した場合 / 客户确认异常时
      const report = {
        _id: oid(),
        status: 'notified' as any,
        acknowledgedAt: undefined as Date | undefined,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { acknowledgeException } = await import('../exceptionService');
      const result = await acknowledgeException(String(report._id));

      expect(result.status).toBe('acknowledged');
      expect(result.acknowledgedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    it('open状態の報告も確認できること / open状态的报告也能确认', async () => {
      // open → acknowledged への遷移 / open → acknowledged 状态迁移
      const report = {
        _id: oid(),
        status: 'open' as any,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { acknowledgeException } = await import('../exceptionService');
      await acknowledgeException(String(report._id));

      expect(report.status).toBe('acknowledged');
    });

    it('存在しない報告IDでエラーをスローすること / 不存在的报告ID应抛出错误', async () => {
      // 存在しない場合のエラー / 不存在时的错误
      vi.mocked(ExceptionReport.findById).mockResolvedValue(null);

      const { acknowledgeException } = await import('../exceptionService');
      await expect(
        acknowledgeException('nonexistent-id'),
      ).rejects.toThrow('異常報告が見つかりません');
    });

    it('acknowledgedAtにDate.nowが設定されること / acknowledgedAt应设置为当前时间', async () => {
      const before = Date.now();
      const report = {
        _id: oid(),
        status: 'notified' as any,
        acknowledgedAt: undefined as Date | undefined,
        save: mockSave,
      };
      vi.mocked(ExceptionReport.findById).mockResolvedValue(report as any);

      const { acknowledgeException } = await import('../exceptionService');
      await acknowledgeException(String(report._id));

      const after = Date.now();
      expect(report.acknowledgedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(report.acknowledgedAt!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ─── getExceptionDashboard / 異常ダッシュボード ───────────────────────────

  describe('getExceptionDashboard / 異常ダッシュボード', () => {
    it('全統計データを正しく返すこと / 应正确返回所有统计数据', async () => {
      // C=3, B=2, A=0 と quantity_variance=4 のシナリオ
      vi.mocked(ExceptionReport.countDocuments)
        .mockResolvedValueOnce(5 as any)   // openCount
        .mockResolvedValueOnce(2 as any)   // breachedCount
        .mockResolvedValueOnce(3 as any);  // resolvedToday
      vi.mocked(ExceptionReport.aggregate)
        .mockResolvedValueOnce([{ _id: 'C', count: 3 }, { _id: 'B', count: 2 }] as any) // levelAgg
        .mockResolvedValueOnce([{ _id: 'quantity_variance', count: 4 }] as any)           // categoryAgg
        .mockResolvedValueOnce([{ avgDuration: 1800000 }] as any);                        // resolutionAgg 30分

      const { getExceptionDashboard } = await import('../exceptionService');
      const dashboard = await getExceptionDashboard('T1');

      expect(dashboard.openCount).toBe(5);
      expect(dashboard.breachedCount).toBe(2);
      expect(dashboard.resolvedToday).toBe(3);
      expect(dashboard.byLevel.C).toBe(3);
      expect(dashboard.byLevel.B).toBe(2);
      expect(dashboard.byLevel.A).toBe(0); // デフォルト0 / 默认0
      expect(dashboard.byCategory.quantity_variance).toBe(4);
      expect(dashboard.avgResolutionMinutes).toBe(30);
    });

    it('resolutionAggが空の場合avgResolutionMinutesは0 / resolutionAgg为空时avgResolutionMinutes应为0', async () => {
      // resolutionAgg[0] が undefined の場合のフォールバック
      // resolutionAgg[0] 为 undefined 时的回退处理
      vi.mocked(ExceptionReport.countDocuments)
        .mockResolvedValueOnce(0 as any)
        .mockResolvedValueOnce(0 as any)
        .mockResolvedValueOnce(0 as any);
      vi.mocked(ExceptionReport.aggregate)
        .mockResolvedValueOnce([] as any) // levelAgg空
        .mockResolvedValueOnce([] as any) // categoryAgg空
        .mockResolvedValueOnce([] as any); // resolutionAgg空 → avgDuration未定義

      const { getExceptionDashboard } = await import('../exceptionService');
      const dashboard = await getExceptionDashboard('T1');

      expect(dashboard.avgResolutionMinutes).toBe(0);
    });

    it('levelAgg・categoryAggが空の場合にデフォルト値を返すこと / levelAgg和categoryAgg为空时返回默认值', async () => {
      // 異常報告が一件もない初期状態 / 无异常报告的初始状态
      vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(ExceptionReport.aggregate).mockResolvedValue([] as any);

      const { getExceptionDashboard } = await import('../exceptionService');
      const dashboard = await getExceptionDashboard('EMPTY-TENANT');

      expect(dashboard.byLevel).toEqual({ A: 0, B: 0, C: 0 });
      expect(dashboard.byCategory).toEqual({});
      expect(dashboard.openCount).toBe(0);
      expect(dashboard.breachedCount).toBe(0);
      expect(dashboard.resolvedToday).toBe(0);
    });

    it('複数カテゴリをbyCategory集計すること / 应按byCategory汇总多个类别', async () => {
      // 複数カテゴリのデータ / 多个类别数据
      vi.mocked(ExceptionReport.countDocuments)
        .mockResolvedValueOnce(10 as any)
        .mockResolvedValueOnce(1 as any)
        .mockResolvedValueOnce(5 as any);
      vi.mocked(ExceptionReport.aggregate)
        .mockResolvedValueOnce([{ _id: 'A', count: 5 }, { _id: 'B', count: 3 }, { _id: 'C', count: 2 }] as any)
        .mockResolvedValueOnce([
          { _id: 'quantity_variance', count: 4 },
          { _id: 'label_error', count: 3 },
          { _id: 'appearance_defect', count: 2 },
          { _id: 'other', count: 1 },
        ] as any)
        .mockResolvedValueOnce([{ avgDuration: 3600000 }] as any); // 60分

      const { getExceptionDashboard } = await import('../exceptionService');
      const dashboard = await getExceptionDashboard('T3');

      expect(dashboard.byLevel.A).toBe(5);
      expect(dashboard.byLevel.B).toBe(3);
      expect(dashboard.byLevel.C).toBe(2);
      expect(dashboard.byCategory.quantity_variance).toBe(4);
      expect(dashboard.byCategory.label_error).toBe(3);
      expect(dashboard.avgResolutionMinutes).toBe(60);
    });

    it('avgDurationが0の場合に0分を返すこと / avgDuration为0时应返回0分钟', async () => {
      // avgDuration = 0 の境界値 / avgDuration = 0 的边界值
      vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(1 as any);
      vi.mocked(ExceptionReport.aggregate)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ avgDuration: 0 }] as any);

      const { getExceptionDashboard } = await import('../exceptionService');
      const dashboard = await getExceptionDashboard('T1');

      expect(dashboard.avgResolutionMinutes).toBe(0);
    });
  });
});
