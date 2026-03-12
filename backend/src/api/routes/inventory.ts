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
} from '@/api/controllers/inventoryController';

export const inventoryRouter = Router();

inventoryRouter.get('/stock', listStock);
inventoryRouter.get('/stock/summary', listStockSummary);
inventoryRouter.get('/stock/:productId', getProductStock);
inventoryRouter.post('/adjust', adjustStock);
inventoryRouter.get('/movements', listMovements);
inventoryRouter.get('/alerts/low-stock', listLowStockAlerts);
inventoryRouter.post('/reserve-orders', reserveOrdersStock);
inventoryRouter.post('/transfer', transferStock);
inventoryRouter.post('/bulk-adjust', bulkAdjustStock);
inventoryRouter.post('/cleanup-zero', cleanupZeroStock);
