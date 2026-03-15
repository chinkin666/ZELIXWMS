/**
 * 荷主ポータルコントローラー / 货主门户控制器
 *
 * 荷主（client）ロールのユーザー向けダッシュボードデータを提供する。
 * ログインユーザーの clientId に基づいてデータをフィルタリングする。
 *
 * 为荷主（client）角色用户提供仪表板数据。
 * 根据登录用户的 clientId 过滤数据。
 */

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '@/models/invoice';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import { StockQuant } from '@/models/stockQuant';
import { getTenantId } from '@/api/helpers/tenantHelper';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// GET /api/client-portal/dashboard - 荷主ダッシュボード
// 货主仪表板
// ---------------------------------------------------------------------------
export async function getClientDashboard(req: Request, res: Response) {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res.status(403).json({
        error:
          '荷主IDが設定されていません。管理者にお問い合わせください / 未设置货主ID，请联系管理员',
      });
    }

    const tenantId = getTenantId(req);

    // 荷主名を取得 / 获取货主名
    const clientDoc = await OrderSourceCompany.findById(clientId)
      .select('senderName')
      .lean();
    const clientName =
      (clientDoc as Record<string, unknown> | null)?.senderName as
        | string
        | undefined ?? req.user?.displayName ?? '';

    // orders コレクションを直接使用（ShipmentOrder のコレクション名と実データが異なるため）
    // 直接使用 orders 集合（因为 ShipmentOrder 的集合名与实际数据不同）
    const orderCollection = mongoose.connection.collection('orders');

    // 統計クエリを並列実行 / 并行执行统计查询
    const [orderStats, recentOrdersDocs, invoiceDocs] = await Promise.all([
      // 出荷統計の集計 / 出荷统计汇总
      orderCollection
        .aggregate([
          { $match: { orderSourceCompanyId: clientId } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              shippedOrders: {
                $sum: {
                  $cond: [
                    { $eq: ['$status.shipped.isShipped', true] },
                    1,
                    0,
                  ],
                },
              },
              pendingOrders: {
                $sum: {
                  $cond: [
                    { $ne: ['$status.shipped.isShipped', true] },
                    1,
                    0,
                  ],
                },
              },
              totalShippingCost: {
                $sum: { $ifNull: ['$shippingCost', 0] },
              },
            },
          },
        ])
        .toArray(),

      // 最近の出荷済み注文（最新10件） / 最近已出荷订单（最新10件）
      orderCollection
        .find(
          {
            orderSourceCompanyId: clientId,
            'status.shipped.isShipped': true,
          },
          {
            projection: {
              orderNumber: 1,
              shipPlanDate: 1,
              shippingCost: 1,
              '_productsMeta.totalQuantity': 1,
              '_productsMeta.skuCount': 1,
              'status.shipped.shippedAt': 1,
              carrierId: 1,
              createdAt: 1,
            },
          },
        )
        .sort({ 'status.shipped.shippedAt': -1 })
        .limit(10)
        .toArray(),

      // 請求書（最新10件） / 发票（最新10件）
      Invoice.find({ tenantId, clientId })
        .sort({ issueDate: -1 })
        .limit(10)
        .lean(),
    ]);

    // 集計結果のデフォルト値 / 汇总结果默认值
    const stats = orderStats[0] ?? {
      totalOrders: 0,
      shippedOrders: 0,
      pendingOrders: 0,
      totalShippingCost: 0,
    };

    res.json({
      clientName,
      stats: {
        totalOrders: stats.totalOrders,
        shippedOrders: stats.shippedOrders,
        pendingOrders: stats.pendingOrders,
        totalShippingCost: stats.totalShippingCost,
      },
      recentOrders: recentOrdersDocs,
      invoices: invoiceDocs,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error / 不明なエラー';
    res.status(500).json({ error: message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/client-portal/stock - 荷主在庫照会 / 荷主库存查询
// ---------------------------------------------------------------------------
export async function getClientStock(req: Request, res: Response) {
  try {
    // 荷主の在庫 = 荷主の商品の在庫を集計
    // 荷主库存 = 汇总荷主商品的库存
    // 注意: 現時点では商品はテナント単位で共有されるため、全在庫を返す
    // 注意: 目前商品在租户级别共享，因此返回全部库存
    const stockSummary = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: '$productId',
          quantity: { $sum: '$quantity' },
          reservedQuantity: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productSku: { $ifNull: ['$product.sku', 'unknown'] },
          productName: { $ifNull: ['$product.name', 'unknown'] },
          quantity: 1,
          reservedQuantity: 1,
          availableQuantity: { $subtract: ['$quantity', '$reservedQuantity'] },
        },
      },
      { $sort: { productSku: 1 } },
    ]);

    res.json(stockSummary);
  } catch (err: unknown) {
    logger.error({ err }, 'Client portal stock query failed / 荷主在庫照会失敗');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/client-portal/tracking?q=... - 追跡番号検索 / 追踪号查询
// ---------------------------------------------------------------------------
export async function searchTracking(req: Request, res: Response) {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      return res.json([]);
    }

    const orderCollection = mongoose.connection.collection('orders');

    // 注文番号 or 追跡番号 or 顧客管理番号で検索
    // 按订单号、追踪号或客户管理号搜索
    const results = await orderCollection
      .find(
        {
          $or: [
            { orderNumber: { $regex: query, $options: 'i' } },
            { trackingId: { $regex: query, $options: 'i' } },
            { customerManagementNumber: { $regex: query, $options: 'i' } },
          ],
        },
        {
          projection: {
            orderNumber: 1,
            trackingId: 1,
            carrierId: 1,
            'status.shipped': 1,
            'status.confirm': 1,
            'recipient.name': 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const mapped = results.map((r: any) => {
      let status = '未確認';
      if (r.status?.shipped?.isShipped) status = '出荷済';
      else if (r.status?.confirm?.isConfirmed) status = '確認済';

      return {
        orderNumber: r.orderNumber || '',
        trackingId: r.trackingId || '',
        carrierName: String(r.carrierId || ''),
        status,
        shippedAt: r.status?.shipped?.shippedAt || undefined,
        recipient: r.recipient?.name || '',
      };
    });

    res.json(mapped);
  } catch (err: unknown) {
    logger.error({ err }, 'Tracking search failed / 追跡検索失敗');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
