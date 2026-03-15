import type { Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * 在庫エイジング警告 / 库龄预警
 *
 * StockQuant.lastMovedAt を基に 60/90/180 日の階段警告を生成する。
 * 基于 StockQuant.lastMovedAt 生成 60/90/180 天阶梯预警。
 */

const AGING_THRESHOLDS = [
  { days: 60, level: 'warning', label: '60日以上 / 超60天' },
  { days: 90, level: 'danger', label: '90日以上 / 超90天（超期计费）' },
  { days: 180, level: 'critical', label: '180日以上 / 超180天（需客户指令）' },
];

export const getAgingAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, threshold } = req.query;
    const StockQuant = mongoose.connection.collection('stock_quants');
    const Product = mongoose.connection.collection('products');
    const Location = mongoose.connection.collection('locations');

    const now = Date.now();
    const minDays = parseInt(String(threshold || '60'), 10);
    const cutoff = new Date(now - minDays * 24 * 60 * 60 * 1000);

    const filter: Record<string, unknown> = {
      quantity: { $gt: 0 },
      lastMovedAt: { $lt: cutoff },
    };
    if (clientId) filter.clientId = new mongoose.Types.ObjectId(clientId as string);

    const quants = await StockQuant.find(filter).sort({ lastMovedAt: 1 }).limit(200).toArray();

    const alerts = [];
    for (const q of quants) {
      const ageDays = Math.floor((now - new Date(q.lastMovedAt).getTime()) / (24 * 60 * 60 * 1000));
      const level = ageDays >= 180 ? 'critical' : ageDays >= 90 ? 'danger' : 'warning';

      const prod = await Product.findOne({ _id: q.productId });
      const loc = await Location.findOne({ _id: q.locationId });

      alerts.push({
        productId: q.productId?.toString(),
        sku: prod?.sku || 'unknown',
        productName: prod?.name || '',
        locationId: q.locationId?.toString(),
        locationCode: loc?.code || '',
        quantity: q.quantity,
        lastMovedAt: q.lastMovedAt,
        ageDays,
        level,
        clientId: q.clientId?.toString(),
      });
    }

    // 按层级汇总 / レベル別集計
    const summary = {
      warning: alerts.filter((a) => a.level === 'warning').length,
      danger: alerts.filter((a) => a.level === 'danger').length,
      critical: alerts.filter((a) => a.level === 'critical').length,
      total: alerts.length,
      thresholds: AGING_THRESHOLDS,
    };

    res.json({ summary, alerts });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
