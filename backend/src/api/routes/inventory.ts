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
  getLocationUsage,
  rebuildInventory,
  releaseExpiredReservations,
  getReceiptPaymentLedger,
} from '@/api/controllers/inventoryController';
import { requirePermission } from '@/api/middleware/requirePermission';

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
inventoryRouter.get('/location-usage', getLocationUsage);

/**
 * @swagger
 * /inventory/ledger-summary:
 *   get:
 *     tags: [Inventory]
 *     summary: 受払一覧（在庫受払台帳サマリー） / Receipt/payment ledger summary
 *     description: |
 *       指定期間の商品別入出庫・調整・繰越残高を集計して返す。
 *       Aggregates inbound/outbound/adjustment quantities and opening/closing balances per product for a given date range.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 期間開始日 / Period start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 期間終了日 / Period end date (YYYY-MM-DD)
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: 商品IDで絞り込み / Filter by product ID
 *     responses:
 *       200:
 *         description: 受払一覧データ / Ledger summary data
 *       400:
 *         description: パラメータ不正 / Invalid parameters
 */
inventoryRouter.get('/ledger-summary', getReceiptPaymentLedger);

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
inventoryRouter.post('/adjust', requirePermission('inventory:adjust'), adjustStock);

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
inventoryRouter.post('/reserve-orders', requirePermission('inventory:reserve'), reserveOrdersStock);

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
inventoryRouter.post('/transfer', requirePermission('inventory:transfer'), transferStock);

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
inventoryRouter.post('/bulk-adjust', requirePermission('inventory:adjust'), bulkAdjustStock);

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
inventoryRouter.post('/cleanup-zero', requirePermission('inventory:admin'), cleanupZeroStock);

/**
 * @swagger
 * /inventory/rebuild:
 *   post:
 *     tags: [Inventory]
 *     summary: Rebuild inventory from StockMove records / 在庫リビルド（整合性チェック）
 *     description: |
 *       StockMove の完了済みレコードから在庫を再計算し、StockQuant との差異を報告する。
 *       デフォルトはレポートのみ（安全）。?fix=true で差異を修正する。
 *       Recalculates stock from done StockMove records. Report-only by default. Use ?fix=true to correct.
 *     parameters:
 *       - in: query
 *         name: fix
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Set to 'true' to actually fix discrepancies / 'true'で差異を修正
 *     responses:
 *       200:
 *         description: Rebuild result with discrepancies / リビルド結果（差異一覧）
 */
inventoryRouter.post('/rebuild', requirePermission('inventory:admin'), rebuildInventory);

/**
 * @swagger
 * /inventory/release-expired-reservations:
 *   post:
 *     tags: [Inventory]
 *     summary: Release expired stock reservations / 期限切れ引当の解放
 *     description: |
 *       指定分数以上 confirmed のまま放置された引当を自動解放する。
 *       Releases reservations in 'confirmed' state older than timeoutMinutes.
 *       BullMQ 定期ジョブ（30分間隔）で自動実行済み。手動実行も可能。
 *     parameters:
 *       - in: query
 *         name: timeoutMinutes
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Timeout in minutes / タイムアウト（分）
 *     responses:
 *       200:
 *         description: Released reservations count / 解放された引当数
 */
inventoryRouter.post('/release-expired-reservations', requirePermission('inventory:admin'), releaseExpiredReservations);
