/**
 * 运营仪表盘 Controller / 運営ダッシュボードコントローラー
 *
 * 提供实时运营概览数据。
 * リアルタイムの運営概要データを提供。
 */

import type { Request, Response } from 'express';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { InboundOrder } from '@/models/inboundOrder';
import { ReturnOrder } from '@/models/returnOrder';
import { StockQuant } from '@/models/stockQuant';

/**
 * 获取仪表盘概览数据 / ダッシュボード概要データ取得
 * GET /api/dashboard/overview
 */
export async function getDashboardOverview(_req: Request, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 并行查询所有指标 / すべてのメトリクスを並列クエリ
    const [
      shipmentStats,
      inboundStats,
      returnStats,
      inventoryStats,
      recentShipments,
      overdueOrders,
    ] = await Promise.all([
      // 出荷统计 / 出荷統計
      getShipmentStats(today, tomorrow),
      // 入库统计 / 入庫統計
      getInboundStats(today, tomorrow),
      // 退货统计 / 返品統計
      getReturnStats(),
      // 库存统计 / 在庫統計
      getInventoryStats(),
      // 最近出荷 / 最近の出荷
      ShipmentOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status createdAt _productsMeta shipPlanDate')
        .lean(),
      // 逾期未出荷 / 出荷予定日超過
      ShipmentOrder.countDocuments({
        'status.shipped.isShipped': { $ne: true },
        'status.confirm.isConfirmed': true,
        shipPlanDate: { $lt: formatDate(today) },
      }),
    ]);

    res.json({
      shipments: shipmentStats,
      inbound: inboundStats,
      returns: returnStats,
      inventory: inventoryStats,
      recentShipments,
      overdueOrders,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

async function getShipmentStats(today: Date, tomorrow: Date) {
  const todayStr = formatDate(today);

  const [todayCreated, todayShipped, totalPending, totalHeld, totalConfirmed] = await Promise.all([
    // 今日作成 / 本日作成
    ShipmentOrder.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    }),
    // 今日出荷済 / 本日出荷済
    ShipmentOrder.countDocuments({
      'status.shipped.isShipped': true,
      'status.shipped.shippedAt': { $gte: today, $lt: tomorrow },
    }),
    // 未出荷（確認済み・未出荷）/ 未出荷（確認済み・未出荷）
    ShipmentOrder.countDocuments({
      'status.confirm.isConfirmed': true,
      'status.shipped.isShipped': { $ne: true },
    }),
    // 保留中 / 保留中
    ShipmentOrder.countDocuments({
      'status.held.isHeld': true,
    }),
    // 今日予定 / 本日予定
    ShipmentOrder.countDocuments({
      shipPlanDate: todayStr,
      'status.shipped.isShipped': { $ne: true },
    }),
  ]);

  return { todayCreated, todayShipped, totalPending, totalHeld, todayScheduled: totalConfirmed };
}

async function getInboundStats(today: Date, tomorrow: Date) {
  const [todayReceived, active, pendingPutaway] = await Promise.all([
    InboundOrder.countDocuments({
      status: { $in: ['received', 'done'] },
      updatedAt: { $gte: today, $lt: tomorrow },
    }),
    InboundOrder.countDocuments({
      status: { $in: ['confirmed', 'receiving'] },
    }),
    InboundOrder.countDocuments({
      status: 'received',
    }),
  ]);
  return { todayReceived, active, pendingPutaway };
}

async function getReturnStats() {
  const [inspecting, completed] = await Promise.all([
    ReturnOrder.countDocuments({ status: 'inspecting' }),
    ReturnOrder.countDocuments({ status: 'completed' }),
  ]);
  return { inspecting, completed };
}

async function getInventoryStats() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalSkus: { $addToSet: '$productId' },
        totalQuantity: { $sum: '$quantity' },
        reservedQuantity: { $sum: '$reservedQuantity' },
      },
    },
    {
      $project: {
        totalSkus: { $size: '$totalSkus' },
        totalQuantity: 1,
        reservedQuantity: 1,
        availableQuantity: { $subtract: ['$totalQuantity', '$reservedQuantity'] },
      },
    },
  ];

  const result = await StockQuant.aggregate(pipeline);
  if (result.length === 0) {
    return { totalSkus: 0, totalQuantity: 0, reservedQuantity: 0, availableQuantity: 0 };
  }
  return result[0];
}

