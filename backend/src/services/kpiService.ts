import { ShipmentOrder } from '@/models/shipmentOrder';
import { InboundOrder } from '@/models/inboundOrder';
import { ReturnOrder } from '@/models/returnOrder';
import { WarehouseTask } from '@/models/warehouseTask';
import { WorkCharge } from '@/models/workCharge';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { logger } from '@/lib/logger';

/**
 * KPIサービス / KPI服务
 *
 * 日本3PL倉庫のKPI指標を計算・提供する。
 * 计算并提供日本3PL仓库的KPI指标。
 *
 * 主要KPI（SOP目標）/ 主要KPI（SOP目标）:
 * - 入庫検品精度: 99.5%以上
 * - ラベル貼付精度: 99.8%以上
 * - FBA出荷エラー率: 0.2%以下
 * - 出荷リードタイム: 当日入庫→翌日出荷
 * - 在庫精度: 99.9%以上
 */

export interface KPIDashboard {
  // 出荷 / 出货
  shipment: {
    totalOrders: number;
    shippedOrders: number;
    cancelledOrders: number;
    onTimeRate: number;        // 出荷準時率 / 出货准时率
    avgProcessingHours: number; // 平均処理時間 / 平均处理时间
  };
  // 入庫 / 入库
  inbound: {
    totalOrders: number;
    completedOrders: number;
    avgReceivingHours: number;
  };
  // 返品 / 退货
  returns: {
    totalOrders: number;
    completedOrders: number;
    restockedQuantity: number;
    disposedQuantity: number;
  };
  // タスク / 任务
  tasks: {
    totalTasks: number;
    completedTasks: number;
    avgDurationMinutes: number;
    tasksByType: Record<string, number>;
  };
  // 在庫 / 库存
  inventory: {
    totalSKUs: number;
    totalQuantity: number;
    totalLocations: number;
  };
  // 売上 / 收入
  revenue: {
    totalCharges: number;
    totalAmount: number;
    byChargeType: Record<string, number>;
  };
}

/**
 * 指定期間のKPIダッシュボードデータを取得
 * 获取指定期间的KPI仪表盘数据
 */
export async function getKPIDashboard(
  period: { from: Date; to: Date },
  tenantId?: string,
): Promise<KPIDashboard> {
  const dateFilter = { $gte: period.from, $lte: period.to };
  const baseFilter: Record<string, unknown> = {};
  if (tenantId) baseFilter.tenantId = tenantId;

  // 全クエリ並列実行 / 全部查询并行执行
  const [
    shipmentStats,
    inboundStats,
    returnStats,
    taskStats,
    inventoryStats,
    revenueStats,
  ] = await Promise.all([
    getShipmentStats(dateFilter, baseFilter),
    getInboundStats(dateFilter, baseFilter),
    getReturnStats(dateFilter),
    getTaskStats(dateFilter),
    getInventoryStats(),
    getRevenueStats(dateFilter, baseFilter),
  ]);

  return {
    shipment: shipmentStats,
    inbound: inboundStats,
    returns: returnStats,
    tasks: taskStats,
    inventory: inventoryStats,
    revenue: revenueStats,
  };
}

// ─── 個別統計関数 / 各项统计函数 ───

async function getShipmentStats(
  dateFilter: Record<string, unknown>,
  baseFilter: Record<string, unknown>,
) {
  const filter = { ...baseFilter, createdAt: dateFilter };

  const [total, shipped, cancelled] = await Promise.all([
    ShipmentOrder.countDocuments(filter),
    ShipmentOrder.countDocuments({ ...filter, status: 'shipped' }),
    ShipmentOrder.countDocuments({ ...filter, status: 'cancelled' }),
  ]);

  // 出荷リードタイム（confirmed→shipped の平均時間）
  // 出货准时率 = shipped / (total - cancelled)
  const denominator = total - cancelled;
  const onTimeRate = denominator > 0 ? shipped / denominator : 0;

  return {
    totalOrders: total,
    shippedOrders: shipped,
    cancelledOrders: cancelled,
    onTimeRate,
    avgProcessingHours: 0, // 要: ShipmentOrder にタイムスタンプ追加後
  };
}

async function getInboundStats(
  dateFilter: Record<string, unknown>,
  baseFilter: Record<string, unknown>,
) {
  const filter = { ...baseFilter, createdAt: dateFilter };

  const [total, completed] = await Promise.all([
    InboundOrder.countDocuments(filter),
    InboundOrder.countDocuments({ ...filter, status: { $in: ['done', 'received'] } }),
  ]);

  return {
    totalOrders: total,
    completedOrders: completed,
    avgReceivingHours: 0,
  };
}

async function getReturnStats(dateFilter: Record<string, unknown>) {
  const filter = { createdAt: dateFilter };

  const [total, completed] = await Promise.all([
    ReturnOrder.countDocuments(filter),
    ReturnOrder.countDocuments({ ...filter, status: 'completed' }),
  ]);

  // 完了返品の再入庫/廃棄集計
  const dispositionAgg = await ReturnOrder.aggregate([
    { $match: { ...filter, status: 'completed' } },
    { $unwind: '$lines' },
    {
      $group: {
        _id: null,
        restockedQuantity: { $sum: '$lines.restockedQuantity' },
        disposedQuantity: { $sum: '$lines.disposedQuantity' },
      },
    },
  ]);

  const d = dispositionAgg[0] || { restockedQuantity: 0, disposedQuantity: 0 };

  return {
    totalOrders: total,
    completedOrders: completed,
    restockedQuantity: d.restockedQuantity,
    disposedQuantity: d.disposedQuantity,
  };
}

async function getTaskStats(dateFilter: Record<string, unknown>) {
  const filter = { createdAt: dateFilter };

  const [total, completed, typeAgg, durationAgg] = await Promise.all([
    WarehouseTask.countDocuments(filter),
    WarehouseTask.countDocuments({ ...filter, status: 'completed' }),
    WarehouseTask.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    WarehouseTask.aggregate([
      { $match: { ...filter, status: 'completed', durationMs: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } },
    ]),
  ]);

  const tasksByType: Record<string, number> = {};
  for (const item of typeAgg) {
    tasksByType[item._id] = item.count;
  }

  const avgDurationMs = durationAgg[0]?.avgDuration || 0;

  return {
    totalTasks: total,
    completedTasks: completed,
    avgDurationMinutes: Math.round(avgDurationMs / 60000),
    tasksByType,
  };
}

async function getInventoryStats() {
  const agg = await StockQuant.aggregate([
    { $match: { quantity: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        skus: { $addToSet: '$productSku' },
        locations: { $addToSet: '$locationId' },
      },
    },
  ]);

  const d = agg[0] || { totalQuantity: 0, skus: [], locations: [] };

  return {
    totalSKUs: d.skus.length,
    totalQuantity: d.totalQuantity,
    totalLocations: d.locations.length,
  };
}

async function getRevenueStats(
  dateFilter: Record<string, unknown>,
  baseFilter: Record<string, unknown>,
) {
  const filter = { ...baseFilter, chargeDate: dateFilter };

  const agg = await WorkCharge.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$chargeType',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      },
    },
  ]);

  let totalCharges = 0;
  let totalAmount = 0;
  const byChargeType: Record<string, number> = {};

  for (const item of agg) {
    totalCharges += item.count;
    totalAmount += item.amount;
    byChargeType[item._id] = item.amount;
  }

  return {
    totalCharges,
    totalAmount,
    byChargeType,
  };
}
