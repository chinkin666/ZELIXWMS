import type { Request, Response } from 'express';
import { DailyReport } from '@/models/dailyReport';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { InboundOrder } from '@/models/inboundOrder';
import { ReturnOrder } from '@/models/returnOrder';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { StocktakingOrder } from '@/models/stocktakingOrder';

// ---------------------------------------------------------------------------
// 日付範囲ヘルパー
// ---------------------------------------------------------------------------
function dayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

// ---------------------------------------------------------------------------
// GET /api/daily-reports
// ---------------------------------------------------------------------------
export async function listDailyReports(req: Request, res: Response) {
  try {
    const { status, from, to, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as any).$gte = from;
      if (to) (filter.date as any).$lte = to;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      DailyReport.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DailyReport.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/daily-reports/:date
// ---------------------------------------------------------------------------
export async function getDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const doc = await DailyReport.findOne({ date }).lean();
    if (!doc) return res.status(404).json({ error: `${date}の日次レポートが見つかりません` });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/daily-reports/generate - 日次レポート生成/更新
// ---------------------------------------------------------------------------
export async function generateDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日付(YYYY-MM-DD)が必要です' });
    }

    // 既存チェック（locked は上書き不可）
    const existing = await DailyReport.findOne({ date });
    if (existing?.status === 'locked') {
      return res.status(400).json({ error: 'ロック済みのレポートは更新できません' });
    }

    const { start, end } = dayRange(date);
    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    // 出荷集計
    const shipmentOrders = await ShipmentOrder.find(dateFilter).lean();
    const shippedOrders = shipmentOrders.filter((o: any) => o.status?.shipped?.isShipped);
    const totalShipmentItems = shipmentOrders.reduce(
      (sum, o: any) => sum + (o._productsMeta?.totalQuantity || 0),
      0,
    );
    const shippedItems = shippedOrders.reduce(
      (sum, o: any) => sum + (o._productsMeta?.totalQuantity || 0),
      0,
    );

    // 入庫集計
    const inboundOrders = await InboundOrder.find(dateFilter).lean();
    const receivedOrders = inboundOrders.filter((o) => o.status === 'done');
    const totalInboundItems = inboundOrders.reduce(
      (sum, o) => sum + o.lines.reduce((s, l) => s + l.expectedQuantity, 0),
      0,
    );
    const receivedItems = receivedOrders.reduce(
      (sum, o) => sum + o.lines.reduce((s, l) => s + l.receivedQuantity, 0),
      0,
    );

    // 返品集計
    const returnOrders = await ReturnOrder.find(dateFilter).lean();
    const completedReturns = returnOrders.filter((o) => o.status === 'completed');
    const restockedItems = completedReturns.reduce(
      (sum, o) => sum + o.lines.reduce((s, l) => s + l.restockedQuantity, 0),
      0,
    );
    const disposedItems = completedReturns.reduce(
      (sum, o) => sum + o.lines.reduce((s, l) => s + l.disposedQuantity, 0),
      0,
    );

    // 在庫スナップショット
    const quantAgg = await StockQuant.aggregate([
      {
        $group: {
          _id: null,
          totalSkus: { $addToSet: '$productId' },
          totalQuantity: { $sum: '$quantity' },
          reservedQuantity: { $sum: '$reservedQuantity' },
        },
      },
    ]);
    const quantSummary = quantAgg[0] || { totalSkus: [], totalQuantity: 0, reservedQuantity: 0 };

    // 調整件数
    const adjustmentCount = await StockMove.countDocuments({
      moveType: { $in: ['adjustment', 'stocktaking'] },
      state: 'done',
      executedAt: { $gte: start, $lte: end },
    });

    // 棚卸集計
    const stocktakingOrders = await StocktakingOrder.find(dateFilter).lean();
    const varianceCount = stocktakingOrders.reduce(
      (sum, o) => sum + o.lines.filter((l) => l.variance && l.variance !== 0).length,
      0,
    );

    const summary = {
      shipments: {
        totalOrders: shipmentOrders.length,
        shippedOrders: shippedOrders.length,
        totalItems: totalShipmentItems,
        shippedItems,
      },
      inbound: {
        totalOrders: inboundOrders.length,
        receivedOrders: receivedOrders.length,
        totalItems: totalInboundItems,
        receivedItems,
      },
      returns: {
        totalOrders: returnOrders.length,
        completedOrders: completedReturns.length,
        restockedItems,
        disposedItems,
      },
      inventory: {
        totalSkus: Array.isArray(quantSummary.totalSkus) ? quantSummary.totalSkus.length : 0,
        totalQuantity: quantSummary.totalQuantity,
        reservedQuantity: quantSummary.reservedQuantity,
        adjustmentCount,
      },
      stocktaking: {
        totalSessions: stocktakingOrders.length,
        varianceCount,
      },
    };

    if (existing) {
      existing.summary = summary as any;
      existing.status = existing.status === 'closed' ? 'closed' : 'open';
      await existing.save();
      return res.json(existing.toObject());
    }

    const doc = await DailyReport.create({
      date,
      status: 'open',
      summary,
    });

    res.status(201).json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/daily-reports/:date/close - 日次締め
// ---------------------------------------------------------------------------
export async function closeDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const doc = await DailyReport.findOne({ date });
    if (!doc) return res.status(404).json({ error: `${date}の日次レポートが見つかりません` });
    if (doc.status === 'locked') {
      return res.status(400).json({ error: 'ロック済みのレポートです' });
    }

    doc.status = 'closed';
    doc.closedAt = new Date();
    doc.closedBy = req.body.closedBy || 'system';
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/daily-reports/:date/lock - 日次ロック
// ---------------------------------------------------------------------------
export async function lockDailyReport(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const doc = await DailyReport.findOne({ date });
    if (!doc) return res.status(404).json({ error: `${date}の日次レポートが見つかりません` });
    if (doc.status !== 'closed') {
      return res.status(400).json({ error: '締め済みのレポートのみロックできます' });
    }

    doc.status = 'locked';
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
