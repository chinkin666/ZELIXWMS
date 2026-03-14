/**
 * 佐川急便路由 / 佐川急便ルート
 */

import { Router } from 'express';
import {
  exportSagawaCsv,
  importSagawaTracking,
  getSagawaInvoiceTypes,
} from '@/api/controllers/sagawaController';

export const sagawaRouter = Router();

sagawaRouter.get('/invoice-types', getSagawaInvoiceTypes);
sagawaRouter.post('/export', exportSagawaCsv);
sagawaRouter.post('/import-tracking', importSagawaTracking);
