import { Router } from 'express';
import { getKpiDashboard } from '@/api/controllers/kpiController';

export const kpiRouter = Router();
kpiRouter.get('/dashboard', getKpiDashboard);
