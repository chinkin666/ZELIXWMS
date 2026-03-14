import { Router } from 'express';
import {
  listStock,
  listStockSummary,
  getProductStock,
  adjustStock,
  listMovements,
  listLowStockAlerts,
  reserveOrdersStock,
  transferStock,
  bulkAdjustStock,
  cleanupZeroStock,
  getInventoryOverview,
} from '@/api/controllers/inventoryController';

export const inventoryRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Inventory and stock management / 在庫管理
 */

/**
 * @swagger
 * /inventory/stock:
 *   get:
 *     tags: [Inventory]
 *     summary: List stock entries / 在庫一覧取得
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
 *     responses:
 *       200:
 *         description: Paginated stock list / ページネーション付き在庫一覧
 */
inventoryRouter.get('/overview', getInventoryOverview);
inventoryRouter.get('/stock', listStock);

/**
 * @swagger
 * /inventory/stock/summary:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock summary / 在庫サマリー取得
 *     responses:
 *       200:
 *         description: Stock summary data / 在庫サマリーデータ
 */
inventoryRouter.get('/stock/summary', listStockSummary);

/**
 * @swagger
 * /inventory/stock/{productId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock for a specific product / 商品別在庫取得
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID / 商品ID
 *     responses:
 *       200:
 *         description: Product stock details / 商品在庫詳細
 *       404:
 *         description: Product not found / 商品が見つかりません
 */
inventoryRouter.get('/stock/:productId', getProductStock);

/**
 * @swagger
 * /inventory/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Adjust stock for a product / 在庫数量調整
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 description: Adjustment quantity (positive or negative) / 調整数量（正負）
 *               reason:
 *                 type: string
 *                 description: Reason for adjustment / 調整理由
 *     responses:
 *       200:
 *         description: Stock adjusted / 在庫調整成功
 *       400:
 *         description: Validation error / バリデーションエラー
 */
inventoryRouter.post('/adjust', adjustStock);

/**
 * @swagger
 * /inventory/movements:
 *   get:
 *     tags: [Inventory]
 *     summary: List stock movements / 在庫移動履歴取得
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
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID / 商品IDで絞り込み
 *     responses:
 *       200:
 *         description: Paginated movement list / ページネーション付き移動履歴
 */
inventoryRouter.get('/movements', listMovements);

/**
 * @swagger
 * /inventory/alerts/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: List low stock alerts / 在庫不足アラート一覧
 *     responses:
 *       200:
 *         description: Low stock alerts / 在庫不足アラート
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   productId:
 *                     type: string
 *                   currentStock:
 *                     type: integer
 *                   threshold:
 *                     type: integer
 */
inventoryRouter.get('/alerts/low-stock', listLowStockAlerts);

/**
 * @swagger
 * /inventory/reserve-orders:
 *   post:
 *     tags: [Inventory]
 *     summary: Reserve stock for orders / オーダー用在庫引当
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Stock reserved / 在庫引当成功
 */
inventoryRouter.post('/reserve-orders', reserveOrdersStock);

/**
 * @swagger
 * /inventory/transfer:
 *   post:
 *     tags: [Inventory]
 *     summary: Transfer stock between locations / ロケーション間在庫移動
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - fromLocation
 *               - toLocation
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Transfer successful / 移動成功
 */
inventoryRouter.post('/transfer', transferStock);

/**
 * @swagger
 * /inventory/bulk-adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Bulk adjust stock / 在庫一括調整
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adjustments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     reason:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk adjustment successful / 一括調整成功
 */
inventoryRouter.post('/bulk-adjust', bulkAdjustStock);

/**
 * @swagger
 * /inventory/cleanup-zero:
 *   post:
 *     tags: [Inventory]
 *     summary: Clean up zero-stock entries / ゼロ在庫エントリ削除
 *     responses:
 *       200:
 *         description: Cleanup completed / クリーンアップ完了
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: integer
 */
inventoryRouter.post('/cleanup-zero', cleanupZeroStock);
