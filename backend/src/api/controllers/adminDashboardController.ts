/**
 * プラットフォーム管理ダッシュボード / 平台管理仪表板
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getTenantId } from '@/api/helpers/tenantHelper';

export async function getAdminDashboard(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = getTenantId(req);
    const db = mongoose.connection.db!;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [
      clientCount,
      activeClientCount,
      warehouseCount,
      activeOrders,
      shippedThisMonth,
      monthlyCharges,
      recentClients,
      ordersByStatus,
    ] = await Promise.all([
      db.collection('clients').countDocuments({ tenantId }),
      db.collection('clients').countDocuments({ tenantId, isActive: true }),
      db.collection('warehouses').countDocuments({ isActive: true }),
      db.collection('inbound_orders').countDocuments({
        tenantId, flowType: 'passthrough',
        status: { $in: ['confirmed', 'arrived', 'processing', 'awaiting_label', 'ready_to_ship'] },
      }),
      db.collection('inbound_orders').countDocuments({
        tenantId, flowType: 'passthrough', status: 'shipped',
        shippedAt: { $gte: monthStart },
      }),
      db.collection('work_charges').aggregate([
        { $match: { tenantId, billingPeriod: period } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection('clients').find({ tenantId, isActive: true })
        .sort({ createdAt: -1 }).limit(5).toArray(),
      db.collection('inbound_orders').aggregate([
        { $match: { tenantId, flowType: 'passthrough' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const monthlyRevenue = monthlyCharges[0]?.total || 0;
    const chargeCount = monthlyCharges[0]?.count || 0;

    // 按客户营收排名 / 顧客別売上ランキング
    const revenueByClient = await db.collection('work_charges').aggregate([
      { $match: { tenantId, billingPeriod: period } },
      { $group: { _id: '$clientId', clientName: { $first: '$clientName' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray();

    res.json({
      stats: {
        clientCount,
        activeClientCount,
        warehouseCount,
        activeOrders,
        shippedThisMonth,
        monthlyRevenue,
        chargeCount,
      },
      recentClients: recentClients.map(c => ({
        _id: c._id.toString(),
        clientCode: c.clientCode,
        name: c.name,
        clientType: c.clientType,
        creditTier: c.creditTier,
        portalEnabled: c.portalEnabled,
      })),
      ordersByStatus: ordersByStatus.reduce((acc: any, s: any) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      revenueByClient: revenueByClient.map(r => ({
        clientId: r._id,
        clientName: r.clientName || 'unknown',
        total: r.total,
        count: r.count,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
