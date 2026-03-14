/**
 * 仪表盘路由 / ダッシュボードルート
 */

import { Router } from 'express';
import { getDashboardOverview, getShipmentTrend, getShipmentResultStats } from '@/api/controllers/dashboardController';

export const dashboardRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Dashboard overview data / ダッシュボード概要データ
 */

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard overview / ダッシュボード概要取得
 *     description: >
 *       Returns aggregated overview data including order counts by status,
 *       inventory summaries, and recent activity.
 *       ステータス別オーダー数、在庫サマリー、最近のアクティビティなどの概要データを返します。
 *     responses:
 *       200:
 *         description: Dashboard overview data / ダッシュボード概要データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ordersByStatus:
 *                   type: object
 *                   description: Order counts grouped by status / ステータス別オーダー数
 *                 totalProducts:
 *                   type: integer
 *                   description: Total number of products / 商品総数
 *                 lowStockCount:
 *                   type: integer
 *                   description: Number of low-stock items / 在庫不足商品数
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Recent orders / 最近のオーダー
 */
// 概览数据 / 概要データ
dashboardRouter.get('/overview', getDashboardOverview);

// 7日間出荷トレンド / 7日出荷趋势
dashboardRouter.get('/trend', getShipmentTrend);

// 出荷实绩统计 / 出荷実績統計
dashboardRouter.get('/shipment-stats', getShipmentResultStats);
