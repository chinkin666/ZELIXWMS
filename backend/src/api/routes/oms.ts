/**
 * OMS 连接路由 / OMS 連携ルート
 *
 * 外部注文管理システム（OMS/EC）との連携エンドポイント。
 * 外部订单管理系统（OMS/EC）连接端点。
 */
import { Router } from 'express';
import {
  importOrders,
  getStock,
  getStockBySku,
  shipmentNotify,
} from '@/api/controllers/omsController';

export const omsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: OMS
 *     description: OMS/EC 連携 / OMS/EC Integration
 */

/**
 * @swagger
 * /oms/orders:
 *   post:
 *     tags: [OMS]
 *     summary: 注文取込 / Import orders from external OMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orders]
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [externalOrderId, sku, quantity]
 *                   properties:
 *                     externalOrderId:
 *                       type: string
 *                     sku:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     recipientName:
 *                       type: string
 *                     recipientAddress:
 *                       type: string
 *     responses:
 *       202:
 *         description: 注文受理 / Orders accepted (stub)
 *       400:
 *         description: バリデーションエラー / Validation error
 */
omsRouter.post('/orders', importOrders);

/**
 * @swagger
 * /oms/stock:
 *   get:
 *     tags: [OMS]
 *     summary: 在庫一覧照会 / Query all stock by SKU
 *     responses:
 *       200:
 *         description: SKU 別在庫一覧 / Stock list grouped by SKU
 */
omsRouter.get('/stock', getStock);

/**
 * @swagger
 * /oms/stock/{sku}:
 *   get:
 *     tags: [OMS]
 *     summary: SKU 在庫照会 / Query stock for a specific SKU
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SKU 在庫情報 / Stock info for the SKU
 */
omsRouter.get('/stock/:sku', getStockBySku);

/**
 * @swagger
 * /oms/shipment-notify:
 *   post:
 *     tags: [OMS]
 *     summary: 出荷完了通知 / Receive shipment completion notification
 *     responses:
 *       200:
 *         description: 通知受信完了 / Notification received (stub)
 */
omsRouter.post('/shipment-notify', shipmentNotify);
