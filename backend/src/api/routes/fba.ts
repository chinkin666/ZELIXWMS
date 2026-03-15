import { Router } from 'express';
import {
  listFbaPlans,
  createFbaPlan,
  getFbaPlan,
  updateFbaPlan,
  confirmFbaPlan,
  shipFbaPlan,
  deleteFbaPlan,
} from '@/api/controllers/fbaController';

export const fbaRouter = Router();

// FBAプラン CRUD / FBA计划 CRUD
fbaRouter.get('/plans', listFbaPlans);
fbaRouter.post('/plans', createFbaPlan);
fbaRouter.get('/plans/:id', getFbaPlan);
fbaRouter.put('/plans/:id', updateFbaPlan);
fbaRouter.post('/plans/:id/confirm', confirmFbaPlan);
fbaRouter.post('/plans/:id/ship', shipFbaPlan);
fbaRouter.delete('/plans/:id', deleteFbaPlan);
