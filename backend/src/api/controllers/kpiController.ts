import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * KPI ダッシュボード / KPI 仪表板
 *
 * SOP 定義の KPI 目標値 vs 実績を計算する。
 * 计算 SOP 定义的 KPI 目标值 vs 实际值。
 */

// SOP 目标值 / SOP 目標値
const KPI_TARGETS = {
  inboundAccuracy: 0.995,    // 入庫精度 >= 99.5%
  labelingAccuracy: 0.998,   // ラベル精度 >= 99.8%
  fbaErrorRate: 0.002,       // FBA 誤配送率 <= 0.2%
  exceptionResponseRate: 1.0, // 異常当日反馈率 100%
  standardShipmentHours: 48, // 標準品出荷: 24-48h
};

export const getKpiDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const period = (req.query.period as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const InboundOrder = mongoose.connection.collection('inbound_orders');
    const InspectionRecord = mongoose.connection.collection('inspection_records');
    const LabelingTask = mongoose.connection.collection('labeling_tasks');
    const ExceptionReport = mongoose.connection.collection('exception_reports');

    // 入库准确率 / 入庫精度
    const inboundOrders = await InboundOrder.find({
      tenantId,
      status: { $in: ['shipped', 'done'] },
      createdAt: { $gte: new Date(`${period}-01`) },
    }).toArray();

    const totalInbound = inboundOrders.length;
    const withVariance = inboundOrders.filter((o: any) => o.varianceReport?.hasVariance).length;
    const inboundAccuracy = totalInbound > 0 ? (totalInbound - withVariance) / totalInbound : 1;

    // 贴标准确率 / ラベル精度
    const labelTasks = await LabelingTask.find({
      tenantId,
      status: 'completed',
      createdAt: { $gte: new Date(`${period}-01`) },
    }).toArray();

    const totalLabeled = labelTasks.reduce((s: number, t: any) => s + (t.requiredQuantity || 0), 0);
    const failedLabeled = labelTasks.reduce((s: number, t: any) => s + (t.failedQuantity || 0), 0);
    const labelingAccuracy = totalLabeled > 0 ? (totalLabeled - failedLabeled) / totalLabeled : 1;

    // 异常响应率 / 異常応答率
    const exceptions = await ExceptionReport.find({
      tenantId,
      createdAt: { $gte: new Date(`${period}-01`) },
    }).toArray();

    const totalExceptions = exceptions.length;
    const slaBreached = exceptions.filter((e: any) => e.slaBreached).length;
    const exceptionResponseRate = totalExceptions > 0 ? (totalExceptions - slaBreached) / totalExceptions : 1;

    // 出货时效 / 出荷リードタイム
    const shippedOrders = inboundOrders.filter((o: any) => o.shippedAt && o.arrivedAt);
    const avgShipmentHours = shippedOrders.length > 0
      ? shippedOrders.reduce((s: number, o: any) => {
          return s + (new Date(o.shippedAt).getTime() - new Date(o.arrivedAt).getTime()) / (1000 * 60 * 60);
        }, 0) / shippedOrders.length
      : 0;

    const kpis = [
      {
        name: '入庫精度 / 入库准确率',
        target: KPI_TARGETS.inboundAccuracy,
        actual: inboundAccuracy,
        unit: '%',
        display: `${(inboundAccuracy * 100).toFixed(1)}%`,
        targetDisplay: `>= ${(KPI_TARGETS.inboundAccuracy * 100).toFixed(1)}%`,
        met: inboundAccuracy >= KPI_TARGETS.inboundAccuracy,
      },
      {
        name: 'ラベル精度 / 贴标准确率',
        target: KPI_TARGETS.labelingAccuracy,
        actual: labelingAccuracy,
        unit: '%',
        display: `${(labelingAccuracy * 100).toFixed(1)}%`,
        targetDisplay: `>= ${(KPI_TARGETS.labelingAccuracy * 100).toFixed(1)}%`,
        met: labelingAccuracy >= KPI_TARGETS.labelingAccuracy,
      },
      {
        name: '異常SLA達成率 / 异常SLA达成率',
        target: KPI_TARGETS.exceptionResponseRate,
        actual: exceptionResponseRate,
        unit: '%',
        display: `${(exceptionResponseRate * 100).toFixed(1)}%`,
        targetDisplay: '100%',
        met: exceptionResponseRate >= KPI_TARGETS.exceptionResponseRate,
      },
      {
        name: '平均出荷リードタイム / 平均出货时效',
        target: KPI_TARGETS.standardShipmentHours,
        actual: avgShipmentHours,
        unit: 'h',
        display: `${avgShipmentHours.toFixed(1)}h`,
        targetDisplay: `<= ${KPI_TARGETS.standardShipmentHours}h`,
        met: avgShipmentHours <= KPI_TARGETS.standardShipmentHours || avgShipmentHours === 0,
      },
    ];

    res.json({
      period,
      targets: KPI_TARGETS,
      kpis,
      summary: {
        totalInbound,
        totalLabeled,
        totalExceptions,
        slaBreached,
        shippedOrders: shippedOrders.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
