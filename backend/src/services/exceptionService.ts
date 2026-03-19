import {
  ExceptionReport,
  IExceptionReport,
  ExceptionLevel,
  ExceptionCategory,
  ExceptionStatus,
  SLA_MINUTES,
} from '@/models/exceptionReport';
import { sendNotificationsForEvent } from '@/services/notificationService';
import { logger } from '@/lib/logger';

/**
 * 異常報告サービス / 异常报告服务
 *
 * 検品・受付・出荷等で発見された異常をSLAベースで管理する。
 * 基于SLA管理检品、受付、出货等环节发现的异常。
 *
 * SLA 時限 / SLA 时限:
 * - C級（緊急）: 30分以内に対応 / C级（紧急）: 30分钟内响应
 * - B級（重要）: 2時間以内に対応 / B级（重要）: 2小时内响应
 * - A級（一般）: 4時間以内に対応 / A级（一般）: 4小时内响应
 */

// ─── 異常番号生成 / 异常编号生成 ───

function generateReportNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `EXC-${y}${m}${d}-${rand}`;
}

// ─── 異常報告作成 / 创建异常报告 ───

export interface CreateExceptionInput {
  tenantId: string;
  referenceType: IExceptionReport['referenceType'];
  referenceId?: string;
  clientId?: string;
  clientName?: string;
  level: ExceptionLevel;
  category: ExceptionCategory;
  boxNumber?: string;
  sku?: string;
  affectedQuantity?: number;
  description: string;
  photos?: string[];
  suggestedAction?: string;
  reportedBy: string;
}

/**
 * 異常報告を作成し、SLA期限を自動設定する
 * 创建异常报告，自动设置SLA期限
 */
export async function createException(
  input: CreateExceptionInput,
): Promise<IExceptionReport> {
  const now = new Date();
  const slaMinutes = SLA_MINUTES[input.level];
  const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

  const report = await ExceptionReport.create({
    tenantId: input.tenantId,
    reportNumber: generateReportNumber(),
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    clientId: input.clientId,
    clientName: input.clientName,
    level: input.level,
    category: input.category,
    boxNumber: input.boxNumber,
    sku: input.sku,
    affectedQuantity: input.affectedQuantity,
    description: input.description,
    photos: input.photos || [],
    suggestedAction: input.suggestedAction,
    status: 'open',
    reportedBy: input.reportedBy,
    reportedAt: now,
    slaDeadline,
    slaBreached: false,
  });

  logger.info(
    { reportNumber: report.reportNumber, level: input.level, slaDeadline },
    '異常報告作成 / 异常报告已创建',
  );

  return report;
}

// ─── SLA超過チェック / SLA超时检查 ───

/**
 * SLA超過の異常報告を検出し、slaBreachedフラグを立てる
 * 检测SLA超时的异常报告，设置slaBreached标志
 *
 * BullMQスケジューラから定期呼び出し（5分おき推奨）
 * 由BullMQ调度器定期调用（建议每5分钟）
 */
export async function checkSlaBreaches(tenantId: string): Promise<{
  breachedCount: number;
  breachedReports: string[];
}> {
  const now = new Date();

  // 未解決 + 未超過 + SLA期限切れ / 未解决 + 未超时 + SLA已到期
  const breached = await ExceptionReport.find({
    tenantId,
    status: { $in: ['open', 'notified'] },
    slaBreached: false,
    slaDeadline: { $lt: now },
  });

  const breachedReports: string[] = [];

  for (const report of breached) {
    report.slaBreached = true;
    await report.save();
    breachedReports.push(report.reportNumber);

    // SLA超過通知（fire-and-forget）/ SLA超时通知
    sendNotificationsForEvent('exception.sla_breached', {
      reportNumber: report.reportNumber,
      level: report.level,
      category: report.category,
      description: report.description,
      slaDeadline: report.slaDeadline,
    }, tenantId).catch(() => {});
  }

  if (breachedReports.length > 0) {
    logger.warn(
      { tenantId, breachedCount: breachedReports.length },
      'SLA超過検出 / 检测到SLA超时',
    );
  }

  return { breachedCount: breachedReports.length, breachedReports };
}

// ─── ステータス更新 / 状态更新 ───

/**
 * 異常報告を解決する / 解决异常报告
 */
export async function resolveException(
  reportId: string,
  resolution: string,
  resolvedBy: string,
): Promise<IExceptionReport> {
  const report = await ExceptionReport.findById(reportId);
  if (!report) {
    throw new Error(`異常報告が見つかりません: ${reportId} / 异常报告不存在`);
  }

  report.status = 'resolved';
  report.resolution = resolution;
  report.resolvedBy = resolvedBy;
  report.resolvedAt = new Date();
  await report.save();

  return report;
}

/**
 * 顧客が異常を確認 / 客户确认异常
 */
export async function acknowledgeException(
  reportId: string,
): Promise<IExceptionReport> {
  const report = await ExceptionReport.findById(reportId);
  if (!report) {
    throw new Error(`異常報告が見つかりません: ${reportId} / 异常报告不存在`);
  }

  report.status = 'acknowledged';
  report.acknowledgedAt = new Date();
  await report.save();

  return report;
}

// ─── 異常統計 / 异常统计 ───

export interface ExceptionDashboard {
  openCount: number;
  breachedCount: number;
  resolvedToday: number;
  byLevel: Record<ExceptionLevel, number>;
  byCategory: Record<string, number>;
  avgResolutionMinutes: number;
}

/**
 * 異常ダッシュボード統計 / 异常仪表盘统计
 */
export async function getExceptionDashboard(
  tenantId: string,
): Promise<ExceptionDashboard> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openCount, breachedCount, resolvedToday, levelAgg, categoryAgg, resolutionAgg] =
    await Promise.all([
      ExceptionReport.countDocuments({ tenantId, status: { $in: ['open', 'notified'] } }),
      ExceptionReport.countDocuments({ tenantId, slaBreached: true, status: { $nin: ['resolved', 'closed'] } }),
      ExceptionReport.countDocuments({ tenantId, status: 'resolved', resolvedAt: { $gte: today } }),
      ExceptionReport.aggregate([
        { $match: { tenantId, status: { $in: ['open', 'notified'] } } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
      ExceptionReport.aggregate([
        { $match: { tenantId, status: { $in: ['open', 'notified'] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      ExceptionReport.aggregate([
        { $match: { tenantId, status: 'resolved', resolvedAt: { $exists: true }, reportedAt: { $exists: true } } },
        {
          $project: {
            durationMs: { $subtract: ['$resolvedAt', '$reportedAt'] },
          },
        },
        { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } },
      ]),
    ]);

  const byLevel: Record<string, number> = { A: 0, B: 0, C: 0 };
  for (const item of levelAgg) {
    byLevel[item._id] = item.count;
  }

  const byCategory: Record<string, number> = {};
  for (const item of categoryAgg) {
    byCategory[item._id] = item.count;
  }

  const avgDurationMs = resolutionAgg[0]?.avgDuration || 0;

  return {
    openCount,
    breachedCount,
    resolvedToday,
    byLevel: byLevel as Record<ExceptionLevel, number>,
    byCategory,
    avgResolutionMinutes: Math.round(avgDurationMs / 60000),
  };
}
