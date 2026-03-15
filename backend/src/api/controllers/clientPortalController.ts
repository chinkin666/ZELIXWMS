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
import { getTenantId } from '@/api/helpers/tenantHelper';

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
