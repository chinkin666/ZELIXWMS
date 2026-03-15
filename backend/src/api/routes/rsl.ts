import { Router } from 'express';
import {
  listRslPlans,
  createRslPlan,
  getRslPlan,
  updateRslPlan,
  confirmRslPlan,
  shipRslPlan,
  deleteRslPlan,
} from '@/api/controllers/rslController';

export const rslRouter = Router();

// RSLプラン CRUD / RSL计划 CRUD
rslRouter.get('/plans', listRslPlans);
rslRouter.post('/plans', createRslPlan);
rslRouter.get('/plans/:id', getRslPlan);
rslRouter.put('/plans/:id', updateRslPlan);
rslRouter.post('/plans/:id/confirm', confirmRslPlan);
rslRouter.post('/plans/:id/ship', shipRslPlan);
rslRouter.delete('/plans/:id', deleteRslPlan);
