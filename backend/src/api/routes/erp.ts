/**
 * ERP エクスポートルート / ERP 导出路由
 *
 * 会計・ERP 向けデータエクスポートのエンドポイント定義。
 * 面向会计/ERP 系统的数据导出端点定义。
 */
import { Router } from 'express';
import {
  exportShipments,
  exportInvoices,
  exportInventory,
} from '@/api/controllers/erpController';

export const erpRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: ERP
 *     description: ERP/会計連携 / ERP/Accounting Integration
 */

/**
 * @swagger
 * /erp/export/shipments:
 *   get:
 *     tags: [ERP]
 *     summary: 出荷データエクスポート / Export shipment data
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 開始日 / Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 終了日 / End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 出荷データ / Shipment data in flat format
 *       400:
 *         description: パラメータ不正 / Invalid parameters
 */
erpRouter.get('/export/shipments', exportShipments);

/**
 * @swagger
 * /erp/export/invoices:
 *   get:
 *     tags: [ERP]
 *     summary: 請求書データエクスポート / Export invoice data (stub)
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 請求書データ / Invoice data (stub)
 */
erpRouter.get('/export/invoices', exportInvoices);

/**
 * @swagger
 * /erp/export/inventory:
 *   get:
 *     tags: [ERP]
 *     summary: 在庫データエクスポート / Export current inventory data
 *     responses:
 *       200:
 *         description: 在庫データ / Inventory data in flat format
 */
erpRouter.get('/export/inventory', exportInventory);
