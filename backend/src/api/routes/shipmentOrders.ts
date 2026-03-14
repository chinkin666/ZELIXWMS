import { Router } from 'express';
import { bulkUpdateOrders, createManualOrdersBulk, deleteOrder, deleteOrdersBulk, getOrder, getOrdersByIds, handleStatus, handleStatusBulk, importCarrierReceiptRows, listOrders, updateOrder } from '@/api/controllers/shipmentOrderController';

export const shipmentOrderRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: ShipmentOrders
 *     description: Shipment order management / 出荷オーダー管理
 */

/**
 * @swagger
 * /shipment-orders/manual/bulk:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Create manual orders in bulk / 手動オーダー一括作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Orders created successfully / オーダー作成成功
 *       400:
 *         description: Validation error / バリデーションエラー
 */
shipmentOrderRouter.post('/manual/bulk', createManualOrdersBulk);

/**
 * @swagger
 * /shipment-orders/carrier-receipts/import:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Import carrier receipt rows / 運送会社受領データ取込
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import successful / 取込成功
 */
shipmentOrderRouter.post('/carrier-receipts/import', importCarrierReceiptRows);

/**
 * @swagger
 * /shipment-orders/status/bulk:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Update status for multiple orders / 複数オーダーのステータス一括更新
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated / ステータス更新成功
 */
shipmentOrderRouter.post('/status/bulk', handleStatusBulk);

/**
 * @swagger
 * /shipment-orders/delete/bulk:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Delete multiple orders / 複数オーダー一括削除
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Orders deleted / オーダー削除成功
 */
shipmentOrderRouter.post('/delete/bulk', deleteOrdersBulk);

/**
 * @swagger
 * /shipment-orders/by-ids:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Get orders by IDs / ID指定でオーダー取得
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Orders returned / オーダー返却成功
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
shipmentOrderRouter.post('/by-ids', getOrdersByIds);

/**
 * @swagger
 * /shipment-orders/bulk:
 *   patch:
 *     tags: [ShipmentOrders]
 *     summary: Bulk update orders / オーダー一括更新
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Orders updated / オーダー更新成功
 */
shipmentOrderRouter.patch('/bulk', bulkUpdateOrders);

/**
 * @swagger
 * /shipment-orders/{id}/status:
 *   post:
 *     tags: [ShipmentOrders]
 *     summary: Update order status / オーダーステータス更新
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID / オーダーID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated / ステータス更新成功
 *       404:
 *         description: Order not found / オーダーが見つかりません
 */
shipmentOrderRouter.post('/:id/status', handleStatus);

/**
 * @swagger
 * /shipment-orders:
 *   get:
 *     tags: [ShipmentOrders]
 *     summary: List shipment orders / 出荷オーダー一覧取得
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number / ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page / 1ページあたりの件数
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status / ステータスで絞り込み
 *     responses:
 *       200:
 *         description: Paginated list of orders / ページネーション付きオーダー一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
// 出荷グループ別 注文数集計 / 出荷グループ別注文数集計
shipmentOrderRouter.get('/group-counts', async (_req, res) => {
  try {
    const { ShipmentOrder } = await import('@/models/shipmentOrder');
    const result = await ShipmentOrder.aggregate([
      { $match: { orderGroupId: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$orderGroupId', count: { $sum: 1 } } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

shipmentOrderRouter.get('/', listOrders);

/**
 * @swagger
 * /shipment-orders/{id}:
 *   get:
 *     tags: [ShipmentOrders]
 *     summary: Get a single order / オーダー詳細取得
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID / オーダーID
 *     responses:
 *       200:
 *         description: Order details / オーダー詳細
 *       404:
 *         description: Order not found / オーダーが見つかりません
 *   put:
 *     tags: [ShipmentOrders]
 *     summary: Update an order / オーダー更新
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID / オーダーID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Order updated / オーダー更新成功
 *       404:
 *         description: Order not found / オーダーが見つかりません
 *   delete:
 *     tags: [ShipmentOrders]
 *     summary: Delete an order / オーダー削除
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID / オーダーID
 *     responses:
 *       200:
 *         description: Order deleted / オーダー削除成功
 *       404:
 *         description: Order not found / オーダーが見つかりません
 */
shipmentOrderRouter.get('/:id', getOrder);
shipmentOrderRouter.put('/:id', updateOrder);
shipmentOrderRouter.delete('/:id', deleteOrder);
