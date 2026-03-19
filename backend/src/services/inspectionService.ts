import {
  InspectionRecord,
  IInspectionRecord,
  CheckResult,
  InspectionMode,
  IInspectionException,
} from '@/models/inspectionRecord';
import { InboundOrder } from '@/models/inboundOrder';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';
import { logger } from '@/lib/logger';

/**
 * 検品サービス / 检品服务
 *
 * 入庫検品の6次元チェック結果を管理する。
 * 管理入库检品的6维度检查结果。
 *
 * 6次元チェック / 6维度检查:
 * 1. SKU照合 / SKU核对 (skuMatch)
 * 2. バーコード照合 / 条码核对 (barcodeMatch)
 * 3. 数量照合 / 数量核对 (quantityMatch)
 * 4. 外観チェック / 外观检查 (appearanceOk)
 * 5. 付属品チェック / 附件检查 (accessoriesOk)
 * 6. 梱包状態チェック / 包装状态检查 (packagingOk)
 */

// ─── 検品番号生成 / 检品编号生成 ───

function generateRecordNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `INS-${y}${m}${d}-${rand}`;
}

// ─── 検品記録作成 / 创建检品记录 ───

export interface CreateInspectionInput {
  tenantId: string;
  inboundOrderId: string;
  inboundLineNumber?: number;
  productId?: string;
  sku?: string;
  inspectionMode?: InspectionMode;
  samplingRate?: number;
  expectedQuantity: number;
  inspectedBy: string;
}

/**
 * 検品記録を作成（入庫受付時に呼び出し）
 * 创建检品记录（入库受付时调用）
 */
export async function createInspection(
  input: CreateInspectionInput,
): Promise<IInspectionRecord> {
  const record = await InspectionRecord.create({
    tenantId: input.tenantId,
    recordNumber: generateRecordNumber(),
    inboundOrderId: input.inboundOrderId,
    inboundLineNumber: input.inboundLineNumber,
    productId: input.productId,
    sku: input.sku,
    inspectionMode: input.inspectionMode || 'full',
    samplingRate: input.samplingRate,
    expectedQuantity: input.expectedQuantity,
    inspectedQuantity: 0,
    passedQuantity: 0,
    failedQuantity: 0,
    inspectedBy: input.inspectedBy,
    checks: {
      skuMatch: 'na',
      barcodeMatch: 'na',
      quantityMatch: 'na',
      appearanceOk: 'na',
      accessoriesOk: 'na',
      packagingOk: 'na',
    },
  });

  logger.info(
    { recordNumber: record.recordNumber, inboundOrderId: input.inboundOrderId },
    '検品記録作成 / 检品记录已创建',
  );

  return record;
}

// ─── 6次元チェック結果記録 / 6维度检查结果记录 ───

export interface InspectionCheckInput {
  checks: {
    skuMatch?: CheckResult;
    barcodeMatch?: CheckResult;
    quantityMatch?: CheckResult;
    appearanceOk?: CheckResult;
    accessoriesOk?: CheckResult;
    packagingOk?: CheckResult;
  };
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  exceptions?: IInspectionException[];
  photos?: string[];
  memo?: string;
}

/**
 * 検品結果を記録（6次元チェック + 数量 + 異常）
 * 记录检品结果（6维度检查 + 数量 + 异常）
 */
export async function recordInspectionResult(
  recordId: string,
  input: InspectionCheckInput,
): Promise<IInspectionRecord> {
  const record = await InspectionRecord.findById(recordId);
  if (!record) {
    throw new Error(`検品記録が見つかりません: ${recordId} / 检品记录不存在`);
  }

  // 6次元チェック結果更新 / 更新6维度检查结果
  if (input.checks.skuMatch) record.checks.skuMatch = input.checks.skuMatch;
  if (input.checks.barcodeMatch) record.checks.barcodeMatch = input.checks.barcodeMatch;
  if (input.checks.quantityMatch) record.checks.quantityMatch = input.checks.quantityMatch;
  if (input.checks.appearanceOk) record.checks.appearanceOk = input.checks.appearanceOk;
  if (input.checks.accessoriesOk) record.checks.accessoriesOk = input.checks.accessoriesOk;
  if (input.checks.packagingOk) record.checks.packagingOk = input.checks.packagingOk;

  // 数量更新 / 更新数量
  record.inspectedQuantity = input.inspectedQuantity;
  record.passedQuantity = input.passedQuantity;
  record.failedQuantity = input.failedQuantity;

  // 異常登録 / 登记异常
  if (input.exceptions && input.exceptions.length > 0) {
    record.exceptions.push(...input.exceptions);
  }

  // 写真追加 / 添加照片
  if (input.photos && input.photos.length > 0) {
    record.photos.push(...input.photos);
  }

  if (input.memo) {
    record.memo = input.memo;
  }

  await record.save();

  logger.info(
    { recordNumber: record.recordNumber, passedQuantity: input.passedQuantity, failedQuantity: input.failedQuantity },
    '検品結果記録 / 检品结果已记录',
  );

  return record;
}

