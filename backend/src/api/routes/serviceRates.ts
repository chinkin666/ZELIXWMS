import { Router } from 'express';
import {
  listServiceRates,
  getServiceRate,
  createServiceRate,
  updateServiceRate,
  deleteServiceRate,
} from '@/api/controllers/serviceRateController';

export const serviceRateRouter = Router();

// CRUD
serviceRateRouter.get('/', listServiceRates);
serviceRateRouter.get('/:id', getServiceRate);
serviceRateRouter.post('/', createServiceRate);
serviceRateRouter.put('/:id', updateServiceRate);
serviceRateRouter.delete('/:id', deleteServiceRate);
