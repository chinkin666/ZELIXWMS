/**
 * 顧客ポータルダッシュボード / 客户门户仪表板
 *
 * 顧客が自分のデータを閲覧するための API。
 * 客户查看自己数据的 API。
 */
import type { Request, Response } from 'express';
import { InboundOrder } from '@/models/inboundOrder';
import { WorkCharge } from '@/models/workCharge';
import { Client } from '@/models/client';
import { ExceptionReport } from '@/models/exceptionReport';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * GET /api/portal/dashboard
 * 顧客ダッシュボードデータ / 客户仪表板数据
 */
export async function getPortalDashboard(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const tenantId = getTenantId(req);
    const clientId = user?.clientId || req.query.clientId as string;

    if (!clientId) {
      res.status(400).json({ message: 'clientId が必要です / 需要 clientId' });
      return;
    }

    // 顧客情報 / 客户信息
    const client = await Client.findById(clientId).lean();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 入庫予約統計 / 入库预定统计
    const orderFilter = { tenantId, clientId, flowType: 'passthrough' };
    const [inProgress, pending, recentOrders] = await Promise.all([
      InboundOrder.countDocuments({ ...orderFilter, status: { $in: ['confirmed', 'arrived', 'processing', 'awaiting_label', 'ready_to_ship'] } }),
      InboundOrder.countDocuments({ ...orderFilter, status: 'awaiting_label' }),
      InboundOrder.find(orderFilter).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // 本月費用 / 本月费用
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const charges = await WorkCharge.find({ tenantId, clientId: clientId.toString(), billingPeriod: period }).lean();
    const monthlyFee = charges.reduce((s, c) => s + (c.amount || 0), 0);

    // 未処理異常 / 未处理异常
    const openExceptions = await ExceptionReport.find({
      tenantId,
      clientId,
      status: { $in: ['open', 'notified'] },
    }).sort({ slaDeadline: 1 }).limit(5).lean();

    // 要確認項目 / 需要处理的项目
    const needsAttention: Array<{ type: string; orderId?: string; orderNumber?: string; message: string; date: string }> = [];

    // FBA標未上传 / FBA標未アップロード
    const awaitingLabel = await InboundOrder.find({ ...orderFilter, status: 'awaiting_label' }).lean();
    for (const o of awaitingLabel) {
      needsAttention.push({
        type: 'awaiting_label',
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        message: 'FBA外箱標が未アップロードです / FBA外箱标未上传',
        date: o.createdAt.toISOString(),
      });
    }

    // 差異未確認 / 差异未确认
    const withVariance = await InboundOrder.find({
      ...orderFilter,
      'varianceReport.hasVariance': true,
      'varianceReport.clientViewedAt': null,
    }).lean();
    for (const o of withVariance) {
      needsAttention.push({
        type: 'variance',
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        message: '到着差異があります。確認してください / 到货差异需确认',
        date: o.arrivedAt?.toISOString() || o.createdAt.toISOString(),
      });
    }

    res.json({
      client: {
        name: client?.name || '',
        creditLimit: client?.creditLimit || 0,
        currentBalance: client?.currentBalance || 0,
        creditUsage: client?.creditLimit ? ((client.currentBalance || 0) / client.creditLimit * 100).toFixed(1) : '0',
      },
      stats: {
        inProgress,
        pending,
        monthlyFee,
        creditUsage: client?.creditLimit ? ((client.currentBalance || 0) / client.creditLimit * 100) : 0,
      },
      recentOrders: recentOrders.map(o => ({
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        destinationType: o.destinationType,
        totalBoxCount: o.totalBoxCount,
        expectedDate: o.expectedDate,
        createdAt: o.createdAt,
        estimatedCost: o.serviceOptions?.reduce((s, opt) => s + (opt.actualCost || opt.estimatedCost || 0), 0) || 0,
      })),
      needsAttention,
      openExceptions: openExceptions.map(e => ({
        _id: e._id.toString(),
        reportNumber: e.reportNumber,
        level: e.level,
        category: e.category,
        description: e.description,
        slaDeadline: e.slaDeadline,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