// ─── 検品承認 / 检品承认（主管确认） ───

/**
 * 主管が検品結果を承認する
 * 主管确认检品结果
 */
export async function verifyInspection(
  recordId: string,
  verifiedBy: string,
): Promise<IInspectionRecord> {
  const record = await InspectionRecord.findById(recordId);
  if (!record) {
    throw new Error(`検品記録が見つかりません: ${recordId} / 检品记录不存在`);
  }

  // 検品が実施されているか確認 / 确认检品已执行
  if (record.inspectedQuantity === 0) {
    throw new Error('検品がまだ実施されていません / 检品尚未执行');
  }

  record.verifiedBy = verifiedBy;
  record.verifiedAt = new Date();

  await record.save();

  logger.info(
    { recordNumber: record.recordNumber, verifiedBy },
    '検品承認完了 / 检品确认完成',
  );

  return record;
}

// ─── 検品統計 / 检品统计 ───

export interface InspectionStats {
  totalRecords: number;
  totalInspected: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  exceptionCount: number;
  byCategory: Record<string, number>;
}

/**
 * 入庫予定単位の検品統計を取得
 * 获取入库预定级别的检品统计
 */
export async function getInspectionStats(
  inboundOrderId: string,
): Promise<InspectionStats> {
  const records = await InspectionRecord.find({ inboundOrderId }).lean();

  let totalInspected = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let exceptionCount = 0;
  const byCategory: Record<string, number> = {};

  for (const record of records) {
    totalInspected += record.inspectedQuantity;
    totalPassed += record.passedQuantity;
    totalFailed += record.failedQuantity;

    for (const exc of record.exceptions) {
      exceptionCount++;
      byCategory[exc.category] = (byCategory[exc.category] || 0) + 1;
    }
  }

  const passRate = totalInspected > 0 ? totalPassed / totalInspected : 0;

  return {
    totalRecords: records.length,
    totalInspected,
    totalPassed,
    totalFailed,
    passRate,
    exceptionCount,
    byCategory,
  };
}

/**
 * テナント全体の検品パフォーマンス（KPI用）
 * 租户整体检品性能（KPI用）
 *
 * 日本の3PL SOP目標: 入庫検品精度 99.5%以上
 * 日本3PL SOP目标: 入库检品精度 99.5%以上
 */
export async function getInspectionPerformance(
  tenantId: string,
  period?: { from: Date; to: Date },
): Promise<{
  totalRecords: number;
  overallPassRate: number;
  targetMet: boolean;
  topExceptionCategories: Array<{ category: string; count: number }>;
}> {
  const filter: Record<string, unknown> = { tenantId };
  if (period) {
    filter.createdAt = { $gte: period.from, $lte: period.to };
  }

  const agg = await InspectionRecord.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalInspected: { $sum: '$inspectedQuantity' },
        totalPassed: { $sum: '$passedQuantity' },
      },
    },
  ]);

  const data = agg[0] || { totalRecords: 0, totalInspected: 0, totalPassed: 0 };
  const overallPassRate = data.totalInspected > 0 ? data.totalPassed / data.totalInspected : 0;

  // 異常カテゴリ別集計 / 按异常类别汇总
  const exceptionAgg = await InspectionRecord.aggregate([
    { $match: filter },
    { $unwind: '$exceptions' },
    { $group: { _id: '$exceptions.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  const topExceptionCategories = exceptionAgg.map((item) => ({
    category: item._id,
    count: item.count,
  }));

  return {
    totalRecords: data.totalRecords,
    overallPassRate,
    targetMet: overallPassRate >= 0.995, // SOP目標 99.5%
    topExceptionCategories,
  };
}
