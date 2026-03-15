import { Router } from 'express';
import {
  generateMonthlyBilling,
  listBillingRecords,
  getBillingRecord,
  confirmBillingRecord,
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoiceDetail,
  updateInvoiceStatus,
  getBillingDashboard,
} from '@/api/controllers/billingController';

export const billingRouter = Router();

/**
 * @swagger
 * /billing:
 *   get:
 *     tags: [Billing]
 *     summary: 請求明細一覧 / List billing records
 *     responses:
 *       200:
 *         description: 請求明細一覧 / Billing record list
 */
billingRouter.get('/', listBillingRecords);

/**
 * @swagger
 * /billing/dashboard:
 *   get:
 *     tags: [Billing]
 *     summary: 請求ダッシュボード / Billing dashboard
 *     responses:
 *       200:
 *         description: ダッシュボードデータ / Dashboard data
 */
billingRouter.get('/dashboard', getBillingDashboard);

/**
 * @swagger
 * /billing/generate:
 *   post:
 *     tags: [Billing]
 *     summary: 月次請求生成 / Generate monthly billing
 *     responses:
 *       200:
 *         description: 生成成功 / Generated
 */
billingRouter.post('/generate', generateMonthlyBilling);

/**
 * @swagger
 * /billing/invoices:
 *   get:
 *     tags: [Billing]
 *     summary: 請求書一覧 / List invoices
 *     responses:
 *       200:
 *         description: 請求書一覧 / Invoice list
 */
// 請求書 / 发票（/:id より前に定義が必要 / 必须定义在 /:id 之前）
billingRouter.get('/invoices', listInvoices);

/**
 * @swagger
 * /billing/invoices:
 *   post:
 *     tags: [Billing]
 *     summary: 請求書作成 / Create invoice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 作成成功 / Created
 */
billingRouter.post('/invoices', createInvoice);

/**
 * @swagger
 * /billing/invoices/{id}/detail:
 *   get:
 *     tags: [Billing]
 *     summary: 請求書明細取得 / Get invoice detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 請求書明細 / Invoice detail
 */
billingRouter.get('/invoices/:id/detail', getInvoiceDetail);

/**
 * @swagger
 * /billing/invoices/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: 請求書取得 / Get invoice
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 請求書情報 / Invoice info
 */
billingRouter.get('/invoices/:id', getInvoice);

/**
 * @swagger
 * /billing/invoices/{id}/status:
 *   put:
 *     tags: [Billing]
 *     summary: 請求書ステータス更新 / Update invoice status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功 / Updated
 */
billingRouter.put('/invoices/:id/status', updateInvoiceStatus);

/**
 * @swagger
 * /billing/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: 請求明細取得 / Get billing record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 請求明細 / Billing record detail
 */
// 請求明細（個別） / 请求明细（单个）
billingRouter.get('/:id', getBillingRecord);

/**
 * @swagger
 * /billing/{id}/confirm:
 *   post:
 *     tags: [Billing]
 *     summary: 請求明細確定 / Confirm billing record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 確定成功 / Confirmed
 */
billingRouter.post('/:id/confirm', confirmBillingRecord);
