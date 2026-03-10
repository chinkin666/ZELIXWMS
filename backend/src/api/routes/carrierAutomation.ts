import { Router } from 'express';
import {
  listCarrierAutomationConfigs,
  getCarrierAutomationConfig,
  upsertCarrierAutomationConfig,
  deleteCarrierAutomationConfig,
  testCarrierAutomationConnection,
  yamatoB2Validate,
  yamatoB2Export,
  yamatoB2Print,
  yamatoB2FetchBatchPdf,
  yamatoB2Import,
  yamatoB2History,
  yamatoB2Unconfirm,
  changeInvoiceType,
  splitOrder,
} from '@/api/controllers/carrierAutomationController';

export const carrierAutomationRouter = Router();

// 設定管理
carrierAutomationRouter.get('/configs', listCarrierAutomationConfigs);
carrierAutomationRouter.get('/configs/:type', getCarrierAutomationConfig);
carrierAutomationRouter.put('/configs/:type', upsertCarrierAutomationConfig);
carrierAutomationRouter.delete('/configs/:type', deleteCarrierAutomationConfig);
carrierAutomationRouter.post('/configs/:type/test', testCarrierAutomationConnection);

// Yamato B2 操作
carrierAutomationRouter.post('/yamato-b2/validate', yamatoB2Validate);
carrierAutomationRouter.post('/yamato-b2/export', yamatoB2Export);
carrierAutomationRouter.post('/yamato-b2/print', yamatoB2Print);
carrierAutomationRouter.post('/yamato-b2/pdf/batch', yamatoB2FetchBatchPdf);
carrierAutomationRouter.post('/yamato-b2/import', yamatoB2Import);
carrierAutomationRouter.get('/yamato-b2/history', yamatoB2History);
carrierAutomationRouter.post('/yamato-b2/unconfirm', yamatoB2Unconfirm);

// 共通操作
carrierAutomationRouter.post('/change-invoice-type', changeInvoiceType);
carrierAutomationRouter.post('/split-order', splitOrder);