/**
 * 获取 7 日出荷趋势 / 7日間出荷トレンド取得
 * GET /api/dashboard/trend
 */
export async function getShipmentTrend(_req: Request, res: Response) {
  try {
    const days = 7;
    const result: Array<{ date: string; created: number; shipped: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [created, shipped] = await Promise.all([
        ShipmentOrder.countDocuments({
          createdAt: { $gte: dayStart, $lt: dayEnd },
        }),
        ShipmentOrder.countDocuments({
          'status.shipped.isShipped': true,
          'status.shipped.shippedAt': { $gte: dayStart, $lt: dayEnd },
        }),
      ]);

      result.push({
        date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        created,
        shipped,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 出荷实绩统计 / 出荷実績統計
 * GET /api/dashboard/shipment-stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getShipmentResultStats(req: Request, res: Response) {
  try {
    const fromStr = (req.query.from as string) || '';
    const toStr = (req.query.to as string) || '';

    // 默认最近 30 天 / デフォルト直近30日
    const to = toStr ? new Date(toStr + 'T23:59:59') : new Date();
    const from = fromStr ? new Date(fromStr + 'T00:00:00') : new Date(to.getTime() - 29 * 86400000);
    from.setHours(0, 0, 0, 0);

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    // 并行查询 / 並列クエリ
    const [totalShipped, totalQuantity, dailyBreakdown, carrierBreakdown, invoiceTypeBreakdown] = await Promise.all([
      // 出荷件数 / 出荷件数
      ShipmentOrder.countDocuments({
        'status.shipped.isShipped': true,
        'status.shipped.shippedAt': { $gte: from, $lte: toEnd },
      }),
      // 出荷个数汇总 / 出荷個数集計
      ShipmentOrder.aggregate([
        {
          $match: {
            'status.shipped.isShipped': true,
            'status.shipped.shippedAt': { $gte: from, $lte: toEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: { $ifNull: ['$_productsMeta.totalQuantity', 0] } },
            totalSkus: { $sum: { $ifNull: ['$_productsMeta.skuCount', 0] } },
          },
        },
      ]),
      // 日别出荷件数 / 日別出荷件数
      ShipmentOrder.aggregate([
        {
          $match: {
            'status.shipped.isShipped': true,
            'status.shipped.shippedAt': { $gte: from, $lte: toEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$status.shipped.shippedAt', timezone: '+09:00' },
            },
            count: { $sum: 1 },
            quantity: { $sum: { $ifNull: ['$_productsMeta.totalQuantity', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // 配送商分布 / 配送業者分布
      ShipmentOrder.aggregate([
        {
          $match: {
            'status.shipped.isShipped': true,
            'status.shipped.shippedAt': { $gte: from, $lte: toEnd },
          },
        },
        {
          $group: {
            _id: '$carrierId',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      // 送り状種類別分布 / 送り状種類別分布
      ShipmentOrder.aggregate([
        {
          $match: {
            'status.shipped.isShipped': true,
            'status.shipped.shippedAt': { $gte: from, $lte: toEnd },
          },
        },
        {
          $group: {
            _id: '$invoiceType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const qtyResult = totalQuantity[0] || { totalQuantity: 0, totalSkus: 0 };

    res.json({
      from: from.toISOString().slice(0, 10),
      to: toEnd.toISOString().slice(0, 10),
      totalShipped,
      totalQuantity: qtyResult.totalQuantity,
      totalSkus: qtyResult.totalSkus,
      daily: dailyBreakdown.map((d: any) => ({
        date: d._id,
        count: d.count,
        quantity: d.quantity,
      })),
      carriers: carrierBreakdown.map((c: any) => ({
        carrierId: c._id || 'unknown',
        count: c.count,
      })),
      invoiceTypes: invoiceTypeBreakdown.map((it: any) => ({
        invoiceType: it._id || 'unknown',
        count: it.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}
