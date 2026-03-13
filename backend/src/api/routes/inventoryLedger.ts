import { Router } from 'express';
import {
  getLedgerEntries,
  createLedgerEntry,
  getStockLevel,
  getStockLevels,
  getReservations,
  createReservation,
  releaseReservation,
  fulfillReservation,
} from '@/api/controllers/inventoryLedgerController';

export const inventoryLedgerRouter = Router();

inventoryLedgerRouter.get('/ledger', getLedgerEntries);
inventoryLedgerRouter.post('/ledger', createLedgerEntry);
inventoryLedgerRouter.get('/stock', getStockLevel);
inventoryLedgerRouter.get('/stock/summary', getStockLevels);
inventoryLedgerRouter.get('/reservations', getReservations);
inventoryLedgerRouter.post('/reservations', createReservation);
inventoryLedgerRouter.put('/reservations/:id/release', releaseReservation);
inventoryLedgerRouter.put('/reservations/:id/fulfill', fulfillReservation);
