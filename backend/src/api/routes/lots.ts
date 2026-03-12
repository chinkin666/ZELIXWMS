import { Router } from 'express';
import {
  listLots,
  getLot,
  createLot,
  updateLot,
  deleteLot,
  listExpiryAlerts,
  updateExpiredLots,
} from '@/api/controllers/lotController';

export const lotRouter = Router();

lotRouter.get('/expiry-alerts', listExpiryAlerts);
lotRouter.post('/update-expired', updateExpiredLots);
lotRouter.get('/', listLots);
lotRouter.get('/:id', getLot);
lotRouter.post('/', createLot);
lotRouter.put('/:id', updateLot);
lotRouter.delete('/:id', deleteLot);
