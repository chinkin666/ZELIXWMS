import { Router } from 'express';
import {
  generateMonthlyBilling,
  listBillingRecords,
  getBillingRecord,
  confirmBillingRecord,
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
  getBillingDashboard,
} from '@/api/controllers/billingController';

export const billingRouter = Router();

// 請求明細 / 请求明细
billingRouter.get('/', listBillingRecords);
billingRouter.get('/dashboard', getBillingDashboard);
billingRouter.post('/generate', generateMonthlyBilling);

// 請求書 / 发票（/:id より前に定義が必要 / 必须定义在 /:id 之前）
billingRouter.get('/invoices', listInvoices);
billingRouter.post('/invoices', createInvoice);
billingRouter.get('/invoices/:id', getInvoice);
billingRouter.put('/invoices/:id/status', updateInvoiceStatus);

// 請求明細（個別） / 请求明细（单个）
billingRouter.get('/:id', getBillingRecord);
billingRouter.post('/:id/confirm', confirmBillingRecord);
